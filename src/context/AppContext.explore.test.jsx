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

describe('AppContext explore rate-limit handling', () => {
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
  })
})
