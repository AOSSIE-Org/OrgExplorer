import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from './Navbar'

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    model: null,
    loading: false,
    hydrating: false,
  }),
}))

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: vi.fn(),
  }),
}))

describe('Navbar', () => {
  const originalResizeObserver = globalThis.ResizeObserver

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver
    vi.restoreAllMocks()
  })

  it('renders safely when ResizeObserver is undefined and measures overflow for overflowing navigation', () => {
    delete globalThis.ResizeObserver

    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(500)
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(500)

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    )

    const toggleButton = screen.getByRole('button', { name: /toggle navigation/i })
    expect(toggleButton).toBeInTheDocument()
    expect(toggleButton).toHaveClass('navbar-menu-toggle-visible')
  })

  it('measures non-overflowing navigation when ResizeObserver is undefined', () => {
    delete globalThis.ResizeObserver

    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000)
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(200)

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    )

    const toggleButton = screen.getByRole('button', { name: /toggle navigation/i })
    expect(toggleButton).toBeInTheDocument()
    expect(toggleButton).not.toHaveClass('navbar-menu-toggle-visible')
  })

  it('observes resize events when ResizeObserver is available', () => {
    const observeMock = vi.fn()
    const disconnectMock = vi.fn()
    class MockObserver {
      constructor() {
        MockObserver.instances.push(this)
      }
      observe = observeMock
      unobserve = vi.fn()
      disconnect = disconnectMock
    }
    MockObserver.instances = []
    globalThis.ResizeObserver = MockObserver

    const { unmount, container } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    )

    expect(container.querySelector('nav')).toBeInTheDocument()
    expect(MockObserver.instances.length).toBe(1)
    expect(observeMock).toHaveBeenCalled()

    unmount()
    expect(disconnectMock).toHaveBeenCalled()
  })
})
