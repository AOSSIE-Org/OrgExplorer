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
      expect(fetchUrls.length).toBeGreaterThanOrEqual(4) // 2 calls per org (issues + merged PRs)
    })

    // Confirm queries are separated per organization (e.g. org:OrgA, org:OrgB) and not concatenated as org:OrgA+org:OrgB
    expect(fetchUrls.some(u => u.includes('org:OrgA') && !u.includes('org:OrgB'))).toBe(true)
    expect(fetchUrls.some(u => u.includes('org:OrgB') && !u.includes('org:OrgA'))).toBe(true)
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
})
