import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RateLimitBanner from './RateLimitBanner'

const mockAppState = {
  rateLimit: { remaining: 10, limit: 60, used: 50, reset: 1700000000 },
  pat: null,
}

vi.mock('../context/AppContext', () => ({
  useApp: () => mockAppState,
}))

function renderRateLimitBanner() {
  return render(
    <MemoryRouter>
      <RateLimitBanner />
    </MemoryRouter>
  )
}

describe('RateLimitBanner', () => {
  beforeEach(() => {
    mockAppState.rateLimit = { remaining: 10, limit: 60, used: 50, reset: 1700000000 }
    mockAppState.pat = null
  })

  it('renders nothing when rateLimit is null', () => {
    mockAppState.rateLimit = null
    const { container } = renderRateLimitBanner()
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when rate limit is healthy (>20% and limit > 60)', () => {
    mockAppState.rateLimit = { remaining: 5000, limit: 5000, used: 0, reset: 1700000000 }
    const { container } = renderRateLimitBanner()
    expect(container.firstChild).toBeNull()
  })

  it('renders banner when rate limit is low', () => {
    renderRateLimitBanner()
    expect(screen.getByText(/API RATE LIMIT:/i)).toBeInTheDocument()
    expect(screen.getByText('10 / 60')).toBeInTheDocument()
  })

  it('renders "Add PAT" as a semantic Link pointing to /settings when pat is absent', () => {
    renderRateLimitBanner()
    const patLink = screen.getByRole('link', { name: /add pat for 5,000 req\/hr/i })
    expect(patLink).toBeInTheDocument()
    expect(patLink).toHaveAttribute('href', '/settings')
  })

  it('allows keyboard focus navigation to the Add PAT link', async () => {
    renderRateLimitBanner()
    const patLink = screen.getByRole('link', { name: /add pat for 5,000 req\/hr/i })

    expect(document.body).toHaveFocus()
    await userEvent.tab()
    expect(patLink).toHaveFocus()
  })

  it('does not render Add PAT link when pat is already provided', () => {
    mockAppState.pat = 'ghp_testtoken'
    renderRateLimitBanner()
    expect(screen.queryByRole('link', { name: /add pat for 5,000 req\/hr/i })).not.toBeInTheDocument()
  })

  it('applies flex wrapping and minWidth: 0 to allow responsive shrinking without horizontal overflow', () => {
    const { container } = renderRateLimitBanner()
    const bannerContainer = container.firstChild
    expect(bannerContainer).toHaveStyle({ display: 'flex', flexWrap: 'wrap' })

    const messageSpan = bannerContainer.firstChild
    expect(messageSpan).toHaveStyle({ display: 'flex', flexWrap: 'wrap', minWidth: '0px' })
  })
})
