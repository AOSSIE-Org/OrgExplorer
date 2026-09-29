import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AppProvider, useApp } from './AppContext'

const { fetchOrg, fetchRepos, fetchContributors } = vi.hoisted(() => ({
  fetchOrg: vi.fn(),
  fetchRepos: vi.fn(),
  fetchContributors: vi.fn(),
}))
vi.mock('../services/github', () => ({
  fetchOrg,
  fetchRepos,
  fetchContributors,
  fetchIssues: vi.fn(),
  fetchRateLimit: vi.fn(),
  fetchPulls: vi.fn(),
}))

vi.mock('../services/cache', () => ({
  saveAnalysis: vi.fn(),
  loadAnalysis: vi.fn().mockResolvedValue(null),
}))

const org = login => ({ login, public_repos: 1 })

async function renderApp() {
  const { result } = renderHook(() => useApp(), { wrapper: AppProvider })
  await waitFor(() => expect(result.current.hydrating).toBe(false))
  return result
}

describe('explore', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('oe_pat', 'test-token')
    fetchOrg.mockReset().mockImplementation(async name => org(name))
    fetchRepos.mockReset().mockResolvedValue([{ name: 'repo', stargazers_count: 1 }])
    fetchContributors.mockReset().mockResolvedValue([])
  })

  it('marks the analysis complete when every org is fetched with a PAT', async () => {
    const app = await renderApp()

    let returned
    await act(async () => { returned = await app.current.explore(['org-a']) })

    expect(returned).toBeTruthy()
    expect(app.current.isComplete).toBe(true)
    expect(app.current.error).toBe('')
  })

  it('fails the exploration and names the org when its repositories cannot be fetched', async () => {
    fetchRepos.mockRejectedValue(new Error('TEST_REPO_FAILURE'))
    const app = await renderApp()

    let returned
    await act(async () => { returned = await app.current.explore(['AOSSIE-Org']) })

    expect(returned).toBe(false)
    expect(app.current.model).toBeNull()
    expect(app.current.isComplete).toBe(false)
    expect(app.current.error).toMatch(/AOSSIE-Org/)
  })

  it('names only the orgs whose repositories failed in a multi-org exploration', async () => {
    fetchRepos.mockImplementation(async login => {
      if (login === 'org-b') throw new Error('TEST_REPO_FAILURE')
      return [{ name: 'repo', stargazers_count: 1 }]
    })
    const app = await renderApp()

    let returned
    await act(async () => { returned = await app.current.explore(['org-a', 'org-b']) })

    expect(returned).toBe(false)
    expect(app.current.isComplete).toBe(false)
    expect(app.current.error).toMatch(/org-b/)
    expect(app.current.error).not.toMatch(/org-a/)
  })

  it('shows the rate limit message when a repository fetch hits the rate limit', async () => {
    fetchRepos.mockRejectedValue(new Error('RATE_LIMIT'))
    const app = await renderApp()

    await act(async () => { await app.current.explore(['org-a']) })

    expect(app.current.error).toMatch(/rate limit/i)
  })
})
