import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { AppProvider, useApp } from './AppContext'

const github = vi.hoisted(() => ({
  fetchOrg: vi.fn(),
  fetchRepos: vi.fn(),
  fetchContributors: vi.fn(),
  fetchIssues: vi.fn(),
  fetchPulls: vi.fn(),
  fetchRateLimit: vi.fn(),
}))
vi.mock('../services/github', () => github)

const cache = vi.hoisted(() => ({
  saveAnalysis: vi.fn(),
  loadAnalysis: vi.fn(),
}))
vi.mock('../services/cache', () => cache)

// Exposes the live context value to the test.
let ctx
function Probe() {
  ctx = useApp()
  return null
}

const repoFor = org => ({
  id: `${org}-repo-id`,
  name: `${org}-repo`,
  pushed_at: new Date().toISOString(),
  stargazers_count: 0,
  forks_count: 0,
  watchers_count: 0,
  open_issues_count: 0,
})

describe('AppProvider.explore', () => {
  beforeEach(() => {
    localStorage.clear()
    ctx = undefined

    github.fetchOrg.mockImplementation(async login => ({ login, public_repos: 1 }))
    github.fetchRepos.mockImplementation(async org => [repoFor(org)])
    github.fetchContributors.mockResolvedValue([])
    github.fetchIssues.mockResolvedValue([])
    github.fetchPulls.mockResolvedValue([
      { number: 1, state: 'closed', created_at: '2026-01-01T00:00:00Z', merged_at: '2026-01-02T00:00:00Z' },
    ])
    github.fetchRateLimit.mockResolvedValue(null)

    cache.loadAnalysis.mockResolvedValue(null)
    cache.saveAnalysis.mockResolvedValue(undefined)
  })

  it('drops the pull request data collected for the previous organizations', async () => {
    await act(async () => {
      render(<AppProvider><Probe /></AppProvider>)
    })

    await act(async () => { await ctx.explore(['org-a']) })
    await act(async () => { await ctx.runAdvanceAnalytics() })

    expect(Object.keys(ctx.pullsData)).toEqual(['org-a/org-a-repo'])

    await act(async () => { await ctx.explore(['org-b']) })

    // A new analysis must not carry org-a's pull requests over to org-b:
    // the Analytics page renders whatever is in pullsData under the new org
    // and hides "Collect Advanced Metrics" while it is non-empty.
    expect(ctx.pullsData).toEqual({})
  })
})
