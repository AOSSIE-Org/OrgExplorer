
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchGovernanceIssues } from './github'

describe('fetchGovernanceIssues', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requests open issues oldest-first', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => [{ number: 1, title: 'Old issue' }],
    })

    await fetchGovernanceIssues('example-org', 'example-repo', null)

    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const requestedUrl = String(fetchSpy.mock.calls[0][0])
    expect(requestedUrl).toContain('state=open')
    expect(requestedUrl).toContain('sort=created')
    expect(requestedUrl).toContain('direction=asc')
    expect(requestedUrl).toContain('per_page=100')
    expect(requestedUrl).toContain('page=1')
  })

  it('stops fetching when a page has fewer than 100 items', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => [{ number: 1, title: 'Old issue' }],
    })

    await fetchGovernanceIssues('example-org', 'example-repo', null)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
