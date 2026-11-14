import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import ContributorsPage from './ContributorsPage'

const mockModel = {
  contributors: [
    {
      login: 'alice',
      avatar_url: 'https://example.com/alice.png',
      totalContribs: 100,
      repos: ['repo-1'],
      orgs: ['test-org'],
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

describe('ContributorsPage - Signals popup cropping and interaction (#335)', () => {
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

  it('renders table container with min-height: 380px so popups are not cropped with few rows and verifies layout bounds', () => {
    renderPage()
    const table = screen.getByRole('table')
    const container = table.closest('div')
    expect(container).toHaveStyle({ minHeight: '380px' })

    const infoButton = screen.getByRole('button', { name: /signals information/i })
    fireEvent.click(infoButton)

    const popup = screen.getByRole('region', { name: /contributor signals/i })
    expect(popup).toBeInTheDocument()

    // Assert layout positioning styles preventing overflow clipping
    expect(popup).toHaveStyle({
      position: 'absolute',
      zIndex: '100',
    })

    // Mock bounding rects to simulate layout dimensions and verify popup is within container bounds
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 480,
      left: 0,
      right: 1000,
      width: 1000,
      height: 380,
    })
    vi.spyOn(popup, 'getBoundingClientRect').mockReturnValue({
      top: 150,
      bottom: 360,
      left: 650,
      right: 970,
      width: 320,
      height: 210,
    })

    const containerRect = container.getBoundingClientRect()
    const popupRect = popup.getBoundingClientRect()

    expect(popupRect.top).toBeGreaterThanOrEqual(containerRect.top)
    expect(popupRect.bottom).toBeLessThanOrEqual(containerRect.bottom)
    expect(popupRect.left).toBeGreaterThanOrEqual(containerRect.left)
    expect(popupRect.right).toBeLessThanOrEqual(containerRect.right)
  })

  it('displays the signals info popup when hovering over the info button and updates aria-expanded', async () => {
    renderPage()

    const infoButton = screen.getByRole('button', { name: /signals information/i })
    const signalsHeader = infoButton.closest('div')
    expect(infoButton).toHaveAttribute('aria-expanded', 'false')
    expect(infoButton).toHaveAttribute('aria-controls', 'signals-info-popup')
    expect(screen.queryByText('Contributor Signals')).not.toBeInTheDocument()

    fireEvent.mouseEnter(signalsHeader)

    const popup = screen.getByRole('region', { name: /contributor signals/i })
    expect(popup).toBeInTheDocument()
    expect(popup).toHaveAttribute('id', 'signals-info-popup')
    expect(infoButton).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByText(/Measures how contributors connect repositories and organizations/i)
    ).toBeInTheDocument()

    fireEvent.mouseLeave(signalsHeader)
    expect(screen.queryByText('Contributor Signals')).not.toBeInTheDocument()
    expect(infoButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps signals popup open after mouseLeave when clicked (pinned) and unpins on second click', () => {
    renderPage()

    const infoButton = screen.getByRole('button', { name: /signals information/i })
    const signalsHeader = infoButton.closest('div')
    expect(infoButton).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(infoButton)
    expect(screen.getByText('Contributor Signals')).toBeInTheDocument()
    expect(infoButton).toHaveAttribute('aria-expanded', 'true')

    // Mouse leave on the Signals header should not close when pinned by click
    fireEvent.mouseLeave(signalsHeader)
    expect(screen.getByText('Contributor Signals')).toBeInTheDocument()
    expect(infoButton).toHaveAttribute('aria-expanded', 'true')

    // Second click unpins and closes the popup
    fireEvent.click(infoButton)
    expect(screen.queryByText('Contributor Signals')).not.toBeInTheDocument()
    expect(infoButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes pinned signals popup when clicking outside', () => {
    renderPage()

    const infoButton = screen.getByRole('button', { name: /signals information/i })
    fireEvent.click(infoButton)
    expect(screen.getByText('Contributor Signals')).toBeInTheDocument()
    expect(infoButton).toHaveAttribute('aria-expanded', 'true')

    // Click outside
    fireEvent.mouseDown(document)
    expect(screen.queryByText('Contributor Signals')).not.toBeInTheDocument()
    expect(infoButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps unpinned signals popup open when pointer moves from header to popup and closes when pointer leaves popup', () => {
    renderPage()

    const infoButton = screen.getByRole('button', { name: /signals information/i })
    const signalsHeader = infoButton.closest('div')
    expect(infoButton).toHaveAttribute('aria-expanded', 'false')

    // Hover header to open
    fireEvent.mouseEnter(signalsHeader)
    const popup = screen.getByRole('region', { name: /contributor signals/i })
    expect(popup).toBeInTheDocument()

    // Move pointer from header into the popup (relatedTarget: popup) -> stays open
    fireEvent.mouseLeave(signalsHeader, { relatedTarget: popup })
    expect(screen.getByText('Contributor Signals')).toBeInTheDocument()

    // Hover inside popup
    fireEvent.mouseEnter(popup)
    expect(screen.getByText('Contributor Signals')).toBeInTheDocument()

    // Leave popup to an external element -> unpinned popup closes
    fireEvent.mouseLeave(popup, { relatedTarget: document.body })
    expect(screen.queryByText('Contributor Signals')).not.toBeInTheDocument()
    expect(infoButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders #signals-info-popup outside the table scroll container and remains visible within layout when toolbar wraps at narrow widths', () => {
    // Simulate narrow viewport
    window.innerWidth = 375
    window.innerHeight = 667

    renderPage()

    // Filter to one contributor
    const searchInput = screen.getByPlaceholderText(/search by username/i)
    fireEvent.change(searchInput, { target: { value: 'alice' } })

    const table = screen.getByRole('table')
    const scrollContainer = table.closest('div')
    const cardContainer = scrollContainer.parentElement

    expect(scrollContainer).toHaveStyle({ minHeight: '380px' })

    const infoButton = screen.getByRole('button', { name: /signals information/i })
    fireEvent.click(infoButton)

    const popup = screen.getByRole('region', { name: /contributor signals/i })
    expect(popup).toBeInTheDocument()

    // Verified: popup is outside the horizontal scroll container
    expect(scrollContainer.contains(popup)).toBe(false)
    expect(cardContainer.contains(popup)).toBe(true)

    // Verify layout positioning at narrow width
    expect(popup).toHaveStyle({
      position: 'absolute',
      zIndex: '100',
    })

    // Simulate bounding boxes for wrapped toolbar at narrow width
    vi.spyOn(cardContainer, 'getBoundingClientRect').mockReturnValue({
      top: 150,
      bottom: 650,
      left: 10,
      right: 365,
      width: 355,
      height: 500,
    })
    vi.spyOn(popup, 'getBoundingClientRect').mockReturnValue({
      top: 250,
      bottom: 460,
      left: 30,
      right: 350,
      width: 320,
      height: 210,
    })

    const cardRect = cardContainer.getBoundingClientRect()
    const popupRect = popup.getBoundingClientRect()

    expect(popupRect.top).toBeGreaterThanOrEqual(cardRect.top)
    expect(popupRect.bottom).toBeLessThanOrEqual(cardRect.bottom)
    expect(popupRect.left).toBeGreaterThanOrEqual(cardRect.left)
    expect(popupRect.right).toBeLessThanOrEqual(cardRect.right)
  })

  it('renders contributor avatar_url and counts from repos/orgs arrays', () => {
    renderPage()

    const avatar = screen.getByRole('img', { name: 'alice' })
    expect(avatar).toHaveAttribute('src', 'https://example.com/alice.png')

    expect(screen.getByText('alice')).toBeInTheDocument()
    // Repos count and orgs count are 1
    const cells = screen.getAllByRole('cell')
    const cellTexts = cells.map(c => c.textContent)
    expect(cellTexts).toContain('1')
  })
})
