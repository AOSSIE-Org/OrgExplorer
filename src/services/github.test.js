import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  normalizeCacheKey,
  cacheGet,
  cacheSet,
  cacheClear,
  fetchOrg,
  fetchContributors,
} from './github'

describe('github.js cache and API service', () => {
  let mockStore
  let originalFetch
  let originalIndexedDB

  beforeEach(() => {
    mockStore = new Map()
    originalFetch = globalThis.fetch
    originalIndexedDB = globalThis.indexedDB

    const mockIDB = {
      open: () => {
        const req = {}
        setTimeout(() => {
          req.result = {
            transaction: () => {
              const tx = {
                objectStore: () => ({
                  get: (key) => {
                    const r = {}
                    setTimeout(() => {
                      r.result = mockStore.get(key)
                      r.onsuccess?.({ target: r })
                    }, 0)
                    return r
                  },
                  put: (val) => {
                    mockStore.set(val.k, val)
                    const r = {}
                    setTimeout(() => {
                      r.onsuccess?.({ target: r })
                    }, 0)
                    return r
                  },
                  clear: () => {
                    mockStore.clear()
                  },
                }),
                oncomplete: null,
                onerror: null,
              }
              setTimeout(() => tx.oncomplete?.(), 0)
              return tx
            },
          }
          req.onsuccess?.({ target: req })
        }, 0)
        return req
      },
    }

    globalThis.indexedDB = mockIDB
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    globalThis.indexedDB = originalIndexedDB
    vi.restoreAllMocks()
  })

  describe('normalizeCacheKey', () => {
    it('normalizes URL pathnames to lower case', () => {
      const url1 = 'https://api.github.com/orgs/AOSSIE-Org'
      const url2 = 'https://api.github.com/orgs/aossie-org'
      expect(normalizeCacheKey(url1)).toBe(normalizeCacheKey(url2))
      expect(normalizeCacheKey(url1)).toBe('https://api.github.com/orgs/aossie-org')
    })

    it('strips trailing slashes from pathnames', () => {
      const withSlash = 'https://api.github.com/orgs/AOSSIE-Org/'
      const withoutSlash = 'https://api.github.com/orgs/aossie-org'
      expect(normalizeCacheKey(withSlash)).toBe(normalizeCacheKey(withoutSlash))
    })

    it('sorts query parameters deterministically', () => {
      const urlA = 'https://api.github.com/orgs/AOSSIE-Org/repos?per_page=100&page=1'
      const urlB = 'https://api.github.com/orgs/aossie-org/repos?page=1&per_page=100'
      expect(normalizeCacheKey(urlA)).toBe(normalizeCacheKey(urlB))
    })

    it('gracefully handles non-URL strings by lowercasing', () => {
      expect(normalizeCacheKey('AOSSIE-ORG')).toBe('aossie-org')
    })
  })

  describe('cacheGet & cacheSet', () => {
    it('retrieves cached entry regardless of key casing', async () => {
      await cacheSet('https://api.github.com/orgs/AOSSIE-Org', { name: 'AOSSIE' })
      const cached = await cacheGet('https://api.github.com/orgs/aossie-org')
      expect(cached).toEqual({ name: 'AOSSIE' })
    })

    it('returns null for missing keys', async () => {
      const cached = await cacheGet('https://api.github.com/orgs/nonexistent')
      expect(cached).toBeNull()
    })

    it('expires stale entries older than TTL', async () => {
      const key = normalizeCacheKey('https://api.github.com/orgs/test-org')
      mockStore.set(key, {
        k: key,
        v: { name: 'stale' },
        ts: Date.now() - 3_700_000, // > 1 hour
      })

      const cached = await cacheGet('https://api.github.com/orgs/test-org')
      expect(cached).toBeNull()
    })

    it('clears all cached entries on cacheClear', async () => {
      await cacheSet('https://api.github.com/orgs/AOSSIE-Org', { id: 1 })
      expect(mockStore.size).toBe(1)
      await cacheClear()
      expect(mockStore.size).toBe(0)
    })
  })

  describe('fetchOrg caching behavior (Issue #270)', () => {
    it('saves quota by hitting cache on repeat search with different casing', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          'x-ratelimit-limit': '60',
          'x-ratelimit-remaining': '55',
          'x-ratelimit-used': '5',
          'x-ratelimit-reset': '1700000000',
        }),
        json: async () => ({ login: 'AOSSIE-Org', public_repos: 10 }),
      })
      globalThis.fetch = fetchMock

      // First search with uppercase
      const first = await fetchOrg('AOSSIE-Org')
      expect(first.login).toBe('AOSSIE-Org')
      expect(fetchMock).toHaveBeenCalledTimes(1)

      // Repeat search with lowercase - should hit L2 cache, 0 network calls
      const second = await fetchOrg('aossie-org')
      expect(second.login).toBe('AOSSIE-Org')
      expect(fetchMock).toHaveBeenCalledTimes(1) // Still 1!
    })
  })

  describe('fetchContributors and HTTP 204 handling', () => {
    it('handles HTTP 204 No Content for empty repositories by caching empty array', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 204, // No content
        headers: new Headers(),
        // 204 does not need json() called
      })
      globalThis.fetch = fetchMock

      // Fetch contributors for empty repo
      const contributors = await fetchContributors('AOSSIE-Org', 'empty-repo')
      expect(contributors).toEqual([])
      expect(fetchMock).toHaveBeenCalledTimes(1)

      // Next search should be cached and return empty array without network call
      const cachedContributors = await fetchContributors('aossie-org', 'empty-repo')
      expect(cachedContributors).toEqual([])
      expect(fetchMock).toHaveBeenCalledTimes(1) // No second network call!
    })

    it('handles 404 NOT_FOUND on pagination gracefully by caching empty array', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers(),
      })
      globalThis.fetch = fetchMock

      const contributors = await fetchContributors('AOSSIE-Org', 'not-found-repo')
      expect(contributors).toEqual([])
    })
  })
})
