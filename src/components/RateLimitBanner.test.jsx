import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RateLimitBanner from './RateLimitBanner'

const app = vi.hoisted(() => ({
  state: { rateLimit: null, pat: '' },
}))

vi.mock('../context/AppContext', () => ({ useApp: () => app.state }))

function renderBanner() {
  return render(
    <MemoryRouter>
      <RateLimitBanner />
    </MemoryRouter>
  )
}

describe('RateLimitBanner', () => {
  beforeEach(() => {
    app.state = { rateLimit: null, pat: '' }
  })

  it('renders null when rateLimit is not set', () => {
    const { container } = renderBanner()
    expect(container.firstChild).toBeNull()
  })

  it('renders null when limit is 0 or negative', () => {
    app.state = { rateLimit: { remaining: 0, limit: 0, used: 0, reset: 0 }, pat: '' }
    const { container } = renderBanner()
    expect(container.firstChild).toBeNull()
  })

  it('renders null for unauthenticated users when quota is healthy (> 20%)', () => {
    // 50 remaining out of 60 limit = 83.3% remaining
    app.state = {
      rateLimit: { remaining: 50, limit: 60, used: 10, reset: Math.floor(Date.now() / 1000) + 3600 },
      pat: '',
    }
    const { container } = renderBanner()
    expect(container.firstChild).toBeNull()
  })

  it('renders null for authenticated users when quota is healthy (> 20%)', () => {
    // 4500 remaining out of 5000 limit = 90% remaining
    app.state = {
      rateLimit: { remaining: 4500, limit: 5000, used: 500, reset: Math.floor(Date.now() / 1000) + 3600 },
      pat: 'ghp_mock_token',
    }
    const { container } = renderBanner()
    expect(container.firstChild).toBeNull()
  })

  it('renders warning banner when quota is low (<= 20%)', () => {
    // 10 remaining out of 60 limit = 16.7% remaining
    app.state = {
      rateLimit: { remaining: 10, limit: 60, used: 50, reset: Math.floor(Date.now() / 1000) + 3600 },
      pat: '',
    }
    renderBanner()
    expect(screen.getByText(/API RATE LIMIT:/i)).toBeInTheDocument()
    expect(screen.getByText('10 / 60')).toBeInTheDocument()
    expect(screen.getByText(/Add PAT for 5,000 req\/hr/i)).toBeInTheDocument()
  })

  it('renders critical style when quota is critically low (< 10%)', () => {
    // 4 remaining out of 60 limit = 6.7% remaining
    app.state = {
      rateLimit: { remaining: 4, limit: 60, used: 56, reset: Math.floor(Date.now() / 1000) + 3600 },
      pat: '',
    }
    const { container } = renderBanner()
    expect(screen.getByText('4 / 60')).toBeInTheDocument()
    const banner = container.firstChild
    expect(banner.style.borderLeft).toContain('var(--red)')
  })
})
