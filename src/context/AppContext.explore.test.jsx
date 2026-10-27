import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act,waitFor} from '@testing-library/react'
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

  it('limits contributor concurrency to five and waits for each batch to settle', async () => {
    localStorage.setItem('oe_pat', 'test-pat-token');

    const repos = Array.from({ length: 12 }, (_, i) => ({
      name: `test-repo-${i + 1}`,
      stargazers_count: 5,
      forks_count: 2,
      open_issues_count: 1,
    }));

    github.fetchOrg.mockResolvedValue({
      login: 'test-org',
      public_repos: repos.length,
    });
    github.fetchRepos.mockResolvedValue(repos);

    let activeRequests = 0;
    let maxConcurrentRequests = 0;
    let nextBatchStartedTooEarly = false;
    const pendingRequests = [];

    github.fetchContributors.mockImplementation(() => {
      const requestNumber = pendingRequests.length;

      // The second batch must not start while the first batch is active.
      if (requestNumber === 5 && activeRequests !== 0) {
        nextBatchStartedTooEarly = true;
      }

      activeRequests += 1;
      maxConcurrentRequests = Math.max(
        maxConcurrentRequests,
        activeRequests
      );

      return new Promise(resolve => {
        pendingRequests.push({
          resolve: contributors => {
            activeRequests -= 1;
            resolve(contributors);
          },
        });
      });
    });

    render(
      <AppProvider>
        <TestExplorer />
      </AppProvider>
    );

    await act(async () => {
      screen.getByText('Explore').click();
    });

    // The first batch should contain exactly five requests.
    await waitFor(() => {
      expect(github.fetchContributors).toHaveBeenCalledTimes(5);
    });

    expect(activeRequests).toBe(5);

    // Complete the first batch, allowing the second batch to begin.
    await act(async () => {
      pendingRequests.slice(0, 5).forEach(request => {
        request.resolve([]);
      });
    });

    await waitFor(() => {
      expect(github.fetchContributors).toHaveBeenCalledTimes(10);
    });

    expect(nextBatchStartedTooEarly).toBe(false);
    expect(activeRequests).toBe(5);

    // Complete the second batch, allowing the final two requests to begin.
    await act(async () => {
      pendingRequests.slice(5, 10).forEach(request => {
        request.resolve([]);
      });
    });

    await waitFor(() => {
      expect(github.fetchContributors).toHaveBeenCalledTimes(12);
    });

    expect(nextBatchStartedTooEarly).toBe(false);
    expect(activeRequests).toBe(2);

    // Complete the final batch.
    await act(async () => {
      pendingRequests.slice(10, 12).forEach(request => {
        request.resolve([]);
      });
    });

    expect(await screen.findByTestId('model-loaded')).toBeInTheDocument();
    expect(github.fetchContributors).toHaveBeenCalledTimes(12);
    expect(maxConcurrentRequests).toBe(5);
    expect(activeRequests).toBe(0);
    expect(nextBatchStartedTooEarly).toBe(false);
  });

})
