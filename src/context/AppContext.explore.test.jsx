import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import React from 'react'
import { AppProvider, useApp } from './AppContext'
import * as github from '../services/github'
import * as cache from '../services/cache'
import { resetScopeCache } from '../services/authScope'

vi.mock('../services/authScope', async importOriginal => ({
  ...(await importOriginal()),
  resetScopeCache: vi.fn(),
}))

vi.mock('../services/cache', () => ({
  loadAnalysis: vi.fn().mockResolvedValue(null),
  saveAnalysis: vi.fn().mockResolvedValue(true),
  clearAnalysis: vi.fn().mockResolvedValue(true),
}))

vi.mock('../services/github', () => ({
  fetchOrg: vi.fn(),
  fetchRepos: vi.fn(),
  fetchContributors: vi.fn(),
  fetchIssues: vi.fn(),
  fetchRateLimit: vi.fn(),
  fetchPulls: vi.fn(),
  cacheClear: vi.fn().mockResolvedValue(true),
}))

function TestExplorer() {
  const { explore, error, loading, model, savePat } = useApp()
  return (
    <div>
      <button onClick={() => explore(['test-org'])}>Explore</button>
      <button onClick={() => savePat('new-pat-token')}>Set PAT</button>
      <button onClick={() => savePat('')}>Delete PAT</button>
      {loading && <span data-testid="loading">Loading...</span>}
      {error && <span data-testid="error-message">{error}</span>}
      {model && <span data-testid="model-loaded">Model Loaded</span>}
    </div>
  )
}

function TestAnalytics() {
  const { hydrating, runGovernanceAnalysis, issuesData } = useApp()
  return (
    <div>
      <button onClick={() => runGovernanceAnalysis()}>Run Governance</button>
      {hydrating && <span data-testid="hydrating">Hydrating</span>}
      <span data-testid="issues-loaded">{Object.keys(issuesData).length}</span>
    </div>
  )
}

