import { describe, it, expect, vi, afterEach } from 'vitest'
import { normalizeCacheKey, fetchOrg, fetchRepos, fetchContributors } from './github'

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

  it('differentiates between authenticated and unauthenticated requests and between different PATs', () => {
    const url = 'https://api.github.com/repos/aossie-org/repo-a/contributors?page=1&per_page=100'
    const anonKey = normalizeCacheKey(url)
    const patKey1 = normalizeCacheKey(url, 'ghp_secret_token_1')
    const patKey2 = normalizeCacheKey(url, 'ghp_secret_token_2')

    expect(anonKey).toBe(`anon:${url}`)
    expect(patKey1).toMatch(/^auth_[a-f0-9]{16}:/)
    expect(patKey2).toMatch(/^auth_[a-f0-9]{16}:/)
    expect(anonKey).not.toBe(patKey1)
    expect(patKey1).not.toBe(patKey2)

    // Identical PAT produces identical stable cache key
    expect(normalizeCacheKey(url, 'ghp_secret_token_1')).toBe(patKey1)

    // Empty/falsy pat maps to anon
    expect(normalizeCacheKey(url, '')).toBe(anonKey)
    expect(normalizeCacheKey(url, null)).toBe(anonKey)
    expect(normalizeCacheKey(url, undefined)).toBe(anonKey)
  })

  it('handles already-scoped keys idempotently', () => {
    const url = 'https://api.github.com/orgs/aossie-org'
    expect(normalizeCacheKey('auth:' + url, 'pat')).toBe(normalizeCacheKey(url, 'pat'))
    expect(normalizeCacheKey('anon:' + url, '')).toBe('anon:' + url)
  })
})

describe('auth-state cache separation (#228)', () => {
  it('re-fetches contributors when switching from unauthenticated to authenticated', async () => {
    installFakeIndexedDB()
    const calls = []
    vi.stubGlobal('fetch', async (url, opts) => {
      calls.push({ url: String(url), auth: opts?.headers?.Authorization })
      return {
        status: 200,
        ok: true,
        headers: { get: () => '5000' },
        json: async () => [{ login: 'alice', contributions: 10 }],
      }
    })

    // 1. Explore without a PAT (unauthenticated)
    const unauthData = await fetchContributors('AOSSIE-Org', 'Repo-A', '')
    expect(unauthData).toHaveLength(1)
    expect(calls).toHaveLength(1)
    expect(calls[0].auth).toBeUndefined()

    // 2. Explore with a PAT (authenticated)
    // Previously, page 1 returned stale unauthenticated cache because pat was ignored (#228).
    // Now, it triggers a fresh authenticated fetch.
    const authData = await fetchContributors('AOSSIE-Org', 'Repo-A', 'my-token')
    expect(authData).toHaveLength(1)
    expect(calls).toHaveLength(2)
    expect(calls[1].auth).toBe('token my-token')

    // 3. Repeating the authenticated request hits the auth cache (costs zero extra fetches)
    await fetchContributors('AOSSIE-Org', 'Repo-A', 'my-token')
    expect(calls).toHaveLength(2)

    // 4. Repeating the unauthenticated request hits the anon cache (costs zero extra fetches)
    await fetchContributors('AOSSIE-Org', 'Repo-A', '')
    expect(calls).toHaveLength(2)
  })

  it('re-fetches repos when adding a PAT', async () => {
    installFakeIndexedDB()
    const calls = []
    vi.stubGlobal('fetch', async (url, opts) => {
      calls.push({ url: String(url), auth: opts?.headers?.Authorization })
      return {
        status: 200,
        ok: true,
        headers: { get: () => '5000' },
        json: async () => [{ name: 'repo-1' }],
      }
    })

    // Fetch without PAT
    await fetchRepos('AOSSIE-Org', 1, '')
    expect(calls).toHaveLength(1)
    expect(calls[0].auth).toBeUndefined()

    // Fetch with PAT
    await fetchRepos('AOSSIE-Org', 1, 'pat-123')
    expect(calls).toHaveLength(2)
    expect(calls[1].auth).toBe('token pat-123')

    // Cache hits
    await fetchRepos('AOSSIE-Org', 1, 'pat-123')
    expect(calls).toHaveLength(2)
  })

  it('isolates cache entries between different PATs so switching tokens never returns stale data', async () => {
    installFakeIndexedDB()
    const calls = []
    vi.stubGlobal('fetch', async (url, opts) => {
      const auth = opts?.headers?.Authorization
      calls.push({ url: String(url), auth })
      const body = auth === 'token pat-A' ? [{ name: 'repo-A' }] : [{ name: 'repo-B' }]
      return {
        status: 200,
        ok: true,
        headers: { get: () => '5000' },
        json: async () => body,
      }
    })

    // Fetch with PAT A
    const resA = await fetchRepos('AOSSIE-Org', 1, 'pat-A')
    expect(resA).toEqual([{ name: 'repo-A' }])
    expect(calls).toHaveLength(1)

    // Fetch with PAT B -> must not return cached repo-A, must fetch for PAT B
    const resB = await fetchRepos('AOSSIE-Org', 1, 'pat-B')
    expect(resB).toEqual([{ name: 'repo-B' }])
    expect(calls).toHaveLength(2)

    // Repeat with PAT A -> hits PAT A's cache (no extra fetch)
    const cachedA = await fetchRepos('AOSSIE-Org', 1, 'pat-A')
    expect(cachedA).toEqual([{ name: 'repo-A' }])
    expect(calls).toHaveLength(2)

    // Repeat with PAT B -> hits PAT B's cache (no extra fetch)
    const cachedB = await fetchRepos('AOSSIE-Org', 1, 'pat-B')
    expect(cachedB).toEqual([{ name: 'repo-B' }])
    expect(calls).toHaveLength(2)
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
