import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchWithCache,
  fetchContributors,
  fetchRepos,
  fetchIssues,
  fetchPulls,
  cacheClear,
} from './github'

describe('github service', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    await cacheClear()
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
      const mockHeaders = new Headers()
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
