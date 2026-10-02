import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
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
    mockThemeState.toggleTheme.mockClear()
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

    const menu = within(mobileMenu)

    // Check links scoped to mobile menu
    expect(menu.getByRole('link', { name: /overview/i })).toBeInTheDocument()
    expect(menu.getByRole('link', { name: /repositories/i })).toBeInTheDocument()
    expect(menu.getByRole('link', { name: /contributors/i })).toBeInTheDocument()

    // Check action controls scoped to mobile menu
    expect(menu.getByText('Theme')).toBeInTheDocument()
    expect(menu.getByRole('button', { name: /settings/i })).toBeInTheDocument()
    expect(menu.getByRole('button', { name: /support us/i })).toBeInTheDocument()
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
    const mobileMenu = document.getElementById('mobile-nav-menu')
    expect(mobileMenu).toBeInTheDocument()

    const mobileOverviewLink = within(mobileMenu).getByRole('link', { name: /overview/i })
    await userEvent.click(mobileOverviewLink)

    expect(hamburger).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('mobile-nav-menu')).not.toBeInTheDocument()
  })

  it('closes mobile menu when clicking settings button', async () => {
    renderNavbar()
    const hamburger = screen.getByRole('button', { name: /toggle navigation menu/i })

    await userEvent.click(hamburger)
    const mobileMenu = document.getElementById('mobile-nav-menu')
    expect(mobileMenu).toBeInTheDocument()

    const mobileSettingsBtn = within(mobileMenu).getByRole('button', { name: /settings/i })
    await userEvent.click(mobileSettingsBtn)

    expect(hamburger).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('mobile-nav-menu')).not.toBeInTheDocument()
  })

  it('closes mobile menu when clicking support us button', async () => {
    renderNavbar()
    const hamburger = screen.getByRole('button', { name: /toggle navigation menu/i })

    await userEvent.click(hamburger)
    const mobileMenu = document.getElementById('mobile-nav-menu')
    expect(mobileMenu).toBeInTheDocument()

    const mobileSupportBtn = within(mobileMenu).getByRole('button', { name: /support us/i })
    await userEvent.click(mobileSupportBtn)

    expect(hamburger).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('mobile-nav-menu')).not.toBeInTheDocument()
  })

  it('closes mobile menu when clicking theme toggle button and calls toggleTheme', async () => {
    renderNavbar()
    const hamburger = screen.getByRole('button', { name: /toggle navigation menu/i })

    await userEvent.click(hamburger)
    const mobileMenu = document.getElementById('mobile-nav-menu')
    expect(mobileMenu).toBeInTheDocument()

    const themeToggleBtn = within(mobileMenu).getByRole('button', { name: /switch to/i })
    await userEvent.click(themeToggleBtn)

    expect(mockThemeState.toggleTheme).toHaveBeenCalled()
    expect(hamburger).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('mobile-nav-menu')).not.toBeInTheDocument()
  })
})
