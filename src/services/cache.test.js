import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  ANALYSIS_CACHE_VERSION,
  CACHE_TTL_MS,
  clearAnalysis,
  loadAnalysis,
  saveAnalysis,
} from './cache'

const KEY = 'latest'

/** Minimal in-memory stand-in for the IndexedDB API surface used by cache.js. */
function installFakeIndexedDB(initialRecords = {}) {
  const tables = new Map([['analysis', new Map(Object.entries(initialRecords))]])

  const db = {
    objectStoreNames: {
      contains: name => tables.has(name),
    },
    createObjectStore(name) {
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
              const req = {}
              queueMicrotask(() => {
                req.result = table.has(key) ? structuredClone(table.get(key)) : undefined
                req.onsuccess?.()
                queueMicrotask(() => tx.oncomplete?.())
              })
              return req
            },
            put(value, key) {
              const req = {}
              queueMicrotask(() => {
                table.set(key, structuredClone(value))
                req.onsuccess?.()
                queueMicrotask(() => tx.oncomplete?.())
              })
              return req
            },
            delete(key) {
              const req = {}
              queueMicrotask(() => {
                table.delete(key)
                req.onsuccess?.()
                queueMicrotask(() => tx.oncomplete?.())
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
    open() {
      const req = { result: db }
      queueMicrotask(() => {
        req.onupgradeneeded?.({ target: { result: db } })
        req.onsuccess?.({ target: { result: db } })
      })
      return req
    },
  })

  return { records: tables.get('analysis') }
}

function makeRecord(overrides = {}) {
  return {
    model: { contributors: [] },
    savedAt: Date.now(),
    version: ANALYSIS_CACHE_VERSION,
    ...overrides,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('analysis cache versioning', () => {
  it('saves and restores the current cache version', async () => {
    const { records } = installFakeIndexedDB()

    await saveAnalysis({ model: { contributors: [] } })

    expect(records.get(KEY)?.version).toBe(ANALYSIS_CACHE_VERSION)
    expect(records.get(KEY)?.savedAt).toEqual(expect.any(Number))

    const record = await loadAnalysis()
    expect(record?.model).toEqual({ contributors: [] })
    expect(record?.version).toBe(ANALYSIS_CACHE_VERSION)
  })

  it('rejects and clears legacy models saved before bot filtering', async () => {
    const { records } = installFakeIndexedDB({
      [KEY]: {
        model: { contributors: [{ login: 'dependabot[bot]', type: 'Bot' }] },
        savedAt: Date.now(),
      },
    })

    await expect(loadAnalysis()).resolves.toBeNull()
    expect(records.has(KEY)).toBe(false)
  })

  it('rejects and clears models from an older cache version', async () => {
    const { records } = installFakeIndexedDB({
      [KEY]: makeRecord({ version: ANALYSIS_CACHE_VERSION - 1 }),
    })

    await expect(loadAnalysis()).resolves.toBeNull()
    expect(records.has(KEY)).toBe(false)
  })

  it('still rejects and clears expired current-version models', async () => {
    const { records } = installFakeIndexedDB({
      [KEY]: makeRecord({ savedAt: Date.now() - CACHE_TTL_MS - 1 }),
    })

    await expect(loadAnalysis()).resolves.toBeNull()
    expect(records.has(KEY)).toBe(false)
  })

  it('leaves a missing cache entry untouched', async () => {
    const { records } = installFakeIndexedDB()

    await expect(loadAnalysis()).resolves.toBeNull()
    await expect(clearAnalysis()).resolves.toBe(true)
    expect(records.has(KEY)).toBe(false)
  })
})
