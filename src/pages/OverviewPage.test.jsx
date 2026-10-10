import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import OverviewPage from './OverviewPage'

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    orgs: [
      {
        login: 'testorg',
        name: 'Test Org',
        avatar_url: '',
        description: 'desc',
        html_url: '',
      },
    ],
    model: { totalRepos: [] },
    totalRepo: 0,
    isComplete: true,
    loading: false,
    runFullExplore: vi.fn(),
  }),
}))

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}))

vi.mock('../components/AnalysisBanner', () => ({
  default: () => <div data-testid="analysis-banner" />,
}))

vi.mock('../components/SocialShareButton', () => ({
  default: () => <div data-testid="social-share" />,
}))

const NAV_LINKS = [
  { name: 'View Repositories', href: '/repositories' },
  { name: 'View Contributors', href: '/contributors' },
  { name: 'View Network Graph', href: '/network' },
  { name: 'View Analytics', href: '/analytics' },
  { name: 'View Governance', href: '/governance' },
  { name: 'View Settings', href: '/settings' },
]

function renderOverview(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <OverviewPage />
    </MemoryRouter>
  )
}

function renderOverviewWithRoutes(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/repositories" element={<div>Repos page</div>} />
        <Route path="/contributors" element={<div>Contributors page</div>} />
        <Route path="/network" element={<div>Network page</div>} />
        <Route path="/analytics" element={<div>Analytics page</div>} />
        <Route path="/governance" element={<div>Governance page</div>} />
        <Route path="/settings" element={<div>Settings page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('OverviewPage nav cards accessibility (issue #135)', () => {
  it('renders all six controls as links with correct names and hrefs', () => {
    renderOverview()

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(6)

    for (const { name, href } of NAV_LINKS) {
      const link = screen.getByRole('link', { name })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', href)
    }
  })

  it('reaches nav links in document order with Tab', async () => {
    renderOverview()
    const user = userEvent.setup()

    const firstLink = screen.getByRole('link', { name: NAV_LINKS[0].name })
    expect(screen.getAllByRole('button')).toHaveLength(1)
    const infoButton = screen.getByRole('button')
    infoButton.focus()
    await user.tab()
    expect(document.activeElement).toBe(firstLink)
    for (const { name } of NAV_LINKS.slice(1)) {
      await user.tab()
      expect(document.activeElement).toBe(screen.getByRole('link', { name }))
    }
  })

  it('navigates when Enter is pressed on a focused nav link', async () => {
    const user = userEvent.setup()
    renderOverviewWithRoutes()

    const link = screen.getByRole('link', { name: 'View Repositories' })
    link.focus()
    expect(document.activeElement).toBe(link)
    await user.keyboard('{Enter}')
    expect(await screen.findByText('Repos page')).toBeInTheDocument()
  })

  it('navigates when Space is pressed on a focused nav link', async () => {
    const user = userEvent.setup()
    renderOverviewWithRoutes()

    const link = screen.getByRole('link', { name: 'View Repositories' })
    link.focus()
    expect(document.activeElement).toBe(link)
    await user.keyboard(' ')
    expect(await screen.findByText('Repos page')).toBeInTheDocument()
  })

  it('does not expose card titles, descriptions, or empty areas as extra buttons or links', () => {
    renderOverview()

    expect(screen.getAllByRole('link')).toHaveLength(6)
    expect(screen.queryAllByRole('button', { name: /view/i })).toHaveLength(0)
    expect(
      screen.queryByRole('button', {
        name: /repositories|contributors|network|analytics|governance|settings/i,
      })
    ).not.toBeInTheDocument()
  })
})
