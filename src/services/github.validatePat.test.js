import { describe, it, expect, vi, afterEach } from 'vitest'
import { validatePat } from './github'

describe('validatePat', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects empty or whitespace-only tokens without making network requests', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const res1 = await validatePat('')
    expect(res1.valid).toBe(false)
    expect(res1.error).toContain('Token cannot be empty')

    const res2 = await validatePat('   ')
    expect(res2.valid).toBe(false)
    expect(res2.error).toContain('Token cannot be empty')

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('validates authentic tokens against the rate_limit endpoint', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ rate: { limit: 5000, remaining: 4999, reset: 1700000000 } }),
    })

    const res = await validatePat('ghp_validToken12345')
    expect(res.valid).toBe(true)
    expect(res.rate?.limit).toBe(5000)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.github.com/rate_limit',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'token ghp_validToken12345',
        }),
      })
    )
  })

  it('returns a clear error on 401 unauthorized (bad or expired token)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Bad credentials' }),
    })

    const res = await validatePat('ghp_badToken')
    expect(res.valid).toBe(false)
    expect(res.error).toBe('Invalid or expired GitHub token')
  })

  it('handles unexpected GitHub API error statuses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Internal Server Error' }),
    })

    const res = await validatePat('ghp_serverErrorToken')
    expect(res.valid).toBe(false)
    expect(res.error).toContain('GitHub API error (500)')
  })

  it('handles network failure gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Failed to fetch'))

    const res = await validatePat('ghp_offlineToken')
    expect(res.valid).toBe(false)
    expect(res.error).toContain('Network error')
  })
})
