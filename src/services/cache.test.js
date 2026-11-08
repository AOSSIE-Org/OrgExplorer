import { describe, it, expect, vi, afterEach } from 'vitest'
import { saveAnalysis, loadAnalysis, clearAnalysis } from './cache'

function installFakeIndexedDB() {
  const tables = new Map()
  const stores = new Set()
  let version = 0

  const db = {
    objectStoreNames: {
      contains: name => stores.has(name),
    },
    createObjectStore(name) {
      stores.add(name)
      if (!tables.has(name)) tables.set(name, new Map())
    },
    close() {},
    transaction(storeName) {
      let table = tables.get(storeName)
      if (!table) {
        table = new Map()
        tables.set(storeName, table)
      }

      const tx = {
        oncomplete: null,
        onerror: null,
        onabort: null,
        objectStore() {
          return {
            get(key) {
              const req = { result: table.get(key), onsuccess: null, onerror: null }
              queueMicrotask(() => {
                req.onsuccess?.()
                tx.oncomplete?.()
              })
              return req
            },
            put(value, key) {
              table.set(key, value)
              const req = { onsuccess: null, onerror: null }
              queueMicrotask(() => {
                req.onsuccess?.()
                tx.oncomplete?.()
              })
              return req
            },
            delete(key) {
              table.delete(key)
              const req = { onsuccess: null, onerror: null }
              queueMicrotask(() => {
                req.onsuccess?.()
                tx.oncomplete?.()
              })
              return req
            },
            clear() {
              table.clear()
              const req = { onsuccess: null, onerror: null }
              queueMicrotask(() => {
                req.onsuccess?.()
                tx.oncomplete?.()
              })
              return req
            },
          }
        },
      }

      return tx
    },
  }

  vi.stubGlobal('indexedDB', {
    open(name, requestedVersion = 1) {
      const req = { result: null, onupgradeneeded: null, onsuccess: null, onerror: null }

      queueMicrotask(() => {
        if (requestedVersion > version) {
          version = requestedVersion
          req.result = db
          req.transaction = {
            objectStore(storeName) {
              return {
                clear() {
                  tables.get(storeName)?.clear()
                },
              }
            },
          }
          req.onupgradeneeded?.()
        }

        req.result = db
        req.onsuccess?.()
      })

      return req
    },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('analysis cache auth scoping', () => {
  it('keeps analyses for different auth contexts separate', async () => {
    installFakeIndexedDB()

    await saveAnalysis({ model: { id: 'anonymous' } }, '')
    await saveAnalysis({ model: { id: 'token-a' } }, 'ghp_token_a')
    await saveAnalysis({ model: { id: 'token-b' } }, 'ghp_token_b')

    expect((await loadAnalysis('')).model).toEqual({ id: 'anonymous' })
    expect((await loadAnalysis('ghp_token_a')).model).toEqual({ id: 'token-a' })
    expect((await loadAnalysis('ghp_token_b')).model).toEqual({ id: 'token-b' })
    expect(await loadAnalysis('ghp_unknown')).toBeNull()
  })

  it('clears analyses for every auth context', async () => {
    installFakeIndexedDB()

    await saveAnalysis({ model: { id: 'anonymous' } }, '')
    await saveAnalysis({ model: { id: 'token-a' } }, 'ghp_token_a')

    expect(await clearAnalysis()).toBe(true)
    expect(await loadAnalysis('')).toBeNull()
    expect(await loadAnalysis('ghp_token_a')).toBeNull()
  })
})
