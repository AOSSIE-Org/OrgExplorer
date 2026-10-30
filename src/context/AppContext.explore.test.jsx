import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
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

function TestExplorer() {
  const { explore, error, loading, model } = useApp()
  return (
    <div>
      <button onClick={() => explore(['test-org'])}>Explore</button>
      {loading && <span data-testid="loading">Loading...</span>}
      {error && <span data-testid="error-message">{error}</span>}
      {model && <span data-testid="model-loaded">Model Loaded</span>}
    </div>
  )
}

function PipelineHarness() {
  const {
    explore, runAudit, runFullAnalytics, model, totalRepo, issuesData,
    pullsData, error, loading, govLoading, advanceAnalyticsLoading
  } = useApp()

  return (
    <div>
      <button onClick={() => explore(['org-a'])}>Explore A</button>
      <button onClick={() => explore(['org-b'])}>Explore B</button>
      <button onClick={() => runAudit()}>Run audit</button>
      <button onClick={() => runFullAnalytics()}>Run full analytics</button>
      <span data-testid="model-org">{model?.allRepos?.[0]?.orgLogin || 'none'}</span>
      <span data-testid="total-repo">{totalRepo}</span>
      <span data-testid="issues-count">{Object.keys(issuesData || {}).length}</span>
      <span data-testid="pulls-count">{Object.keys(pullsData || {}).length}</span>
      <span data-testid="error-message">{error}</span>
      {loading && <span data-testid="loading">Loading...</span>}
      {govLoading && <span data-testid="gov-loading">Audit running...</span>}
      {advanceAnalyticsLoading && <span data-testid="adv-loading">Analytics running...</span>}
    </div>
  )
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const flushPromises = () => act(async () => {
  await new Promise(resolve => setTimeout(resolve, 0))
})

function repoFor(org) {
  return {
    name: `repo-${org}`,
    stargazers_count: 1,
    forks_count: 1,
    watchers_count: 0,
    open_issues_count: 0,
    pushed_at: '2026-01-01T00:00:00.000Z'
  }
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
})

