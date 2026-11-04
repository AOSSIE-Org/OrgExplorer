// Encrypted PAT storage: AES-GCM ciphertext in localStorage, non-extractable key in IndexedDB.

const PAT_STORAGE_KEY = 'oe_pat'
const ENCRYPTED_PREFIX = 'enc:v1:'
const DB_NAME = 'orgexplorer_secrets'
const DB_VERSION = 1
const KEY_STORE = 'keys'
const KEY_ID = 'pat-key'

let cachedKeyPromise = null
let keyIsPersistent = false
let operationQueue = Promise.resolve()

// Serialize storage operations so save/delete cannot race.
function enqueue(operation) {
  const result = operationQueue.then(operation, operation)
  operationQueue = result.catch(() => {})
  return result
}

// Read WebCrypto from the current global.
function getCrypto() {
  return typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
}

// Open the IndexedDB database that stores the key.
function openKeyDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(KEY_STORE)) {
        db.createObjectStore(KEY_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'))
    req.onblocked = () => reject(new Error('IndexedDB blocked'))
  })
}

// Read the persisted CryptoKey.
async function getStoredKey() {
  const db = await openKeyDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(KEY_STORE, 'readonly')
      const req = tx.objectStore(KEY_STORE).get(KEY_ID)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

// Persist a CryptoKey in IndexedDB.
async function putStoredKey(key) {
  const db = await openKeyDb()
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(KEY_STORE, 'readwrite')
      tx.objectStore(KEY_STORE).put(key, KEY_ID)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

// Delete the persisted CryptoKey.
async function deleteStoredKey() {
  const db = await openKeyDb()
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(KEY_STORE, 'readwrite')
      tx.objectStore(KEY_STORE).delete(KEY_ID)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

// Load the key, or generate a non-extractable one.
async function getKey() {
  if (cachedKeyPromise) return cachedKeyPromise

  cachedKeyPromise = (async () => {
    const crypto = getCrypto()
    if (!crypto?.subtle) return null

    try {
      const existing = await getStoredKey()
      if (existing) {
        keyIsPersistent = true
        return existing
      }
    } catch {
      keyIsPersistent = false
    }

    try {
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      )

      try {
        await putStoredKey(key)
        keyIsPersistent = true
      } catch {
        // IndexedDB unavailable: keep the key in memory only.
        keyIsPersistent = false
      }

      return key
    } catch {
      return null
    }
  })()

  return cachedKeyPromise
}

// Encode bytes for storage.
function bytesToBase64(bytes) {
  let binary = ''
  const chunkSize = 0x8000

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }

  return btoa(binary)
}

// Decode stored bytes.
function base64ToBytes(value) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

// Encrypt a token with AES-GCM and a random IV.
async function encryptToken(token, key) {
  const crypto = getCrypto()
  if (!crypto?.subtle || !key) return null

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(token)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const body = new Uint8Array(cipher)

  return `${ENCRYPTED_PREFIX}${bytesToBase64(iv)}:${bytesToBase64(body)}`
}

// Decrypt a stored token.
async function decryptToken(value, key) {
  const crypto = getCrypto()
  if (!crypto?.subtle || !key) return null

  const payload = value.slice(ENCRYPTED_PREFIX.length)
  const separator = payload.indexOf(':')
  if (separator < 0) return null

  const iv = base64ToBytes(payload.slice(0, separator))
  const cipher = base64ToBytes(payload.slice(separator + 1))
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)

  return new TextDecoder().decode(plain)
}

// Read the token entry from localStorage.
function readRawPat() {
  try {
    return localStorage.getItem(PAT_STORAGE_KEY)
  } catch {
    return null
  }
}

// Write the token entry and report success.
function writeRawPat(value) {
  try {
    localStorage.setItem(PAT_STORAGE_KEY, value)
    return true
  } catch {
    // Best effort. The token remains available in React state for this page.
    return false
  }
}

// Remove the token entry.
function removeRawPat() {
  try {
    localStorage.removeItem(PAT_STORAGE_KEY)
  } catch {
    // Best effort.
  }
}

// Check whether a value uses the encrypted format.
export function isEncryptedPat(value) {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX)
}

// Read a legacy plaintext token synchronously.
export function readLegacyPatSync() {
  const raw = readRawPat()
  return raw && !isEncryptedPat(raw) ? raw : ''
}

// Read, decrypt, and migrate the stored token.
export function readStoredPat() {
  return enqueue(async () => {
    const raw = readRawPat()
    if (!raw) return ''

    if (isEncryptedPat(raw)) {
      try {
        const key = await getKey()
        const token = await decryptToken(raw, key)
        if (token == null) throw new Error('Unable to decrypt PAT')
        return token
      } catch {
        // Missing key, corrupt ciphertext or storage cleared in another tab.
        removeRawPat()
        return ''
      }
    }

    // Migrate an existing plaintext token to ciphertext.
    const key = await getKey()
    let encrypted = null

    try {
      encrypted = await encryptToken(raw, key)
    } catch {
      encrypted = null
    }

    if (encrypted && keyIsPersistent && writeRawPat(encrypted)) {
      return raw
    }

    // Never leave plaintext behind if encryption or storage failed.
    removeRawPat()
    return raw
  })
}

// Encrypt and persist a token, or clear it.
export function writeStoredPat(token) {
  return enqueue(async () => {
    if (!token) {
      removeRawPat()
      cachedKeyPromise = null
      keyIsPersistent = false

      try {
        await deleteStoredKey()
      } catch {
        // Best effort.
      }
      return
    }

    const key = await getKey()
    let encrypted = null

    try {
      encrypted = await encryptToken(token, key)
    } catch {
      encrypted = null
    }

    if (!(encrypted && keyIsPersistent && writeRawPat(encrypted))) {
      removeRawPat()
    }
  })
}

// Clear the stored token and key.
export function clearStoredPat() {
  return writeStoredPat('')
}
