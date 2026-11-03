/**
 * Encrypted storage for the GitHub Personal Access Token (PAT).
 *
 * The token used to live in localStorage as plaintext under `oe_pat`, where
 * anybody with access to the browser profile or the DevTools Application tab
 * could read it. A token has to stay recoverable (hashing is not an option —
 * it is replayed to api.github.com), so we encrypt it at rest instead:
 *
 * - AES-GCM 256-bit ciphertext, fresh 12-byte IV on every save.
 * - The CryptoKey is generated as non-extractable and kept in IndexedDB, so
 *   the raw key cannot be exported by application code or copied out of
 *   localStorage.
 * - The ciphertext keeps the `oe_pat` key for backwards compatibility. Legacy
 *   plaintext values are encrypted and replaced on first load.
 *
 * Important limitation: the key lives in the same browser profile as the
 * ciphertext. This hides the token from casual localStorage inspection, but
 * it is not a defence against malicious code running on this origin (XSS) or
 * someone with full control of the profile — they can ask the browser to
 * decrypt it too. Never treat this as a substitute for a narrowly scoped,
 * expiring token.
 */

const DB_NAME = 'orgexplorer_secure'
const DB_VERSION = 1
const STORE = 'keys'
const KEY_ID = 'pat'

export const PAT_STORAGE_KEY = 'oe_pat'

const ENVELOPE_PREFIX = 'v1'

function getWebCrypto() {
  if (typeof crypto === 'undefined') return null
  if (!crypto.subtle || typeof crypto.getRandomValues !== 'function') return null
  return crypto
}

function bytesToBase64(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToBytes(value) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('IndexedDB blocked'))
  })
}

function withStore(mode, run) {
  return openDb().then(db =>
    new Promise((resolve, reject) => {
      let result
      const tx = db.transaction(STORE, mode)
      const req = run(tx.objectStore(STORE))

      if (req) req.onsuccess = () => { result = req.result }
      tx.oncomplete = () => { db.close(); resolve(result) }
      tx.onerror = () => { db.close(); reject(tx.error) }
      tx.onabort = () => { db.close(); reject(tx.error) }
    })
  )
}

async function readKey() {
  return withStore('readonly', store => store.get(KEY_ID))
}

async function getOrCreateKey() {
  const existing = await readKey()
  if (existing) return existing

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  await withStore('readwrite', store => store.put(key, KEY_ID))
  return key
}

/**
 * Encrypt and persist a token.
 *
 * Returns `{ persisted: true }` on success. When WebCrypto or IndexedDB is
 * unavailable (insecure context, private window, storage disabled) it returns
 * `{ persisted: false, reason }` and writes nothing — callers should keep the
 * token in memory for the current session.
 */
export async function savePat(token) {
  if (!token) return { persisted: false, reason: 'empty' }

  const webCrypto = getWebCrypto()
  if (!webCrypto) return { persisted: false, reason: 'unavailable' }

  try {
    const key = await getOrCreateKey()
    const iv = webCrypto.getRandomValues(new Uint8Array(12))
    const plaintext = new TextEncoder().encode(token)
    const ciphertext = await webCrypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      plaintext
    )

    const envelope = [
      ENVELOPE_PREFIX,
      bytesToBase64(iv),
      bytesToBase64(new Uint8Array(ciphertext))
    ].join(':')

    localStorage.setItem(PAT_STORAGE_KEY, envelope)
    return { persisted: true }
  } catch {
    // Do not leave a stale token behind if we could not store the new one:
    // the in-memory token is the only copy for this session.
    try { localStorage.removeItem(PAT_STORAGE_KEY) } catch { /* ignore */ }
    return { persisted: false, reason: 'unavailable' }
  }
}

/**
 * Restore a token.
 *
 * `status` is one of:
 * - `ok`          — token restored (or legacy plaintext migrated successfully)
 * - `empty`       — nothing stored
 * - `corrupt`     — ciphertext/key unreadable; storage was wiped, re-entry needed
 * - `unavailable` — crypto or IndexedDB unavailable; nothing was persisted
 *
 * Never returns the stored ciphertext and never logs the token.
 */
export async function loadPat() {
  let stored

  try {
    stored = localStorage.getItem(PAT_STORAGE_KEY)
  } catch {
    return { token: '', status: 'unavailable' }
  }

  if (!stored) return { token: '', status: 'empty' }

  // Legacy plaintext from before encrypted storage was introduced. Migrate it
  // in place; if encryption is impossible, drop the plaintext and keep the
  // token for this session only.
  if (!stored.startsWith(`${ENVELOPE_PREFIX}:`)) {
    const result = await savePat(stored)

    if (result.persisted) return { token: stored, status: 'ok' }

    try { localStorage.removeItem(PAT_STORAGE_KEY) } catch { /* ignore */ }
    return { token: stored, status: 'unavailable' }
  }

  const webCrypto = getWebCrypto()
  if (!webCrypto) return { token: '', status: 'unavailable' }

  const parts = stored.split(':')
  if (parts.length !== 3 || !parts[1] || !parts[2]) {
    await clearPat()
    return { token: '', status: 'corrupt' }
  }

  let key
  try {
    key = await readKey()
  } catch {
    // Storage infrastructure failed (blocked/unavailable). Keep the
    // ciphertext so a later visit can still decrypt it.
    return { token: '', status: 'unavailable' }
  }

  if (!key) {
    await clearPat()
    return { token: '', status: 'corrupt' }
  }

  try {
    const plaintext = await webCrypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(parts[1]), tagLength: 128 },
      key,
      base64ToBytes(parts[2])
    )
    return { token: new TextDecoder().decode(plaintext), status: 'ok' }
  } catch {
    await clearPat()
    return { token: '', status: 'corrupt' }
  }
}

/** Remove both the ciphertext and the encryption key. Never throws. */
export async function clearPat() {
  try { localStorage.removeItem(PAT_STORAGE_KEY) } catch { /* ignore */ }

  try {
    await withStore('readwrite', store => store.delete(KEY_ID))
  } catch {
    // Best effort — an orphaned key alone cannot reveal the token.
  }
}
