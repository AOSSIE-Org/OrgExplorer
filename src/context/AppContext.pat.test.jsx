import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import React from 'react'
import { AppProvider, useApp } from './AppContext'

vi.mock('../services/cache', () => ({
  loadAnalysis: vi.fn().mockResolvedValue(null),
  saveAnalysis: vi.fn().mockResolvedValue(true),
}))

const { loadStoredPat, persistPat, clearStoredPat, fetchRateLimit } = vi.hoisted(() => ({
  loadStoredPat: vi.fn(),
  persistPat: vi.fn(),
  clearStoredPat: vi.fn(),
  fetchRateLimit: vi.fn(),
}))

vi.mock('../services/patStorage', () => ({
  loadPat: loadStoredPat,
  savePat: persistPat,
  clearPat: clearStoredPat,
}))

vi.mock('../services/github', () => ({
  fetchOrg: vi.fn(),
  fetchRepos: vi.fn(),
  fetchContributors: vi.fn(),
  fetchIssues: vi.fn(),
  fetchPulls: vi.fn(),
  fetchRateLimit,
}))

function PatHarness() {
  const { pat, savePat, patHydrating, patStorageWarning, rateLimit } = useApp()

  return (
    <div>
      <span data-testid="pat">{pat}</span>
      <span data-testid="hydrating">{String(patHydrating)}</span>
      <span data-testid="warning">{patStorageWarning}</span>
      <span data-testid="rate">{rateLimit?.remaining ?? ''}</span>
      <button onClick={() => savePat('new-token')}>save</button>
      <button onClick={() => savePat('')}>delete</button>
    </div>
  )
}

function renderHarness() {
  return render(
    <AppProvider>
      <PatHarness />
    </AppProvider>
  )
}

describe('AppContext PAT lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    loadStoredPat.mockResolvedValue({ token: '', status: 'empty' })
    persistPat.mockResolvedValue({ persisted: true })
    clearStoredPat.mockResolvedValue(undefined)
    fetchRateLimit.mockResolvedValue({
      limit: 5000,
      remaining: 4998,
      used: 2,
      reset: Math.floor(Date.now() / 1000) + 3600
    })
  })

  it('restores a stored token after async hydration', async () => {
    loadStoredPat.mockResolvedValue({ token: 'stored-token', status: 'ok' })

    renderHarness()

    await waitFor(() =>
      expect(screen.getByTestId('hydrating')).toHaveTextContent('false')
    )
    expect(screen.getByTestId('pat')).toHaveTextContent('stored-token')
  })

  it('warns when the stored token cannot be decrypted', async () => {
    loadStoredPat.mockResolvedValue({ token: '', status: 'corrupt' })

    renderHarness()

    await waitFor(() =>
      expect(screen.getByTestId('warning')).toHaveTextContent(/could not be decrypted/i)
    )
  })

  it('warns when the browser cannot persist the token', async () => {
    loadStoredPat.mockResolvedValue({ token: '', status: 'unavailable' })

    renderHarness()

    await waitFor(() =>
      expect(screen.getByTestId('warning')).toHaveTextContent(/cannot store your token securely/i)
    )
  })

  it('persists a saved token and clears old warnings', async () => {
    loadStoredPat.mockResolvedValue({ token: '', status: 'corrupt' })
    renderHarness()

    await screen.findByText(/could not be decrypted/i)

    await act(async () => {
      screen.getByText('save').click()
    })

    await waitFor(() => expect(persistPat).toHaveBeenCalledWith('new-token'))
    expect(screen.getByTestId('pat')).toHaveTextContent('new-token')
    expect(screen.getByTestId('warning').textContent).toBe('')
    await waitFor(() => expect(screen.getByTestId('rate')).toHaveTextContent('4998'))
  })

  it('keeps the token in memory but warns when persistence fails', async () => {
    persistPat.mockResolvedValue({ persisted: false, reason: 'unavailable' })
    renderHarness()

    await waitFor(() =>
      expect(screen.getByTestId('hydrating')).toHaveTextContent('false')
    )

    await act(async () => {
      screen.getByText('save').click()
    })

    expect(screen.getByTestId('pat')).toHaveTextContent('new-token')
    await waitFor(() =>
      expect(screen.getByTestId('warning')).toHaveTextContent(/cannot store your token securely/i)
    )
  })

  it('removes both the in-memory and stored token on delete', async () => {
    loadStoredPat.mockResolvedValue({ token: 'stored-token', status: 'ok' })
    renderHarness()

    await waitFor(() =>
      expect(screen.getByTestId('pat')).toHaveTextContent('stored-token')
    )

    await act(async () => {
      screen.getByText('delete').click()
    })

    await waitFor(() => expect(clearStoredPat).toHaveBeenCalledTimes(1))
    expect(screen.getByTestId('pat')).toHaveTextContent('')
  })

  it('does not let a slow hydration overwrite a token saved meanwhile', async () => {
    let resolveHydration
    loadStoredPat.mockReturnValue(new Promise(resolve => {
      resolveHydration = resolve
    }))

    renderHarness()

    await act(async () => {
      screen.getByText('save').click()
    })

    expect(screen.getByTestId('pat')).toHaveTextContent('new-token')

    await act(async () => {
      resolveHydration({ token: 'old-token', status: 'ok' })
    })

    expect(screen.getByTestId('pat')).toHaveTextContent('new-token')
  })
})
