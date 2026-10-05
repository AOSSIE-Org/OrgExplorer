import { describe, it, expect, vi, afterEach } from 'vitest'
import { cacheGet, normalizeCacheKey, fetchOrg, fetchRepos, fetchContributors } from './github'

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
            delete(k) {
              table.delete(k)
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
  return tables
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

  it('preserves case in path segments beyond owner and repository names', () => {
    expect(
      normalizeCacheKey('https://api.github.com/repos/AOSSIE-Org/Repo-A/contents/ReadMe.md')
    ).toBe(
      'https://api.github.com/repos/aossie-org/repo-a/contents/ReadMe.md'
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
  it('migrates an existing raw URL cache entry to its normalized key', async () => {
    const tables = installFakeIndexedDB()
    const oldKey = 'https://api.github.com/orgs/AOSSIE-Org'
    const normalizedKey = normalizeCacheKey(oldKey)
    const record = { k: oldKey, v: { login: 'AOSSIE-Org' }, ts: Date.now() }
    tables.set('cache', new Map([[oldKey, record]]))

    await expect(cacheGet(oldKey)).resolves.toEqual(record.v)
    expect(tables.get('cache').get(normalizedKey)).toEqual({
      ...record,
      k: normalizedKey,
    })
    expect(tables.get('cache').has(oldKey)).toBe(false)
  })

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
  it('does not treat an empty object response as an empty list', async () => {
    installFakeIndexedDB()
    const calls = installFetchStub(() => ({ status: 204, body: null }))

    await expect(fetchOrg('AOSSIE-Org', 'pat')).rejects.toThrow('HTTP_204')
    await expect(fetchOrg('AOSSIE-Org', 'pat')).rejects.toThrow('HTTP_204')
    expect(calls).toHaveLength(2)
  })

  it('caches contributors 204 (empty repo) so repeats cost nothing', async () => {
    installFakeIndexedDB()
    const calls = installFetchStub(() => ({ status: 204, body: null }))

    const first = await fetchContributors('AOSSIE-Org', 'empty-repo', 'pat')
    expect(first).toEqual([])
    expect(calls).toHaveLength(1)

    // Previously this threw inside res.json() on every call, was never
    // cached, and burned one token per re-search.
    const second = await fetchContributors('AOSSIE-Org', 'empty-repo', 'pat')
    expect(second).toEqual([])
    expect(calls).toHaveLength(1)
  })

  it('rejects 409 responses instead of caching them as empty results', async () => {
    installFakeIndexedDB()
    const calls = installFetchStub(() => ({ status: 409, body: null }))

    await expect(fetchContributors('AOSSIE-Org', 'repo-a', 'pat')).rejects.toThrow('HTTP_409')
    await expect(fetchContributors('AOSSIE-Org', 'repo-a', 'pat')).rejects.toThrow('HTTP_409')
    expect(calls).toHaveLength(2)
  })

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
})
