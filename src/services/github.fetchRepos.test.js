import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchRepos } from './github'

/** Minimal in-memory stand-in for the IndexedDB API surface used by github.js. */
function installFakeIndexedDB() {
  const tables = new Map()
  const db = {
    createObjectStore() {},
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
            get(k) {
              const req = { result: table.has(k) ? table.get(k) : undefined }
              queueMicrotask(() => req.onsuccess && req.onsuccess())
              return req
            },
            put(record) {
              table.set(record.k, record)
              const req = {}
              queueMicrotask(() => req.onsuccess && req.onsuccess())
              return req
            },
            clear() {
              table.clear()
              const req = {}
              queueMicrotask(() => req.onsuccess && req.onsuccess())
              return req
            },
          }
        },
      }
      queueMicrotask(() => tx.oncomplete && tx.oncomplete())
      return tx
    },
  }
  vi.stubGlobal('indexedDB', {
    open() {
      const req = {}
      queueMicrotask(() => {
        if (req.onupgradeneeded) req.onupgradeneeded({ target: { result: db } })
        if (req.onsuccess) req.onsuccess({ target: { result: db } })
      })
      return req
    },
  })
}

/**
 * Fetch stub that pages through `pageBodies` (1-indexed) and records every
 * requested URL. Pages beyond the end of `pageBodies` return an empty array,
 * matching GitHub's behavior past the last real page.
 *
 * Matches `[?&]page=` rather than `page=` so it does not accidentally match
 * the `per_page=100` query param that appears earlier in the same URL.
 */
function installPagedFetch(pageBodies) {
  const calls = []
  vi.stubGlobal('fetch', async url => {
    const key = String(url)
    calls.push(key)
    const pageMatch = key.match(/[?&]page=(\d+)/)
    const page = pageMatch ? Number(pageMatch[1]) : 1
    const body = pageBodies[page - 1] ?? []
    return {
      status: 200,
      ok: true,
      headers: { get: () => '5000' },
      json: async () => JSON.parse(JSON.stringify(body)),
    }
  })
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchRepos pagination with a PAT', () => {
  it('fetches every page instead of stopping at a public_repos-derived limit', async () => {
    installFakeIndexedDB()
    const page1 = Array.from({ length: 100 }, (_, i) => ({ id: i }))
    const page2 = Array.from({ length: 50 }, (_, i) => ({ id: 100 + i }))
    installPagedFetch([page1, page2])

    // public_repos = 50, but the token can see 150 repos (public + private).
    const result = await fetchRepos('some-org', 50, 'pat-token')

    expect(result.length).toBe(150)
  })

  it('stops on the first short page without requesting another one', async () => {
    installFakeIndexedDB()
    const page1 = Array.from({ length: 50 }, (_, i) => ({ id: i }))
    const calls = installPagedFetch([page1])

    const result = await fetchRepos('some-org', 50, 'pat-token')

    expect(result.length).toBe(50)
    expect(calls).toHaveLength(1)
  })

  it('stops at the safety cap when every page happens to be full', async () => {
    installFakeIndexedDB()
    const fullPages = Array.from({ length: 60 }, () =>
      Array.from({ length: 100 }, (_, i) => ({ id: i }))
    )
    const calls = installPagedFetch(fullPages)

    const result = await fetchRepos('some-org', 50, 'pat-token')

    // MAX_PAT_REPO_PAGES = 50 pages * 100 per page.
    expect(result.length).toBe(5000)
    expect(calls).toHaveLength(50)
  })
})

describe('fetchRepos pagination without a PAT', () => {
  it('is unchanged: still capped at 5 pages', async () => {
    installFakeIndexedDB()
    const fullPages = Array.from({ length: 10 }, () =>
      Array.from({ length: 100 }, (_, i) => ({ id: i }))
    )
    const calls = installPagedFetch(fullPages)

    const result = await fetchRepos('some-org', 50, null)

    expect(result.length).toBe(500)
    expect(calls).toHaveLength(5)
  })
})