describe('pipeline cancellation and stale state guarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('keeps the newest model when a superseded search resolves late', async () => {
    const oldOrg = deferred()
    const signals = {}

    github.fetchOrg.mockImplementation((name, _pat, signal) => {
      signals[name] = signal
      return name === 'org-a'
        ? oldOrg.promise
        : Promise.resolve({ login: name, public_repos: 1 })
    })
    github.fetchRepos.mockImplementation(org => Promise.resolve([repoFor(org)]))
    github.fetchContributors.mockResolvedValue([{ login: 'dev1', contributions: 1 }])

    render(
      <AppProvider>
        <PipelineHarness />
      </AppProvider>
    )

    await act(async () => { screen.getByText('Explore A').click() })
    await act(async () => { screen.getByText('Explore B').click() })

    await waitFor(() => expect(screen.getByTestId('model-org')).toHaveTextContent('org-b'))
    expect(signals['org-a'].aborted).toBe(true)
    expect(signals['org-b'].aborted).toBe(false)

    // The old request ignores the abort and resolves anyway. Its generation
    // guard must stop it before it can fetch repos or touch shared state.
    await act(async () => {
      oldOrg.resolve({ login: 'org-a', public_repos: 1 })
    })
    await flushPromises()

    expect(screen.getByTestId('model-org')).toHaveTextContent('org-b')
    expect(screen.getByTestId('total-repo')).toHaveTextContent('1')
    expect(github.fetchRepos.mock.calls.map(call => call[0])).toEqual(['org-b'])
    expect(screen.getByTestId('error-message')).toHaveTextContent('')
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
  })

  it('does not let a superseded failure overwrite the active model or show an error', async () => {
    const oldOrg = deferred()

    github.fetchOrg.mockImplementation(name =>
      name === 'org-a'
        ? oldOrg.promise
        : Promise.resolve({ login: name, public_repos: 1 })
    )
    github.fetchRepos.mockImplementation(org => Promise.resolve([repoFor(org)]))
    github.fetchContributors.mockResolvedValue([{ login: 'dev1', contributions: 1 }])

    render(
      <AppProvider>
        <PipelineHarness />
      </AppProvider>
    )

    await act(async () => { screen.getByText('Explore A').click() })
    await act(async () => { screen.getByText('Explore B').click() })
    await waitFor(() => expect(screen.getByTestId('model-org')).toHaveTextContent('org-b'))

    await act(async () => {
      oldOrg.reject(new Error('network down'))
    })
    await flushPromises()

    expect(screen.getByTestId('model-org')).toHaveTextContent('org-b')
    expect(screen.getByTestId('error-message')).toHaveTextContent('')
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
  })

  it('cancels a running audit and ignores its late issues after a new search', async () => {
    const oldIssues = deferred()
    let auditSignal

    github.fetchOrg.mockImplementation(name =>
      Promise.resolve({ login: name, public_repos: 1 })
    )
    github.fetchRepos.mockImplementation(org => Promise.resolve([repoFor(org)]))
    github.fetchContributors.mockResolvedValue([{ login: 'dev1', contributions: 1 }])
    github.fetchIssues.mockImplementation((_org, _repo, _pat, signal) => {
      auditSignal = signal
      return oldIssues.promise
    })

    render(
      <AppProvider>
        <PipelineHarness />
      </AppProvider>
    )

    await act(async () => { screen.getByText('Explore A').click() })
    await waitFor(() => expect(screen.getByTestId('model-org')).toHaveTextContent('org-a'))

    await act(async () => { screen.getByText('Run audit').click() })
    await waitFor(() => expect(screen.getByTestId('gov-loading')).toBeInTheDocument())
    expect(auditSignal.aborted).toBe(false)

    await act(async () => { screen.getByText('Explore B').click() })
    await waitFor(() => expect(screen.getByTestId('model-org')).toHaveTextContent('org-b'))

    expect(auditSignal.aborted).toBe(true)
    expect(screen.queryByTestId('gov-loading')).not.toBeInTheDocument()
    expect(screen.getByTestId('issues-count')).toHaveTextContent('0')

    await act(async () => {
      oldIssues.resolve([{ number: 1, state: 'open', updated_at: '2026-01-01T00:00:00.000Z' }])
    })
    await flushPromises()

    expect(screen.getByTestId('model-org')).toHaveTextContent('org-b')
    expect(screen.getByTestId('issues-count')).toHaveTextContent('0')
    expect(screen.getByTestId('error-message')).toHaveTextContent('')
  })

  it('runs explore, issues and pulls in one full-analytics session without aborting itself', async () => {
    github.fetchOrg.mockImplementation(name =>
      Promise.resolve({ login: name, public_repos: 1 })
    )
    github.fetchRepos.mockImplementation(org => Promise.resolve([repoFor(org)]))
    github.fetchContributors.mockResolvedValue([{ login: 'dev1', contributions: 1 }])
    github.fetchIssues.mockResolvedValue([
      { number: 1, state: 'open', updated_at: '2026-01-01T00:00:00.000Z' }
    ])
    github.fetchPulls.mockResolvedValue([
      { number: 2, state: 'open', created_at: '2026-01-01T00:00:00.000Z', merged_at: null, closed_at: null }
    ])

    render(
      <AppProvider>
        <PipelineHarness />
      </AppProvider>
    )

    await act(async () => { screen.getByText('Explore A').click() })
    await waitFor(() => expect(screen.getByTestId('model-org')).toHaveTextContent('org-a'))

    await act(async () => { screen.getByText('Run full analytics').click() })

    await waitFor(() => expect(screen.getByTestId('issues-count')).toHaveTextContent('1'))
    await waitFor(() => expect(screen.getByTestId('pulls-count')).toHaveTextContent('1'))

    expect(screen.getByTestId('model-org')).toHaveTextContent('org-a')
    expect(screen.getByTestId('error-message')).toHaveTextContent('')
    expect(screen.queryByTestId('gov-loading')).not.toBeInTheDocument()
    expect(screen.queryByTestId('adv-loading')).not.toBeInTheDocument()
  })
})
