import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  cacheGet,
  cacheGetEntry,
  cacheSet,
  cacheTouch,
  cacheClear,
  fetchWithCache,
  fetchOrg,
  fetchRateLimit,
  TTL_MS
} from './github'

// In-memory IndexedDB mock
function setupMockIndexedDB() {
  const store = new Map()
  const mockIDB = {
    _store: store,
    open: vi.fn(() => {
      const req = {
        result: {
          transaction: vi.fn((storeName, mode) => {
            const tx = {
              oncomplete: null,
              onerror: null,
              objectStore: vi.fn(() => ({
                get: vi.fn((key) => {
                  const getReq = { result: store.get(key), onsuccess: null, onerror: null }
                  queueMicrotask(() => {
                    if (getReq.onsuccess) getReq.onsuccess()
                  })
                  return getReq
                }),
                put: vi.fn((val, key) => {
                  store.set(key || val.k, val)
                  return {}
                }),
                clear: vi.fn(() => {
                  store.clear()
                  return {}
                }),
                delete: vi.fn((key) => {
                  store.delete(key)
                  return {}
                })
              }))
            }
            queueMicrotask(() => {
              if (tx.oncomplete) tx.oncomplete()
            })
            return tx
          })
        },
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null
      }
      queueMicrotask(() => {
        if (req.onsuccess) req.onsuccess({ target: { result: req.result } })
      })
      return req
    })
  }

  vi.stubGlobal('indexedDB', mockIDB)
  return mockIDB
}

