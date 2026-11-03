import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

// Stub the data layer so this test only exercises App's route table,
// not IndexedDB hydration or GitHub API calls.
vi.mock('./context/AppContext', () => ({
  AppProvider: ({ children }) => children,
  useApp: () => ({ orgs: [], rateLimit: null, pat: '', model: null, loading: false, hydrating: false }),
}))

describe('App routing', () => {
  it('renders the Not Found page for an unknown route', () => {
    render(
      <MemoryRouter initialEntries={['/this-route-does-not-exist']}>
        <App />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument()
  })
})
