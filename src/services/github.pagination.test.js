import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchRepos, fetchContributors, fetchIssues, fetchPulls } from './github'

// GitHub returns a message/error object instead of an array for several
// valid states: issues disabled on a repo, an empty repository, or a 204 No
// Content response. `all.push(...data)` on one of those throws
// `TypeError: data is not iterable` and aborts the whole fetch.
function mockFetchOnce(body, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: () => Promise.resolve(body)
  })
}

describe('paginated fetchers guard against non-array API responses', () => {
  beforeEach(() => {
    // Bypass the IndexedDB-backed cache layer so each call reliably hits fetch.
    global.indexedDB = undefined
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchRepos returns [] instead of throwing when the API returns an error object', async () => {
    mockFetchOnce({ message: 'Git Repository is empty.' })

    await expect(fetchRepos('org', 0, null)).resolves.toEqual([])
  })

  it('fetchContributors returns [] instead of throwing when issues/contributors are disabled', async () => {
    mockFetchOnce({ message: 'Issues are disabled in this repository' })

    await expect(fetchContributors('org', 'repo', null)).resolves.toEqual([])
  })

  it('fetchIssues returns [] instead of throwing on a non-array payload', async () => {
    mockFetchOnce({ message: 'Issues are disabled in this repository' })

    await expect(fetchIssues('org', 'repo', null)).resolves.toEqual([])
  })

  it('fetchPulls returns [] instead of throwing on a non-array payload', async () => {
    mockFetchOnce({ message: 'Git Repository is empty.' })

    await expect(fetchPulls('org', 'repo', null)).resolves.toEqual([])
  })

  it('fetchRepos still collects normal array pages', async () => {
    const repos = Array.from({ length: 3 }, (_, i) => ({ id: i }))
    mockFetchOnce(repos)

    await expect(fetchRepos('org', 3, null)).resolves.toEqual(repos)
  })
})
