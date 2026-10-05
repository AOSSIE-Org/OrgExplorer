import { act, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider, useApp } from './AppContext'

const { loadAnalysis, saveAnalysis, fetchRateLimit, bumpPatGeneration } = vi.hoisted(() => ({
  loadAnalysis: vi.fn(),
  saveAnalysis: vi.fn(),
  fetchRateLimit: vi.fn(),
  bumpPatGeneration: vi.fn(),
}))

vi.mock('../services/cache', () => ({ loadAnalysis, saveAnalysis }))
vi.mock('../services/github', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    fetchOrg: vi.fn(),
    fetchRepos: vi.fn(),
    fetchContributors: vi.fn(),
    fetchIssues: vi.fn(),
    fetchPulls: vi.fn(),
    fetchRateLimit,
    bumpPatGeneration,
  }
})

function RateLimitProbe() {
  const { rateLimit, savePat, refreshRateLimit } = useApp()
  const [refreshResult, setRefreshResult] = useState('')
  return (
    <>
      <output data-testid="rate-limit">{JSON.stringify(rateLimit)}</output>
      <output data-testid="refresh-result">{refreshResult}</output>
      <button onClick={() => savePat('new-token')}>Save PAT</button>
      <button onClick={() => refreshRateLimit().then(result => setRefreshResult(String(result)))}>
        Refresh quota
      </button>
    </>
  )
}

function dispatchRateLimit(detail) {
  act(() => {
    window.dispatchEvent(new CustomEvent('rate-limit-update', { detail }))
  })
}

describe('AppContext rate-limit events', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-05T12:00:00Z'))
    localStorage.clear()
    loadAnalysis.mockResolvedValue(null)
    saveAnalysis.mockReset()
    fetchRateLimit.mockReset()
    bumpPatGeneration.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('rejects same-window increases but accepts decreases and next-window updates', () => {
    const reset = Math.floor(Date.now() / 1000) + 60
    const current = { limit: 5000, remaining: 4200, used: 800, reset }
    localStorage.setItem('oe_rate_limit', JSON.stringify(current))

    render(
      <AppProvider>
        <RateLimitProbe />
      </AppProvider>
    )

    dispatchRateLimit({ ...current, remaining: 5000, used: 0 })
    expect(screen.getByTestId('rate-limit').textContent).toBe(JSON.stringify(current))
    expect(JSON.parse(localStorage.getItem('oe_rate_limit'))).toEqual(current)

    const decreased = { ...current, remaining: 4199, used: 801 }
    dispatchRateLimit(decreased)
    expect(screen.getByTestId('rate-limit').textContent).toBe(JSON.stringify(decreased))

    vi.setSystemTime(new Date((reset + 1) * 1000))
    const nextWindow = { ...current, remaining: 5000, used: 0, reset: reset + 3600 }
    dispatchRateLimit(nextWindow)
    expect(screen.getByTestId('rate-limit').textContent).toBe(JSON.stringify(nextWindow))
  })

  it('ignores invalid rate-limit events', () => {
    const current = { limit: 5000, remaining: 4200, used: 800, reset: 1_800_000_000 }
    localStorage.setItem('oe_rate_limit', JSON.stringify(current))

    render(
      <AppProvider>
        <RateLimitProbe />
      </AppProvider>
    )

    dispatchRateLimit({ ...current, limit: 'invalid' })

    expect(screen.getByTestId('rate-limit').textContent).toBe(JSON.stringify(current))
    expect(JSON.parse(localStorage.getItem('oe_rate_limit'))).toEqual(current)
  })

  it('clears the displayed and stored quota when a PAT is saved', () => {
    const current = { limit: 5000, remaining: 4200, used: 800, reset: 1_800_000_000 }
    localStorage.setItem('oe_pat', 'old-token')
    localStorage.setItem('oe_rate_limit', JSON.stringify(current))

    render(
      <AppProvider>
        <RateLimitProbe />
      </AppProvider>
    )

    act(() => screen.getByRole('button', { name: 'Save PAT' }).click())

    expect(screen.getByTestId('rate-limit').textContent).toBe('null')
    expect(localStorage.getItem('oe_pat')).toBe('new-token')
    expect(localStorage.getItem('oe_rate_limit')).toBeNull()
    expect(bumpPatGeneration).toHaveBeenCalledOnce()
  })

  it('marks a refresh as superseded when the stored PAT changes mid-request', async () => {
    let resolveRefresh
    localStorage.setItem('oe_pat', 'old-token')
    fetchRateLimit.mockImplementation(
      () => new Promise(resolve => { resolveRefresh = resolve })
    )

    render(
      <AppProvider>
        <RateLimitProbe />
      </AppProvider>
    )

    act(() => screen.getByRole('button', { name: 'Refresh quota' }).click())
    localStorage.setItem('oe_pat', 'new-token')
    await act(async () => {
      resolveRefresh({ limit: 5000, remaining: 4000, used: 1000, reset: 1_800_000_000 })
      await Promise.resolve()
    })

    expect(screen.getByTestId('refresh-result').textContent).toBe('superseded')
    expect(localStorage.getItem('oe_rate_limit')).toBeNull()
  })
})
