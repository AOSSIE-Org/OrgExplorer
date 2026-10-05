import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchRateLimit } from './github'

describe('fetchRateLimit', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('extracts live rate limit values from HEAD response headers', async () => {
    const mockHeaders = new Headers({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '4820',
      'x-ratelimit-used': '180',
      'x-ratelimit-reset': '1791216520',
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: mockHeaders,
    })

    const result = await fetchRateLimit('test-pat-123')

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.github.com/octocat',
      expect.objectContaining({
        method: 'HEAD',
        headers: expect.objectContaining({
          Authorization: 'token test-pat-123',
          Accept: 'application/vnd.github.v3+json',
        }),
      })
    )

    expect(result).toEqual({
      limit: 5000,
      remaining: 4820,
      used: 180,
      reset: 1791216520,
    })
  })

  it('calculates used count as (limit - remaining) when x-ratelimit-used header is missing', async () => {
    const mockHeaders = new Headers({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '4950',
      'x-ratelimit-reset': '1791216520',
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: mockHeaders,
    })

    const result = await fetchRateLimit('test-pat')

    expect(result).toEqual({
      limit: 5000,
      remaining: 4950,
      used: 50,
      reset: 1791216520,
    })
  })

  it('parses headers even on 403 rate-limited response', async () => {
    const mockHeaders = new Headers({
      'x-ratelimit-limit': '60',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-used': '60',
      'x-ratelimit-reset': '1791219999',
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: mockHeaders,
    })

    const result = await fetchRateLimit('')

    expect(result).toEqual({
      limit: 60,
      remaining: 0,
      used: 60,
      reset: 1791219999,
    })
  })

  it('falls back to /rate_limit endpoint if HEAD inspection fails', async () => {
    global.fetch = vi.fn()
      // First call to /octocat fails with 500
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers(),
      })
      // Second call to /rate_limit succeeds
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          resources: {
            core: {
              limit: 5000,
              remaining: 4990,
              used: 10,
              reset: 1791216520,
            },
          },
        }),
      })

    const result = await fetchRateLimit('test-pat')

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(result).toEqual({
      limit: 5000,
      remaining: 4990,
      used: 10,
      reset: 1791216520,
    })
  })

  it('preserves Bearer token authorization header format', async () => {
    const mockHeaders = new Headers({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '5000',
      'x-ratelimit-used': '0',
      'x-ratelimit-reset': '1791216520',
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: mockHeaders,
    })

    await fetchRateLimit('Bearer github_pat_abc123')

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.github.com/octocat',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer github_pat_abc123',
        }),
      })
    )
  })

  it('returns null on complete network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const result = await fetchRateLimit('test-pat')

    expect(result).toBeNull()
  })
})
