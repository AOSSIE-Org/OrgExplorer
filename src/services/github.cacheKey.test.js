import { describe, it, expect, vi, afterEach } from 'vitest'
import { normalizeCacheKey, fetchOrg, fetchRepos, fetchContributors, fetchSearchAllPages, fetchWithCache } from './github'

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

describe('fetchSearchAllPages and shared search caching', () => {
  it('caches search results so repeating contributor profile search costs zero extra fetches', async () => {
    installFakeIndexedDB()
    const calls = []
    vi.stubGlobal('fetch', async (url) => {
      calls.push(String(url))
      return {
        status: 200,
        ok: true,
        headers: {
          get: (h) => (h === 'x-ratelimit-remaining' ? '4900' : '5000')
        },
        json: async () => ({
          total_count: 2,
          items: [
            { id: 1, title: 'Issue 1' },
            { id: 2, title: 'Issue 2' }
          ]
        })
      }
    })

    const searchUrl = 'https://api.github.com/search/issues?q=author:alice+org:test-org&per_page=100'
    const results1 = await fetchSearchAllPages(searchUrl, 'pat')
    expect(results1).toHaveLength(2)
    expect(calls).toHaveLength(1)

    // Second call for the same contributor search should hit cache and NOT invoke fetch
    const results2 = await fetchSearchAllPages(searchUrl, 'pat')
    expect(results2).toEqual(results1)
    expect(calls).toHaveLength(1)
  })

  it('paginates correctly across multiple search pages', async () => {
    installFakeIndexedDB()
    const calls = []
    vi.stubGlobal('fetch', async (url) => {
      const u = String(url)
      calls.push(u)
      const page = new URL(u).searchParams.get('page') === '2' ? 2 : 1
      return {
        status: 200,
        ok: true,
        headers: { get: () => '5000' },
        json: async () => {
          if (page === 1) {
            return {
              total_count: 3,
              items: [{ id: 1 }, { id: 2 }]
            }
          }
          return {
            total_count: 3,
            items: [{ id: 3 }]
          }
        }
      }
    })

    const searchUrl = 'https://api.github.com/search/issues?q=author:bob&per_page=2'
    const results = await fetchSearchAllPages(searchUrl, 'pat', { perPage: 2 })
    expect(results).toHaveLength(3)
    expect(calls).toHaveLength(2)
  })

  it('stops pagination if signal is aborted', async () => {
    installFakeIndexedDB()
    const controller = new AbortController()
    controller.abort()

    const searchUrl = 'https://api.github.com/search/issues?q=author:carol'
    await expect(fetchSearchAllPages(searchUrl, 'pat', { signal: controller.signal })).rejects.toThrow('The operation was aborted')
  })

  it('dispatches rate-limit-update event and throws RATE_LIMIT on rate limits', async () => {
    installFakeIndexedDB()
    let dispatched = null
    const handler = (e) => { dispatched = e.detail }
    window.addEventListener('rate-limit-update', handler)

    vi.stubGlobal('fetch', async () => ({
      status: 429,
      ok: false,
      headers: {
        get: (h) => {
          if (h === 'x-ratelimit-remaining') return '0'
          if (h === 'x-ratelimit-limit') return '30'
          return null
        }
      },
      json: async () => ({ message: 'API rate limit exceeded' })
    }))

    const searchUrl = 'https://api.github.com/search/issues?q=author:dave'
    await expect(fetchSearchAllPages(searchUrl, 'pat')).rejects.toThrow('RATE_LIMIT')
    expect(dispatched).toBeDefined()
    expect(dispatched.remaining).toBe(0)
    window.removeEventListener('rate-limit-update', handler)
  })
})
