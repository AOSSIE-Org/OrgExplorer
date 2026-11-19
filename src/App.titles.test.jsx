import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter, useNavigate } from 'react-router-dom'
import App from './App'

const analysis = vi.hoisted(() => ({ model: {}, loading: false, hydrating: false }))

// Exercise the real App routes and guard without fetching organisation data
// or rendering charts and other unrelated page content.
vi.mock('./context/AppContext', () => ({
  AppProvider: ({ children }) => children,
  useApp: () => analysis,
}))
vi.mock('./context/ThemeContext', () => ({ ThemeProvider: ({ children }) => children }))
vi.mock('./components/Navbar', () => ({ default: () => null }))
vi.mock('./components/RateLimitBanner', () => ({ default: () => null }))
vi.mock('./components/layout/Footer', () => ({ default: () => null }))
vi.mock('./pages/HomePage', () => ({ default: () => <h1>Home</h1> }))
vi.mock('./pages/OverviewPage', () => ({ default: () => null }))
vi.mock('./pages/RepositoriesPage', () => ({ default: () => null }))
vi.mock('./pages/ContributorsPage', () => ({ default: () => null }))
vi.mock('./pages/ContributorProfilePage', () => ({ default: () => null }))
vi.mock('./pages/NetworkPage', () => ({ default: () => null }))
vi.mock('./pages/AnalyticsPage', () => ({ default: () => null }))
vi.mock('./pages/GovernancePage', () => ({ default: () => null }))
vi.mock('./pages/SettingsPage', () => ({ default: () => null }))
vi.mock('./pages/Support', () => ({ default: () => null }))
vi.mock('./pages/NotFoundPage', () => ({ default: () => <h1>Not found</h1> }))

function Navigation() {
  const navigate = useNavigate()
  return <>
    <Link to="/contributors/octocat">Octocat</Link>
    <Link to="/contributors/hubot">Hubot</Link>
    <button onClick={() => navigate(-1)}>Back</button>
    <button onClick={() => navigate(1)}>Forward</button>
  </>
}

function renderRoute(path) {
  return render(<MemoryRouter initialEntries={[path]}><Navigation /><App /></MemoryRouter>)
}

describe('App document titles', () => {
  let originalTitle

  beforeEach(() => {
    originalTitle = document.title
    document.title = 'OrgExplorer — GitHub Organization Analytics & Repository Insights'
    analysis.model = {}
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => {
    document.title = originalTitle
    vi.restoreAllMocks()
  })

  it.each([
    ['/', 'OrgExplorer — Home'],
    ['/overview', 'Overview — OrgExplorer'],
    ['/repositories', 'Repositories — OrgExplorer'],
    ['/contributors', 'Contributors — OrgExplorer'],
    ['/contributors/octocat', 'octocat — Contributor Profile — OrgExplorer'],
    ['/network', 'Network Graph — OrgExplorer'],
    ['/analytics', 'Analytics — OrgExplorer'],
    ['/governance', 'Governance Audit — OrgExplorer'],
    ['/settings', 'Settings — OrgExplorer'],
    ['/support-us', 'Support Us — OrgExplorer'],
    ['/missing', '404 Not Found — OrgExplorer'],
    ['/settings/?tab=token#help', 'Settings — OrgExplorer'],
    ['/SETTINGS', 'Settings — OrgExplorer'],
    ['/contributors/%6Fctocat', 'octocat — Contributor Profile — OrgExplorer'],
  ])('sets the title for %s', (path, title) => {
    renderRoute(path)
    expect(document.title).toBe(title)
  })

  it.each(['/settings/extra', '/contributors/octocat/extra'])('uses the 404 title for %s', (path) => {
    renderRoute(path)
    expect(screen.getByRole('heading', { name: 'Not found' })).toBeInTheDocument()
    expect(document.title).toBe('404 Not Found — OrgExplorer')
  })

  it('updates the title between profiles and when navigating back and forward', () => {
    renderRoute('/settings')
    fireEvent.click(screen.getByRole('link', { name: 'Octocat' }))
    expect(document.title).toBe('octocat — Contributor Profile — OrgExplorer')
    fireEvent.click(screen.getByRole('link', { name: 'Hubot' }))
    expect(document.title).toBe('hubot — Contributor Profile — OrgExplorer')
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(document.title).toBe('octocat — Contributor Profile — OrgExplorer')
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(document.title).toBe('Settings — OrgExplorer')
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }))
    expect(document.title).toBe('octocat — Contributor Profile — OrgExplorer')
  })

  it('uses the Home title after the analysis guard redirects', async () => {
    analysis.model = null
    renderRoute('/overview')
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('OrgExplorer — Home'))
  })
})
