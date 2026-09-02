import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import ContributorProfilePage from './ContributorProfilePage'

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.mock('react-router-dom', () => ({
  useParams: () => ({ username: 'rohan-pandeyy' }),
  useNavigate: () => vi.fn()
}))

const mockUseApp = {
  orgs: [{ login: 'AOSSIE-Org' }],
  pat: 'mock-pat',
  pullsData: {},
  isComplete: true,
  loading: false,
  runFullExplore: vi.fn()
}

vi.mock('../context/AppContext', () => ({
  useApp: () => mockUseApp
}))

describe('ContributorProfilePage fetch retry logic', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.spyOn(global, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('retries with public unauthenticated headers when authenticated search fails with HTTP 422', async () => {
    const todayIso = new Date().toISOString().slice(0, 10)
    // Mock sequence:
    // 1 & 2: Authenticated fetches fail with 422
    // 3 & 4: Unauthenticated retries succeed
    fetchMock
      .mockResolvedValueOnce({
        status: 422,
        ok: false,
        headers: new Headers()
      })
      .mockResolvedValueOnce({
        status: 422,
        ok: false,
        headers: new Headers()
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: new Headers(),
        json: async () => ({ items: [{ id: 1, title: 'Mock PR', number: 42, created_at: todayIso, html_url: 'http://url', pull_request: {} }] })
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: new Headers(),
        json: async () => ({ items: [] })
      })

    render(<ContributorProfilePage />)

    // Wait for the mock issues title to appear
    await waitFor(() => {
      expect(screen.getByText('Mock PR')).toBeInTheDocument()
    })

    // Verify fetch was called 4 times in total (2 authenticated + 2 public retries)
    expect(fetchMock).toHaveBeenCalledTimes(4)

    // Verify first fetch calls included the Authorization header
    const firstCallHeaders = fetchMock.mock.calls[0][1].headers
    expect(firstCallHeaders.Authorization).toBe('token mock-pat')

    // Verify fallback fetch calls did NOT include the Authorization header
    const fallbackCallHeaders = fetchMock.mock.calls[2][1].headers
    expect(fallbackCallHeaders.Authorization).toBeUndefined()
  })

  it('does not retry and propagates error for non-422 failures', async () => {
    // Mock authenticated fetch failing with 500 Internal Server Error
    fetchMock.mockResolvedValue({
      status: 500,
      ok: false,
      headers: new Headers()
    })

    render(<ContributorProfilePage />)

    // Wait for error card to render
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch contributor details: HTTP_500')).toBeInTheDocument()
    })

    // Verify fetch was called only twice (1 for main search, 1 for merged search running in parallel)
    // and no unauthenticated retries were executed
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