describe('AppContext explore rate-limit and error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cache.loadAnalysis.mockResolvedValue(null)
    localStorage.clear()
  })

  it('correctly reports rate limit error instead of "No valid organizations found" when fetchOrg hits rate limit', async () => {
    github.fetchOrg.mockRejectedValue(new Error('RATE_LIMIT'))

    render(
      <AppProvider>
        <TestExplorer />
      </AppProvider>
    )

    await act(async () => {
      screen.getByText('Explore').click()
    })

    const errorEl = await screen.findByTestId('error-message')
    expect(errorEl.textContent).toBe('GitHub API rate limit reached. Add a PAT in Settings for 5,000 req/hr.')
    expect(errorEl.textContent).not.toBe('No valid organizations found. Check the names and try again.')
    expect(screen.queryByTestId('model-loaded')).not.toBeInTheDocument()
  })

  it('shows actionable refresh rate limit message when PAT is configured', async () => {
    localStorage.setItem('oe_pat', 'test-pat-token')
    github.fetchOrg.mockRejectedValue(new Error('RATE_LIMIT'))

    render(
      <AppProvider>
        <TestExplorer />
      </AppProvider>
    )

    await act(async () => {
      screen.getByText('Explore').click()
    })

    const errorEl = await screen.findByTestId('error-message')
    expect(errorEl.textContent).toBe('GitHub API rate limit reached. Please wait for your quota to refresh.')
    expect(screen.queryByTestId('model-loaded')).not.toBeInTheDocument()
  })

  it('reports "No valid organizations found" when organization truly does not exist (NOT_FOUND)', async () => {
    github.fetchOrg.mockRejectedValue(new Error('NOT_FOUND'))

    render(
      <AppProvider>
        <TestExplorer />
      </AppProvider>
    )

    await act(async () => {
      screen.getByText('Explore').click()
    })

    const errorEl = await screen.findByTestId('error-message')
    expect(errorEl.textContent).toBe('No valid organizations found. Check the names and try again.')
    expect(screen.queryByTestId('model-loaded')).not.toBeInTheDocument()
  })

  it('propagates unexpected API failures instead of masking as "No valid organizations found"', async () => {
    github.fetchOrg.mockRejectedValue(new Error('Network error: connection reset'))

    render(
      <AppProvider>
        <TestExplorer />
      </AppProvider>
    )

    await act(async () => {
      screen.getByText('Explore').click()
    })

    const errorEl = await screen.findByTestId('error-message')
    expect(errorEl.textContent).toBe('Network error: connection reset')
    expect(errorEl.textContent).not.toBe('No valid organizations found. Check the names and try again.')
    expect(screen.queryByTestId('model-loaded')).not.toBeInTheDocument()
  })

  it('reports rate limit error when fetchRepos hits rate limit', async () => {
    github.fetchOrg.mockResolvedValue({ login: 'test-org', public_repos: 1 })
    github.fetchRepos.mockRejectedValue(new Error('RATE_LIMIT'))

    render(
      <AppProvider>
        <TestExplorer />
      </AppProvider>
    )

    await act(async () => {
      screen.getByText('Explore').click()
    })

    const errorEl = await screen.findByTestId('error-message')
    expect(errorEl.textContent).toBe('GitHub API rate limit reached. Add a PAT in Settings for 5,000 req/hr.')
    expect(screen.queryByTestId('model-loaded')).not.toBeInTheDocument()
  })

  it('reports rate limit error and does not load a model when fetchContributors hits rate limit', async () => {
    github.fetchOrg.mockResolvedValue({ login: 'test-org', public_repos: 1 })
    github.fetchRepos.mockResolvedValue([{ name: 'test-repo' }])
    github.fetchContributors.mockRejectedValue(new Error('RATE_LIMIT'))

    render(
      <AppProvider>
        <TestExplorer />
      </AppProvider>
    )

    await act(async () => {
      screen.getByText('Explore').click()
    })

    const errorEl = await screen.findByTestId('error-message')
    expect(errorEl.textContent).toBe('GitHub API rate limit reached. Add a PAT in Settings for 5,000 req/hr.')
    expect(screen.queryByTestId('model-loaded')).not.toBeInTheDocument()
  })

  it('successfully loads analytical model for a valid organization search', async () => {
    github.fetchOrg.mockResolvedValue({ login: 'test-org', public_repos: 1 })
    github.fetchRepos.mockResolvedValue([{ name: 'test-repo', stargazers_count: 5, forks_count: 2, open_issues_count: 1 }])
    github.fetchContributors.mockResolvedValue([{ login: 'dev1', contributions: 10 }])

    render(
      <AppProvider>
        <TestExplorer />
      </AppProvider>
    )

    await act(async () => {
      screen.getByText('Explore').click()
    })

    expect(await screen.findByTestId('model-loaded')).toBeInTheDocument()
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument()
  })

  it('clears cached data and the current analysis when the PAT changes', async () => {
    github.fetchOrg.mockResolvedValue({ login: 'test-org', public_repos: 1 })
    github.fetchRepos.mockResolvedValue([{ name: 'test-repo', stargazers_count: 5, forks_count: 2, open_issues_count: 1 }])
    github.fetchContributors.mockResolvedValue([{ login: 'dev1', contributions: 10 }])
    github.fetchRateLimit.mockResolvedValue(null)

    render(
      <AppProvider>
        <TestExplorer />
      </AppProvider>
    )

    await act(async () => {
      screen.getByText('Explore').click()
    })
    expect(await screen.findByTestId('model-loaded')).toBeInTheDocument()

    await act(async () => {
      screen.getByText('Set PAT').click()
    })

    await waitFor(() => {
      expect(github.cacheClear).toHaveBeenCalledTimes(1)
      expect(cache.clearAnalysis).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByTestId('model-loaded')).not.toBeInTheDocument()
    expect(localStorage.getItem('oe_pat')).toBe('new-pat-token')
    expect(resetScopeCache).toHaveBeenCalledTimes(1)
  })

  it('does not clear caches when saving the same PAT again', async () => {
    localStorage.setItem('oe_pat', 'new-pat-token')
    github.fetchRateLimit.mockResolvedValue(null)

    render(
      <AppProvider>
        <TestExplorer />
      </AppProvider>
    )

    await act(async () => {
      screen.getByText('Set PAT').click()
    })

    expect(github.cacheClear).not.toHaveBeenCalled()
    expect(cache.clearAnalysis).not.toHaveBeenCalled()
    expect(resetScopeCache).not.toHaveBeenCalled()
  })

  it('clears cached data when the PAT is deleted', async () => {
    localStorage.setItem('oe_pat', 'saved-pat-token')
    github.fetchRateLimit.mockResolvedValue(null)

    render(
      <AppProvider>
        <TestExplorer />
      </AppProvider>
    )

    await act(async () => {
      screen.getByText('Delete PAT').click()
    })

    await waitFor(() => {
      expect(github.cacheClear).toHaveBeenCalledTimes(1)
      expect(cache.clearAnalysis).toHaveBeenCalledTimes(1)
    })
    expect(localStorage.getItem('oe_pat')).toBeNull()
  })

  it('runs a complete governance analysis when restoring an incomplete cached model', async () => {
    localStorage.setItem('oe_pat', 'test-pat-token')
    cache.loadAnalysis.mockResolvedValue({
      model: {
        allRepos: [{ orgLogin: 'test-org', name: 'test-repo' }],
        contributors: [],
        totalRepos: [{ orgLogin: 'test-org', name: 'test-repo' }],
      },
      lastOrgNames: ['test-org'],
      isComplete: false,
      totalRepo: 1,
    })
    github.fetchRateLimit.mockResolvedValue(null)
    github.fetchOrg.mockResolvedValue({ login: 'test-org', public_repos: 1 })
    github.fetchRepos.mockResolvedValue([{ name: 'test-repo', stargazers_count: 5, forks_count: 2, open_issues_count: 1 }])
    github.fetchContributors.mockResolvedValue([{ login: 'dev1', contributions: 10 }])
    github.fetchIssues.mockResolvedValue([{ id: 1 }])

    render(
      <AppProvider>
        <TestAnalytics />
      </AppProvider>
    )

    await waitFor(() => {
      expect(screen.queryByTestId('hydrating')).not.toBeInTheDocument()
    })

    await act(async () => {
      screen.getByText('Run Governance').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('issues-loaded').textContent).toBe('1')
    })
    expect(github.fetchIssues).toHaveBeenCalledTimes(1)
  })

  it('discards in-flight explore results if the PAT is deleted before explore completes', async () => {
    localStorage.setItem('oe_pat', 'test-pat-token')
    let resolveOrg
    github.fetchOrg.mockReturnValue(new Promise(res => { resolveOrg = res }))
    github.fetchRateLimit.mockResolvedValue(null)

    render(
      <AppProvider>
        <TestExplorer />
      </AppProvider>
    )

    // Start explore while PAT is active
    act(() => {
      screen.getByText('Explore').click()
    })
    expect(screen.getByTestId('loading')).toBeInTheDocument()

    // Delete PAT while explore is in flight
    await act(async () => {
      screen.getByText('Delete PAT').click()
    })
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument()

    // Now resolve the pending org fetch
    await act(async () => {
      resolveOrg({ login: 'test-org', public_repos: 0 })
    })

    // Model must not be loaded since explore was superseded by PAT deletion
    expect(screen.queryByTestId('model-loaded')).not.toBeInTheDocument()
    expect(localStorage.getItem('oe_pat')).toBeNull()
  })
})