describe('github service: IndexedDB ETag Cache & Throttling', () => {
  let mockIDB
  let originalFetch

  beforeEach(() => {
    mockIDB = setupMockIndexedDB()
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('Cache Operations', () => {
    it('sets and retrieves cache entries with ETag', async () => {
      await cacheSet('https://api.github.com/orgs/AOSSIE-Org', { name: 'AOSSIE' }, 'W/"etag-123"')
      const entry = await cacheGetEntry('https://api.github.com/orgs/AOSSIE-Org')

      expect(entry).toBeDefined()
      expect(entry.k).toBe('https://api.github.com/orgs/AOSSIE-Org')
      expect(entry.v).toEqual({ name: 'AOSSIE' })
      expect(entry.etag).toBe('W/"etag-123"')
      expect(typeof entry.ts).toBe('number')
    })

    it('returns value from cacheGet if within TTL', async () => {
      await cacheSet('key1', { value: 42 })
      const val = await cacheGet('key1')
      expect(val).toEqual({ value: 42 })
    })

    it('returns null from cacheGet if expired', async () => {
      await cacheSet('key1', { value: 42 })
      // Manually set timestamp to past TTL
      const record = mockIDB._store.get('key1')
      record.ts = Date.now() - (TTL_MS + 1000)

      const val = await cacheGet('key1')
      expect(val).toBeNull()

      // But cacheGetEntry still preserves the record for conditional requests
      const entry = await cacheGetEntry('key1')
      expect(entry).not.toBeNull()
      expect(entry.v).toEqual({ value: 42 })
    })

    it('refreshes timestamp and updates ETag on cacheTouch', async () => {
      await cacheSet('key1', { value: 100 }, 'etag-old')
      const oldEntry = mockIDB._store.get('key1')
      oldEntry.ts = Date.now() - (TTL_MS + 5000)

      await cacheTouch('key1', 'etag-new')
      const updated = await cacheGetEntry('key1')
      expect(updated.etag).toBe('etag-new')
      expect(updated.v).toEqual({ value: 100 })
      expect(Date.now() - updated.ts).toBeLessThan(1000)
    })

    it('clears all entries on cacheClear', async () => {
      await cacheSet('key1', 'val1')
      await cacheSet('key2', 'val2')
      expect(mockIDB._store.size).toBe(2)

      await cacheClear()
      expect(mockIDB._store.size).toBe(0)
    })
  })

  describe('fetchWithCache with ETag Conditional Requests', () => {
    it('returns cached data immediately when cache is fresh without network fetch', async () => {
      const mockFetch = vi.fn()
      globalThis.fetch = mockFetch

      await cacheSet('https://api.github.com/test', { data: 'cached' }, 'etag-1')

      const result = await fetchWithCache('https://api.github.com/test')
      expect(result).toEqual({ data: 'cached' })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('sends If-None-Match header when cache is expired', async () => {
      await cacheSet('https://api.github.com/test', { data: 'old-data' }, 'W/"test-etag"')
      const entry = mockIDB._store.get('https://api.github.com/test')
      entry.ts = Date.now() - (TTL_MS + 1000)

      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: new Headers({
          'etag': 'W/"new-etag"',
          'x-ratelimit-limit': '60',
          'x-ratelimit-remaining': '59',
          'x-ratelimit-used': '1',
          'x-ratelimit-reset': '1700000000'
        }),
        json: async () => ({ data: 'fresh-data' })
      })
      globalThis.fetch = mockFetch

      const result = await fetchWithCache('https://api.github.com/test', 'token123')
      expect(result).toEqual({ data: 'fresh-data' })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'token token123',
            'If-None-Match': 'W/"test-etag"'
          })
        })
      )
    })

    it('handles 304 Not Modified: updates cache TTL and returns cached data without consuming quota', async () => {
      await cacheSet('https://api.github.com/test', { data: 'cached-content' }, 'W/"etag-304"')
      const entry = mockIDB._store.get('https://api.github.com/test')
      entry.ts = Date.now() - (TTL_MS + 1000)

      let eventDispatched = null
      window.addEventListener('rate-limit-update', e => {
        eventDispatched = e.detail
      }, { once: true })

      const mockFetch = vi.fn().mockResolvedValue({
        status: 304,
        ok: false,
        headers: new Headers({
          'x-ratelimit-limit': '60',
          'x-ratelimit-remaining': '60',
          'x-ratelimit-used': '0',
          'x-ratelimit-reset': '1700000000'
        })
      })
      globalThis.fetch = mockFetch

      const result = await fetchWithCache('https://api.github.com/test')
      expect(result).toEqual({ data: 'cached-content' })

      // Rate limit event was dispatched
      expect(eventDispatched).toEqual({
        limit: 60,
        remaining: 60,
        used: 0,
        reset: 1700000000
      })

      // Cache was touched and is now fresh again
      const refreshedEntry = await cacheGetEntry('https://api.github.com/test')
      expect(Date.now() - refreshedEntry.ts).toBeLessThan(1000)
    })

    it('stores ETag and payload on 200 OK responses', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: new Headers({
          'etag': 'W/"server-etag-999"',
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-used': '1',
          'x-ratelimit-reset': '1700000000'
        }),
        json: async () => ({ org: 'test-org' })
      })
      globalThis.fetch = mockFetch

      const res = await fetchOrg('test-org', 'my-pat')
      expect(res).toEqual({ org: 'test-org' })

      // Wait microtask for non-blocking cacheSet
      await new Promise(r => setTimeout(r, 10))

      const entry = await cacheGetEntry('https://api.github.com/orgs/test-org')
      expect(entry).toBeDefined()
      expect(entry.v).toEqual({ org: 'test-org' })
      expect(entry.etag).toBe('W/"server-etag-999"')
    })

    it('throws RATE_LIMIT on 403', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 403,
        ok: false,
        headers: new Headers({
          'x-ratelimit-remaining': '0'
        })
      })

      await expect(fetchWithCache('https://api.github.com/test')).rejects.toThrow('RATE_LIMIT')
    })

    it('throws NOT_FOUND on 404', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 404,
        ok: false,
        headers: new Headers()
      })

      await expect(fetchWithCache('https://api.github.com/nonexistent')).rejects.toThrow('NOT_FOUND')
    })

    it('dispatches rate limit info on fetchRateLimit', async () => {
      let eventDispatched = null
      window.addEventListener('rate-limit-update', e => {
        eventDispatched = e.detail
      }, { once: true })

      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: new Headers({
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4950',
          'x-ratelimit-used': '50',
          'x-ratelimit-reset': '1700000000'
        }),
        json: async () => ({ rate: { limit: 5000, remaining: 4950 } })
      })

      const rate = await fetchRateLimit('pat')
      expect(rate).toEqual({ limit: 5000, remaining: 4950 })
      expect(eventDispatched.remaining).toBe(4950)
    })

    it('throttles concurrent requests to MAX_CONCURRENT_REQUESTS', async () => {
      let activeFetchCount = 0
      let maxSimultaneousFetches = 0
      const resolvers = []

      globalThis.fetch = vi.fn().mockImplementation(() => {
        activeFetchCount++
        if (activeFetchCount > maxSimultaneousFetches) {
          maxSimultaneousFetches = activeFetchCount
        }
        return new Promise(resolve => {
          resolvers.push(() => {
            activeFetchCount--
            resolve({
              status: 200,
              ok: true,
              headers: new Headers(),
              json: async () => ({})
            })
          })
        })
      })

      // Launch 15 concurrent uncached requests
      const promises = Array.from({ length: 15 }, (_, i) =>
        fetchWithCache(`https://api.github.com/throttling-test/${i}`)
      )

      // Allow microtasks to queue and start running
      await new Promise(r => setTimeout(r, 20))

      // Max active fetches should be capped at 6
      expect(maxSimultaneousFetches).toBe(6)
      expect(activeFetchCount).toBe(6)

      // Resolve all
      while (resolvers.length > 0) {
        const r = resolvers.shift()
        r()
        await new Promise(res => setTimeout(res, 5))
      }

      await Promise.all(promises)
      expect(activeFetchCount).toBe(0)
    })
  })
})

