import { describe, it, expect, vi, afterEach } from 'vitest'
import { normalizeCacheKey, fetchOrg, fetchRepos, fetchContributors, cacheGet, cacheSet, cacheClear } from './github'

/** Minimal in-memory stand-in for the IndexedDB API surface used by github.js. */
function installFakeIndexedDB() {
  const tables = new Map()
  const db = {
    createObjectStore() {},
    close: vi.fn(),
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
  return { db, tables }
}

/** Counting fetch stub. Handler maps a URL to { status, body }. */
function installFetchStub(handler) {
  const calls = []
  vi.stubGlobal('fetch', async url => {
    const key = String(url)
    calls.push(key)
    const { status = 200, body = null } = handler(key)
    return {
      status,
      ok: status >= 200 && status < 300,
      headers: { get: () => '5000' },
      json: async () => {
        // Faithful to real fetch: an empty body has no JSON to parse.
        if (body === null) throw new SyntaxError('Unexpected end of JSON input')
        return JSON.parse(JSON.stringify(body))
      },
    }
  })
  return calls
}

/** Counting fetch stub returning canned JSON for every request. */
function installCountingFetch(data) {
  return installFetchStub(() => ({ status: 200, body: data }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('normalizeCacheKey', () => {
  it('maps org URLs that differ only in case to the same key', () => {
    expect(normalizeCacheKey('https://api.github.com/orgs/AOSSIE-Org')).toBe(
      normalizeCacheKey('https://api.github.com/orgs/aossie-org')
    )
  })

  it('maps repos/contributors URLs that differ only in case to the same key', () => {
    expect(
      normalizeCacheKey('https://api.github.com/orgs/AOSSIE-Org/repos?per_page=100&page=1&sort=updated')
    ).toBe(
      normalizeCacheKey('https://api.github.com/orgs/aossie-org/repos?per_page=100&page=1&sort=updated')
    )
    expect(
      normalizeCacheKey('https://api.github.com/repos/AOSSIE-Org/Repo-A/contributors?per_page=100&page=1')
    ).toBe(
      normalizeCacheKey('https://api.github.com/repos/aossie-org/repo-a/contributors?per_page=100&page=1')
    )
  })

  it('trims trailing slashes', () => {
    expect(normalizeCacheKey('https://api.github.com/orgs/AOSSIE-Org/')).toBe(
      normalizeCacheKey('https://api.github.com/orgs/aossie-org')
    )
  })

  it('sorts query parameters deterministically', () => {
    expect(
      normalizeCacheKey('https://api.github.com/orgs/aossie-org/repos?page=1&per_page=100')
    ).toBe(
      normalizeCacheKey('https://api.github.com/orgs/aossie-org/repos?per_page=100&page=1')
    )
  })

  it('preserves query value casing', () => {
    expect(
      normalizeCacheKey('https://api.github.com/search/issues?q=author%3AAlice&per_page=100')
    ).not.toBe(
      normalizeCacheKey('https://api.github.com/search/issues?q=author%3Aalice&per_page=100')
    )
  })

  it('returns non-URL input unchanged', () => {
    expect(normalizeCacheKey('not a url')).toBe('not a url')
  })
})

describe('case-insensitive caching', () => {
  it('re-searching an org with different case costs zero extra fetches', async () => {
    installFakeIndexedDB()
    const calls = installCountingFetch({ login: 'AOSSIE-Org', public_repos: 1 })

    const first = await fetchOrg('AOSSIE-Org', 'pat')
    expect(calls).toHaveLength(1)

    const second = await fetchOrg('aossie-org', 'pat')
    expect(calls).toHaveLength(1)
    expect(second).toEqual(first)
  })

  it('repeating the identical search costs zero extra fetches', async () => {
    installFakeIndexedDB()
    const calls = installCountingFetch({ login: 'AOSSIE-Org', public_repos: 1 })

    await fetchOrg('AOSSIE-Org', 'pat')
    await fetchOrg('AOSSIE-Org', 'pat')
    expect(calls).toHaveLength(1)
  })

  it('repo page URLs share cache entries across case variants', async () => {
    installFakeIndexedDB()
    const calls = installCountingFetch([{ name: 'repo-a' }])

    await fetchRepos('AOSSIE-Org', 1, 'pat')
    expect(calls).toHaveLength(1)

    await fetchRepos('aossie-org', 1, 'pat')
    expect(calls).toHaveLength(1)
  })
})

describe('empty-repository responses', () => {
  for (const status of [204, 409]) {
    it(`caches contributors ${status} (empty repo) so repeats cost nothing`, async () => {
      installFakeIndexedDB()
      const calls = installFetchStub(() => ({ status, body: null }))

      const first = await fetchContributors('AOSSIE-Org', 'empty-repo', 'pat')
      expect(first).toEqual([])
      expect(calls).toHaveLength(1)

      // Previously this threw inside res.json() on every call, was never
      // cached, and burned one token per re-search.
      const second = await fetchContributors('AOSSIE-Org', 'empty-repo', 'pat')
      expect(second).toEqual([])
      expect(calls).toHaveLength(1)
    })
  }

  it('still throws RATE_LIMIT (403) and NOT_FOUND (404)', async () => {
    installFakeIndexedDB()
    installFetchStub(url =>
      url.includes('/orgs/missing-org')
        ? { status: 404, body: null }
        : { status: 403, body: null }
    )

    await expect(fetchOrg('missing-org', 'pat')).rejects.toThrow('NOT_FOUND')
    await expect(fetchContributors('AOSSIE-Org', 'repo-a', 'pat')).rejects.toThrow('RATE_LIMIT')
  })

  it('throws RATE_LIMIT on HTTP 429', async () => {
    installFakeIndexedDB()
    vi.stubGlobal('fetch', async () => ({
      status: 429,
      ok: false,
      headers: { get: () => null },
      json: async () => ({ message: 'Too Many Requests' })
    }))

    await expect(fetchOrg('test-org', 'pat')).rejects.toThrow('RATE_LIMIT')
  })

  it('throws RATE_LIMIT on HTTP 403 with remaining 0 or secondary rate limit message', async () => {
    installFakeIndexedDB()
    vi.stubGlobal('fetch', async () => ({
      status: 403,
      ok: false,
      headers: {
        get: (h) => (h === 'x-ratelimit-remaining' ? '0' : null)
      },
      json: async () => ({ message: 'API rate limit exceeded' })
    }))

    await expect(fetchOrg('test-org', 'pat')).rejects.toThrow('RATE_LIMIT')
  })

  it('throws HTTP_403 on HTTP 403 when not rate-limited (e.g. authorization error)', async () => {
    installFakeIndexedDB()
    vi.stubGlobal('fetch', async () => ({
      status: 403,
      ok: false,
      headers: {
        get: (h) => (h === 'x-ratelimit-remaining' ? '4999' : null)
      },
      json: async () => ({ message: 'Resource not accessible by integration' })
    }))

    await expect(fetchOrg('test-org', 'pat')).rejects.toThrow('HTTP_403')
  })
})

describe('IndexedDB connection lifecycle and resource cleanup', () => {
  it('closes database connection after cacheGet', async () => {
    const { db } = installFakeIndexedDB()
    await cacheGet('https://api.github.com/orgs/AOSSIE-Org')
    expect(db.close).toHaveBeenCalledTimes(1)
  })

  it('closes database connection after cacheSet', async () => {
    const { db } = installFakeIndexedDB()
    await cacheSet('https://api.github.com/orgs/AOSSIE-Org', { login: 'AOSSIE-Org' })
    expect(db.close).toHaveBeenCalledTimes(1)
  })

  it('closes database connection after cacheClear', async () => {
    const { db } = installFakeIndexedDB()
    await cacheClear()
    expect(db.close).toHaveBeenCalledTimes(1)
  })

  it('closes database connection on transaction error', async () => {
    const closeSpy = vi.fn()
    vi.stubGlobal('indexedDB', {
      open() {
        const req = {}
        const db = {
          close: closeSpy,
          transaction() {
            const tx = {
              oncomplete: null,
              onerror: null,
              onabort: null,
              objectStore() {
                return {
                  get() {
                    const getReq = {}
                    queueMicrotask(() => {
                      if (tx.onerror) tx.onerror({ target: { error: new Error('Tx failed') } })
                    })
                    return getReq
                  }
                }
              }
            }
            return tx
          }
        }
        queueMicrotask(() => {
          if (req.onsuccess) req.onsuccess({ target: { result: db } })
        })
        return req
      }
    })

    const result = await cacheGet('https://api.github.com/orgs/AOSSIE-Org')
    expect(result).toBeNull()
    expect(closeSpy).toHaveBeenCalledTimes(1)
  })
})
