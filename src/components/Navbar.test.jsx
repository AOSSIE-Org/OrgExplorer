import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Navbar from './Navbar'

const mockAppState = {
  orgs: [{ login: 'AOSSIE-Org' }],
  rateLimit: { remaining: 50, limit: 60 },
}

const mockThemeState = {
  theme: 'dark',
  toggleTheme: vi.fn(),
}

vi.mock('../context/AppContext', () => ({
  useApp: () => mockAppState,
}))

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => mockThemeState,
}))

function renderNavbar(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Navbar />
    </MemoryRouter>
  )
}

describe('Navbar Mobile Navigation', () => {
  beforeEach(() => {
    mockAppState.orgs = [{ login: 'AOSSIE-Org' }]
    mockAppState.rateLimit = { remaining: 50, limit: 60 }
  })

  it('renders hamburger button with initial aria-expanded="false"', () => {
    renderNavbar()
    const hamburger = screen.getByRole('button', { name: /toggle navigation menu/i })
    expect(hamburger).toBeInTheDocument()
    expect(hamburger).toHaveAttribute('aria-expanded', 'false')
    expect(hamburger).toHaveAttribute('aria-controls', 'mobile-nav-menu')
    expect(screen.queryByTestId('navbar-backdrop')).not.toBeInTheDocument()
    expect(document.getElementById('mobile-nav-menu')).not.toBeInTheDocument()
  })

  it('opens mobile menu and sets aria-expanded="true" when hamburger is clicked', async () => {
    renderNavbar()
    const hamburger = screen.getByRole('button', { name: /toggle navigation menu/i })

    await userEvent.click(hamburger)

    expect(hamburger).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById('mobile-nav-menu')).toBeInTheDocument()
    expect(screen.getByTestId('navbar-backdrop')).toBeInTheDocument()
  })

  it('renders navigation links and action controls in the mobile menu', async () => {
    renderNavbar()
    const hamburger = screen.getByRole('button', { name: /toggle navigation menu/i })

    await userEvent.click(hamburger)

    const mobileMenu = document.getElementById('mobile-nav-menu')
    expect(mobileMenu).toBeInTheDocument()

    // Check links within mobile menu
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Repositories').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Contributors').length).toBeGreaterThan(0)

    // Check action buttons within mobile menu
    expect(screen.getAllByRole('button', { name: /settings/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /support us/i }).length).toBeGreaterThan(0)
  })

  it('closes mobile menu when Escape key is pressed', async () => {
    renderNavbar()
    const hamburger = screen.getByRole('button', { name: /toggle navigation menu/i })

    await userEvent.click(hamburger)
    expect(hamburger).toHaveAttribute('aria-expanded', 'true')

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(hamburger).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('mobile-nav-menu')).not.toBeInTheDocument()
    expect(screen.queryByTestId('navbar-backdrop')).not.toBeInTheDocument()
  })

  it('closes mobile menu when clicking the backdrop overlay', async () => {
    renderNavbar()
    const hamburger = screen.getByRole('button', { name: /toggle navigation menu/i })

    await userEvent.click(hamburger)
    const backdrop = screen.getByTestId('navbar-backdrop')
    expect(backdrop).toBeInTheDocument()

    await userEvent.click(backdrop)

    expect(hamburger).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('mobile-nav-menu')).not.toBeInTheDocument()
    expect(screen.queryByTestId('navbar-backdrop')).not.toBeInTheDocument()
  })

  it('closes mobile menu when clicking a navigation link', async () => {
    renderNavbar()
    const hamburger = screen.getByRole('button', { name: /toggle navigation menu/i })

    await userEvent.click(hamburger)
    expect(document.getElementById('mobile-nav-menu')).toBeInTheDocument()

    const mobileOverviewLink = screen.getAllByRole('link', { name: /overview/i }).find(
      link => document.getElementById('mobile-nav-menu')?.contains(link)
    )
    expect(mobileOverviewLink).toBeDefined()

    await userEvent.click(mobileOverviewLink)

    expect(hamburger).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('mobile-nav-menu')).not.toBeInTheDocument()
  })

  it('closes mobile menu when clicking settings or support button', async () => {
    renderNavbar()
    const hamburger = screen.getByRole('button', { name: /toggle navigation menu/i })

    await userEvent.click(hamburger)
    const mobileSettingsBtn = screen.getAllByRole('button', { name: /settings/i }).find(
      btn => document.getElementById('mobile-nav-menu')?.contains(btn)
    )
    expect(mobileSettingsBtn).toBeDefined()

    await userEvent.click(mobileSettingsBtn)

    expect(hamburger).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('mobile-nav-menu')).not.toBeInTheDocument()
  })
})
