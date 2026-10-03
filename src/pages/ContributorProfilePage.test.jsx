import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ContributorProfilePage from './ContributorProfilePage'

const app = vi.hoisted(() => ({
  state: {
    orgs: [{ login: 'AOSSIE-Org' }],
    pat: '',
    pullsData: {},
    model: {
      contributors: [{ login: 'testuser', orgs: ['AOSSIE-Org'] }],
    },
  },
}))

vi.mock('../context/AppContext', () => ({ useApp: () => app.state }))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="chart-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

function renderPage(username = 'testuser') {
  return render(
    <MemoryRouter initialEntries={[`/contributors/${username}`]}>
      <Routes>
        <Route path="/contributors/:username" element={<ContributorProfilePage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ContributorProfilePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    app.state = {
      orgs: [{ login: 'AOSSIE-Org' }],
      pat: '',
      pullsData: {},
      model: {
        contributors: [{ login: 'testuser', orgs: ['AOSSIE-Org'] }],
      },
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows error immediately for invalid username without making network calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    renderPage('undefined')

    expect(await screen.findByText('Invalid contributor username.')).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('queries organizations individually to avoid multi-org search 422 errors', async () => {
    app.state.orgs = [{ login: 'OrgA' }, { login: 'OrgB' }]
    app.state.model.contributors = [{ login: 'testuser', orgs: ['OrgA', 'OrgB'] }]

    const fetchUrls = []
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      fetchUrls.push(url.toString())
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ items: [] }),
      }
    })

    renderPage('testuser')

    await waitFor(() => {
      expect(fetchUrls.length).toBe(4) // Exactly 2 calls per org (issues + merged PRs)
    })

    const orgAIssues = fetchUrls.filter(u => u.includes('author:testuser+org:OrgA') && !u.includes('is:merged'))
    const orgAMerged = fetchUrls.filter(u => u.includes('author:testuser+is:pr+is:merged+org:OrgA'))
    const orgBIssues = fetchUrls.filter(u => u.includes('author:testuser+org:OrgB') && !u.includes('is:merged'))
    const orgBMerged = fetchUrls.filter(u => u.includes('author:testuser+is:pr+is:merged+org:OrgB'))

    expect(orgAIssues).toHaveLength(1)
    expect(orgAMerged).toHaveLength(1)
    expect(orgBIssues).toHaveLength(1)
    expect(orgBMerged).toHaveLength(1)
    expect(fetchUrls.some(u => u.includes('org:OrgA+org:OrgB'))).toBe(false)
  })

  it('surfaces specific error message from GitHub API response when 422 occurs', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: false,
        status: 422,
        headers: new Headers(),
        json: async () => ({
          message: 'Validation Failed',
          errors: [{ message: 'The listed users and repositories cannot be searched.' }],
        }),
      }
    })

    renderPage('testuser')

    expect(
      await screen.findByText(/The listed users and repositories cannot be searched/i)
    ).toBeInTheDocument()
  })

  it('retains authored contributions when merged-PR query fails', async () => {
    app.state.orgs = [{ login: 'OrgA' }]
    app.state.model.contributors = [{ login: 'testuser', orgs: ['OrgA'] }]

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const urlStr = url.toString()
      if (urlStr.includes('is:merged')) {
        return {
          ok: false,
          status: 500,
          headers: new Headers(),
          json: async () => ({ message: 'Server error on merged query' }),
        }
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          items: [{
            id: 101,
            number: 1,
            title: 'Sample Issue',
            state: 'open',
            pull_request: {},
            created_at: new Date().toISOString(),
            repository_url: 'https://api.github.com/repos/OrgA/repo1',
            html_url: 'https://github.com/OrgA/repo1/pull/1',
          }],
        }),
      }
    })

    renderPage('testuser')

    expect(await screen.findByText(/Sample Issue/i)).toBeInTheDocument()
    expect(await screen.findByText(/merged PR status incomplete/i)).toBeInTheDocument()
  })

  it('renders partial failure warning when one organization fails and another succeeds', async () => {
    app.state.orgs = [{ login: 'OrgA' }, { login: 'OrgB' }]
    app.state.model.contributors = [{ login: 'testuser', orgs: ['OrgA', 'OrgB'] }]

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const urlStr = url.toString()
      if (urlStr.includes('org:OrgB')) {
        return {
          ok: false,
          status: 404,
          headers: new Headers(),
          json: async () => ({ message: 'OrgB not found' }),
        }
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          items: [{
            id: 202,
            number: 2,
            title: 'OrgA PR',
            state: 'open',
            pull_request: {},
            created_at: new Date().toISOString(),
            repository_url: 'https://api.github.com/repos/OrgA/repo1',
            html_url: 'https://github.com/OrgA/repo1/pull/2',
          }],
        }),
      }
    })

    renderPage('testuser')

    expect(await screen.findByText(/OrgA PR/i)).toBeInTheDocument()
    expect(await screen.findByText(/Partial results loaded.*OrgB/i)).toBeInTheDocument()
  })
})
