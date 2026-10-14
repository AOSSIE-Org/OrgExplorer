import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import ContributorsPage from './ContributorsPage'

const mockModel = {
  contributors: [
    {
      login: 'alice',
      avatar: 'https://example.com/alice.png',
      totalContribs: 100,
      repos: 3,
      orgs: 1,
      lastActive: new Date().toISOString(),
      freshness: 95,
      isConnector: true,
      isCrossOrg: false,
      topRepos: [{ name: 'repo-1', count: 100 }],
    },
  ],
  repos: [{ name: 'repo-1' }],
  topActiveContributors: 1,
}

const mockUseApp = vi.fn()
vi.mock('../context/AppContext', () => ({
  useApp: () => mockUseApp(),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ContributorsPage />
    </MemoryRouter>
  )
}

describe('ContributorsPage - Signals popup cropping (#335)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseApp.mockReturnValue({
      model: mockModel,
      isComplete: true,
      loading: false,
      runFullExplore: vi.fn(),
      orgs: [{ login: 'test-org' }],
    })
  })

  it('renders table container with min-height: 380px so popups are not cropped with few rows', () => {
    renderPage()
    const table = screen.getByRole('table')
    const container = table.closest('div')
    expect(container).toHaveStyle({ minHeight: '380px' })
  })

  it('displays the signals info popup when hovering over the info button with a single row', async () => {
    renderPage()

    expect(screen.queryByText('Contributor Signals')).not.toBeInTheDocument()

    const infoButton = screen.getByRole('button', { name: /signals information/i })
    fireEvent.mouseEnter(infoButton)

    expect(screen.getByText('Contributor Signals')).toBeInTheDocument()
    expect(
      screen.getByText(/Measures how contributors connect repositories and organizations/i)
    ).toBeInTheDocument()

    fireEvent.mouseLeave(infoButton)
    expect(screen.queryByText('Contributor Signals')).not.toBeInTheDocument()
  })

  it('allows clicking the info button to toggle the signals popup', () => {
    renderPage()

    const infoButton = screen.getByRole('button', { name: /signals information/i })
    fireEvent.click(infoButton)

    expect(screen.getByText('Contributor Signals')).toBeInTheDocument()

    fireEvent.click(infoButton)
    expect(screen.queryByText('Contributor Signals')).not.toBeInTheDocument()
  })
})
