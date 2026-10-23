import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { AppProvider, useApp } from './AppContext'
import * as github from '../services/github'

vi.mock('../services/cache', () => ({
  loadAnalysis: vi.fn().mockResolvedValue(null),
  saveAnalysis: vi.fn().mockResolvedValue(true),
}))

vi.mock('../services/github', () => ({
  fetchOrg: vi.fn(),
  fetchRepos: vi.fn(),
  fetchContributors: vi.fn(),
  fetchIssues: vi.fn(),
  fetchRateLimit: vi.fn(),
  fetchPulls: vi.fn(),
}))

function TestExplorer({ orgs = ['test-org'] }) {
  const { explore, error, loading, model, isComplete } = useApp()
  return (
    <div>
      <button onClick={() => explore(orgs)}>Explore</button>
      {loading && <span data-testid="loading">Loading...</span>}
      {error && <span data-testid="error-message">{error}</span>}
      {model && <span data-testid="model-loaded">Model Loaded</span>}
      {isComplete && <span data-testid="is-complete">Complete</span>}
    </div>
  )
}

describe('AppContext explore rate-limit and error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('reports actionable error naming the organization when repository fetch fails with an unexpected error', async () => {
    github.fetchOrg.mockResolvedValue({ login: 'AOSSIE-Org', public_repos: 5 })
    github.fetchRepos.mockRejectedValue(new Error('HTTP_500'))

    render(
      <AppProvider>
        <TestExplorer orgs={['AOSSIE-Org']} />
      </AppProvider>
    )

    await act(async () => {
      screen.getByText('Explore').click()
    })

    const errorEl = await screen.findByTestId('error-message')
    expect(errorEl.textContent).toBe('Could not fetch repositories for AOSSIE-Org. Please try again.')
    expect(screen.queryByTestId('model-loaded')).not.toBeInTheDocument()
    expect(screen.queryByTestId('is-complete')).not.toBeInTheDocument()
  })

  it('names only the failed organizations in a multi-org exploration', async () => {
    github.fetchOrg.mockImplementation(async login => ({ login, public_repos: 1 }))
    github.fetchRepos.mockImplementation(async login => {
      if (login === 'org-b') throw new Error('Network error: connection reset')
      return [{ name: 'repo-1', stargazers_count: 2, forks_count: 1, open_issues_count: 0 }]
    })

    render(
      <AppProvider>
        <TestExplorer orgs={['org-a', 'org-b']} />
      </AppProvider>
    )

    await act(async () => {
      screen.getByText('Explore').click()
    })

    const errorEl = await screen.findByTestId('error-message')
    expect(errorEl.textContent).toBe('Could not fetch repositories for org-b. Please try again.')
    expect(screen.queryByTestId('model-loaded')).not.toBeInTheDocument()
  })

  it('clears previous complete status when a subsequent exploration fails', async () => {
    localStorage.setItem('oe_pat', 'test-pat-token')
    github.fetchOrg.mockResolvedValue({ login: 'org-a', public_repos: 1 })
    github.fetchRepos.mockResolvedValue([{ name: 'repo-1', stargazers_count: 2, forks_count: 1, open_issues_count: 0 }])
    github.fetchContributors.mockResolvedValue([{ login: 'dev1', contributions: 5 }])

    const { rerender } = render(
      <AppProvider>
        <TestExplorer orgs={['org-a']} />
      </AppProvider>
    )

    await act(async () => {
      screen.getByText('Explore').click()
    })

    expect(await screen.findByTestId('is-complete')).toBeInTheDocument()

    // Second exploration fails
    github.fetchOrg.mockResolvedValue({ login: 'org-b', public_repos: 1 })
    github.fetchRepos.mockRejectedValue(new Error('HTTP_500'))

    rerender(
      <AppProvider>
        <TestExplorer orgs={['org-b']} />
      </AppProvider>
    )

    await act(async () => {
      screen.getByText('Explore').click()
    })

    expect(await screen.findByTestId('error-message')).toBeInTheDocument()
    expect(screen.queryByTestId('is-complete')).not.toBeInTheDocument()
    expect(screen.queryByTestId('model-loaded')).not.toBeInTheDocument()
  })
})
