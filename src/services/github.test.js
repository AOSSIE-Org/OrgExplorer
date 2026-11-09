import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchWithCache,
  fetchContributors,
  fetchRepos,
  fetchIssues,
  fetchPulls,
  cacheClear,
} from './github'

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

describe('github service', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    installFakeIndexedDB()
    await cacheClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('fetchWithCache', () => {
    it('returns empty array [] on 204 No Content without crashing on JSON parsing', async () => {
      const mockHeaders = new Headers({
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '4999',
        'x-ratelimit-used': '1',
        'x-ratelimit-reset': '1800000000',
      })

      global.fetch = vi.fn().mockResolvedValue({
        status: 204,
        ok: true,
        headers: mockHeaders,
        text: vi.fn().mockResolvedValue(''),
        json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected end of JSON input')),
      })

      const result = await fetchWithCache('https://api.github.com/repos/org/empty-repo/contributors')
      expect(result).toEqual([])
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('returns empty array [] when response body is empty string', async () => {
      const mockHeaders = new Headers({
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '4999',
        'x-ratelimit-used': '1',
        'x-ratelimit-reset': '1800000000',
      })

      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: mockHeaders,
        text: vi.fn().mockResolvedValue(''),
      })

      const result = await fetchWithCache('https://api.github.com/repos/org/repo/empty-body')
      expect(result).toEqual([])
    })

    it('parses and returns JSON data correctly on standard 200 response', async () => {
      const mockHeaders = new Headers({
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '4999',
        'x-ratelimit-used': '1',
        'x-ratelimit-reset': '1800000000',
      })

      const payload = [{ id: 1, login: 'octocat', contributions: 42 }]

      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: mockHeaders,
        text: vi.fn().mockResolvedValue(JSON.stringify(payload)),
      })

      const result = await fetchWithCache('https://api.github.com/repos/org/repo/contributors-success')
      expect(result).toEqual(payload)
    })

    it('throws RATE_LIMIT on HTTP 403', async () => {
      const mockHeaders = new Headers({
        'x-ratelimit-remaining': '0',
      })
      global.fetch = vi.fn().mockResolvedValue({
        status: 403,
        ok: false,
        headers: mockHeaders,
      })

      await expect(fetchWithCache('https://api.github.com/rate-limited')).rejects.toThrow('RATE_LIMIT')
    })

    it('throws NOT_FOUND on HTTP 404', async () => {
      const mockHeaders = new Headers()
      global.fetch = vi.fn().mockResolvedValue({
        status: 404,
        ok: false,
        headers: mockHeaders,
      })

      await expect(fetchWithCache('https://api.github.com/missing-repo')).rejects.toThrow('NOT_FOUND')
    })

    it('throws HTTP_{status} on unexpected error status codes', async () => {
      const mockHeaders = new Headers()
      global.fetch = vi.fn().mockResolvedValue({
        status: 500,
        ok: false,
        headers: mockHeaders,
      })

      await expect(fetchWithCache('https://api.github.com/server-error')).rejects.toThrow('HTTP_500')
    })

    it('returns empty array [] on 409 Conflict and caches that result', async () => {
      const mockHeaders = new Headers({
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '4999',
        'x-ratelimit-used': '1',
        'x-ratelimit-reset': '1800000000',
      })

      global.fetch = vi.fn().mockResolvedValue({
        status: 409,
        ok: false,
        headers: mockHeaders,
        text: vi.fn().mockResolvedValue(''),
        json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected end of JSON input')),
      })

      const url = 'https://api.github.com/repos/org/repo-409/contributors'
      const first = await fetchWithCache(url)
      expect(first).toEqual([])
      expect(global.fetch).toHaveBeenCalledTimes(1)

      const second = await fetchWithCache(url)
      expect(second).toEqual([])
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('rejects with INVALID_JSON on 200 response with malformed JSON and does not cache it', async () => {
      const mockHeaders = new Headers({
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '4999',
        'x-ratelimit-used': '1',
        'x-ratelimit-reset': '1800000000',
      })

      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: mockHeaders,
        text: vi.fn().mockResolvedValue('{"invalid_json":'),
      })

      const url = 'https://api.github.com/repos/org/repo/malformed-json'
      await expect(fetchWithCache(url)).rejects.toThrow('INVALID_JSON')
      expect(global.fetch).toHaveBeenCalledTimes(1)

      await expect(fetchWithCache(url)).rejects.toThrow('INVALID_JSON')
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('fetchContributors', () => {
    it('handles empty repositories (204 No Content) gracefully without throwing SyntaxError or TypeError', async () => {
      const mockHeaders = new Headers({
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '59',
        'x-ratelimit-used': '1',
        'x-ratelimit-reset': '1800000000',
      })

      global.fetch = vi.fn().mockResolvedValue({
        status: 204,
        ok: true,
        headers: mockHeaders,
        text: vi.fn().mockResolvedValue(''),
      })

      const contribs = await fetchContributors('org', 'empty-repo', null)
      expect(contribs).toEqual([])
    })

    it('handles non-array or malformed API responses without throwing TypeError: data is not iterable', async () => {
      const mockHeaders = new Headers({
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '59',
        'x-ratelimit-used': '1',
        'x-ratelimit-reset': '1800000000',
      })

      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: mockHeaders,
        text: vi.fn().mockResolvedValue(JSON.stringify({ message: 'Not found' })),
      })

      const contribs = await fetchContributors('org', 'bad-repo', null)
      expect(contribs).toEqual([])
    })

    it('paginates contributors when using a PAT across multiple pages', async () => {
      const mockHeaders = new Headers({
        'x-ratelimit-limit': '5000',
        'x-ratelimit-remaining': '4999',
        'x-ratelimit-used': '1',
        'x-ratelimit-reset': '1800000000',
      })

      const page1 = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, login: `user-${i + 1}` }))
      const page2 = [{ id: 101, login: 'user-101' }, { id: 102, login: 'user-102' }]

      global.fetch = vi.fn().mockImplementation(async (url) => {
        const page = new URL(url).searchParams.get('page')
        if (page === '1') {
          return {
            status: 200,
            ok: true,
            headers: mockHeaders,
            text: vi.fn().mockResolvedValue(JSON.stringify(page1)),
          }
        }
        if (page === '2') {
          return {
            status: 200,
            ok: true,
            headers: mockHeaders,
            text: vi.fn().mockResolvedValue(JSON.stringify(page2)),
          }
        }
        return {
          status: 200,
          ok: true,
          headers: mockHeaders,
          text: vi.fn().mockResolvedValue('[]'),
        }
      })

      const contribs = await fetchContributors('org', 'repo', 'test-pat')
      expect(contribs).toHaveLength(102)
      expect(contribs).toEqual([...page1, ...page2])
      expect(contribs).toContainEqual(page1[0])
      expect(contribs).toContainEqual(page2[0])
    })
  })

  describe('fetchRepos, fetchIssues, and fetchPulls robustness', () => {
    it('fetchRepos gracefully handles 204 or non-array responses', async () => {
      const mockHeaders = new Headers()
      global.fetch = vi.fn().mockResolvedValue({
        status: 204,
        ok: true,
        headers: mockHeaders,
        text: vi.fn().mockResolvedValue(''),
      })

      const repos = await fetchRepos('org', 0, null)
      expect(repos).toEqual([])
    })

    it('fetchIssues gracefully handles 204 or non-array responses', async () => {
      const mockHeaders = new Headers()
      global.fetch = vi.fn().mockResolvedValue({
        status: 204,
        ok: true,
        headers: mockHeaders,
        text: vi.fn().mockResolvedValue(''),
      })

      const issues = await fetchIssues('org', 'repo', null)
      expect(issues).toEqual([])
    })

    it('fetchPulls gracefully handles 204 or non-array responses', async () => {
      const mockHeaders = new Headers()
      global.fetch = vi.fn().mockResolvedValue({
        status: 204,
        ok: true,
        headers: mockHeaders,
        text: vi.fn().mockResolvedValue(''),
      })

      const pulls = await fetchPulls('org', 'repo', null)
      expect(pulls).toEqual([])
    })
  })
})
