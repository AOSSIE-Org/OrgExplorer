import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import RequireAnalysis from './RequireAnalysis'

const app = vi.hoisted(() => ({
  state: { model: null, loading: false, hydrating: false },
}))

vi.mock('../context/AppContext', () => ({ useApp: () => app.state }))

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={['/overview']}>
      <Routes>
        <Route path="/" element={<div>org picker</div>} />
        <Route
          path="/overview"
          element={<RequireAnalysis><div>analysis dashboard</div></RequireAnalysis>}
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireAnalysis', () => {
  beforeEach(() => {
    app.state = { model: null, loading: false, hydrating: false }
  })

  it('redirects to the org picker when there is no analysis to show', () => {
    renderGuarded()

    expect(screen.getByText('org picker')).toBeInTheDocument()
    expect(screen.queryByText('analysis dashboard')).not.toBeInTheDocument()
  })

  it('renders the page once an analysis is loaded', () => {
    app.state = { model: { totalRepos: [] }, loading: false, hydrating: false }

    renderGuarded()

    expect(screen.getByText('analysis dashboard')).toBeInTheDocument()
  })

  it('waits while the cached analysis is being restored', () => {
    // A reload restores from IndexedDB asynchronously — redirecting here would
    // bounce the user away a moment before their own data arrived.
    app.state = { model: null, loading: false, hydrating: true }

    renderGuarded()

    expect(screen.queryByText('org picker')).not.toBeInTheDocument()
    expect(screen.queryByText('analysis dashboard')).not.toBeInTheDocument()
  })

  it('keeps the page mounted while explore() refetches', () => {
    // explore() clears the model before refetching; the page shows its own
    // skeleton during that window rather than being redirected away.
    app.state = { model: null, loading: true, hydrating: false }

    renderGuarded()

    expect(screen.getByText('analysis dashboard')).toBeInTheDocument()
    expect(screen.queryByText('org picker')).not.toBeInTheDocument()
  })
})
