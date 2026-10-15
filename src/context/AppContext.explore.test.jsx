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
    localStorage.setItem('oe_recent', '{invalid json')
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
    expect(JSON.parse(localStorage.getItem('oe_recent'))).toEqual(['test-org'])
  })

  it('loads the model when saving recent searches to localStorage fails', async () => {
    const originalSetItem = Storage.prototype.setItem
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'oe_recent') {
        throw new Error('Storage unavailable')
      }
      return originalSetItem.call(this, key, value)
    })
    github.fetchOrg.mockResolvedValue({ login: 'test-org', public_repos: 1 })
    github.fetchRepos.mockResolvedValue([{ name: 'test-repo', stargazers_count: 5, forks_count: 2, open_issues_count: 1 }])
    github.fetchContributors.mockResolvedValue([{ login: 'dev1', contributions: 10 }])

    try {
      localStorage.setItem('oe_other', 'value')
      expect(localStorage.getItem('oe_other')).toBe('value')

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
    } finally {
      setItemSpy.mockRestore()
    }
  })

  it('keeps valid recent searches ordered, deduplicated, and limited to six entries', async () => {
    localStorage.setItem('oe_recent', JSON.stringify([
      'older-one',
      'TEST-ORG',
      'older-two',
      'older-three',
      'older-four',
      'older-five',
      'older-six',
    ]))
    github.fetchOrg.mockResolvedValue({ login: 'test-org', public_repos: 0 })
    github.fetchRepos.mockResolvedValue([])
    github.fetchContributors.mockResolvedValue([])

    render(
      <AppProvider>
        <TestExplorer />
      </AppProvider>
    )

    await act(async () => {
      screen.getByText('Explore').click()
    })

    expect(await screen.findByTestId('model-loaded')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('oe_recent'))).toEqual([
      'test-org',
      'older-one',
      'older-two',
      'older-three',
      'older-four',
      'older-five',
    ])
  })
})
