import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function createFakeIndexedDB() {
  const databases = new Map()

  function createDatabase() {
    const stores = new Map()

    return {
      objectStoreNames: {
        contains: name => stores.has(name),
      },
      createObjectStore(name) {
        stores.set(name, new Map())
        return {}
      },
      transaction(name) {
        const store = stores.get(name)
        const tx = {
          oncomplete: null,
          onerror: null,
          onabort: null,
          error: null,
          objectStore: () => objectStore,
        }

        const objectStore = {
          get(key) {
            const req = { result: undefined, onsuccess: null, onerror: null }
            queueMicrotask(() => {
              req.result = store.get(key)
              req.onsuccess?.()
            })
            return req
          },
          put(value, key) {
            const req = { onsuccess: null, onerror: null }
            queueMicrotask(() => {
              store.set(key, value)
              tx.oncomplete?.()
            })
            return req
          },
          delete(key) {
            const req = { onsuccess: null, onerror: null }
            queueMicrotask(() => {
              store.delete(key)
              tx.oncomplete?.()
            })
            return req
          },
        }

        return tx
      },
      close() {},
    }
  }

  return {
    open(name, version) {
      const req = {
        result: null,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        onblocked: null,
      }

      queueMicrotask(() => {
        let db = databases.get(name)

        if (!db || (db.version || 0) < version) {
          db = createDatabase()
          db.version = version
          databases.set(name, db)
          req.result = db
          req.onupgradeneeded?.()
        } else {
          req.result = db
        }

        req.onsuccess?.()
      })

      return req
    },
  }
}

let patStorage

beforeEach(async () => {
  vi.resetModules()
  localStorage.clear()
  vi.stubGlobal('indexedDB', createFakeIndexedDB())
  patStorage = await import('./patStorage')
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('patStorage', () => {
  it('stores ciphertext and decrypts the original token', async () => {
    await expect(patStorage.writeStoredPat('ghp_test_secret_token')).resolves.toEqual({ persisted: true })

    const raw = localStorage.getItem('oe_pat')
    expect(raw).toMatch(/^enc:v1:/)
    expect(raw).not.toContain('ghp_test_secret_token')

    await expect(patStorage.readStoredPat()).resolves.toEqual({
      token: 'ghp_test_secret_token',
      persisted: true,
    })
  })

  it('migrates a legacy plaintext token to ciphertext', async () => {
    localStorage.setItem('oe_pat', 'ghp_legacy_token')

    await expect(patStorage.readStoredPat()).resolves.toEqual({
      token: 'ghp_legacy_token',
      persisted: true,
    })

    const raw = localStorage.getItem('oe_pat')
    expect(raw).toMatch(/^enc:v1:/)
    expect(raw).not.toContain('ghp_legacy_token')
  })

  it('removes both the ciphertext and the key when clearing', async () => {
    await patStorage.writeStoredPat('ghp_to_delete')
    await patStorage.clearStoredPat()

    expect(localStorage.getItem('oe_pat')).toBeNull()
    await expect(patStorage.readStoredPat()).resolves.toEqual({ token: '', persisted: false })
  })

  it('discards corrupt or undecryptable ciphertext', async () => {
    localStorage.setItem('oe_pat', 'enc:v1:not-valid:data')

    await expect(patStorage.readStoredPat()).resolves.toEqual({ token: '', persisted: false })
    expect(localStorage.getItem('oe_pat')).toBeNull()
  })

  it('reports a token as session-only when IndexedDB is unavailable', async () => {
    vi.resetModules()
    vi.stubGlobal('indexedDB', undefined)
    const sessionStorage = await import('./patStorage')

    await expect(sessionStorage.writeStoredPat('ghp_session_only')).resolves.toEqual({ persisted: false })
    expect(localStorage.getItem('oe_pat')).toBeNull()
    await expect(sessionStorage.readStoredPat()).resolves.toEqual({ token: '', persisted: false })
  })

  it('reports whether a stored value is encrypted', () => {
    expect(patStorage.isEncryptedPat('enc:v1:abc:def')).toBe(true)
    expect(patStorage.isEncryptedPat('ghp_plaintext')).toBe(false)
    expect(patStorage.isEncryptedPat(null)).toBe(false)
  })
})
