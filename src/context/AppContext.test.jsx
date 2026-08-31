import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AppProvider, useApp } from './AppContext'

// Mock services to avoid network requests
vi.mock('../services/github', () => ({
  fetchOrg: vi.fn().mockResolvedValue({ login: 'test-org', public_repos: 5 }),
  fetchRepos: vi.fn().mockResolvedValue([{ name: 'test-repo', orgLogin: 'test-org' }]),
  fetchContributors: vi.fn().mockResolvedValue([]),
  fetchIssues: vi.fn().mockResolvedValue([]),
  fetchRateLimit: vi.fn().mockResolvedValue(null),
  fetchPulls: vi.fn().mockResolvedValue([])
}))

vi.mock('../services/analytics', () => ({
  buildAnalyticalModel: vi.fn().mockReturnValue({ allRepos: [], totalRepos: [] }),
  getTopRepositories: vi.fn().mockImplementation(repos => repos)
}))

describe('AppContext - localStorage safety and validation', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('handles invalid or non-array oe_active_orgs gracefully', async () => {
    // Test with string value
    localStorage.setItem('oe_active_orgs', JSON.stringify('invalid_string'))
    const { result: res1 } = renderHook(() => useApp(), { wrapper: AppProvider })
    expect(res1.current.lastOrgNames).toEqual([])

    // Test with null
    localStorage.setItem('oe_active_orgs', JSON.stringify(null))
    const { result: res2 } = renderHook(() => useApp(), { wrapper: AppProvider })
    expect(res2.current.lastOrgNames).toEqual([])

    // Test with mixed array including invalid items
    localStorage.setItem('oe_active_orgs', JSON.stringify(['valid-org', null, 123, '  ', 'another-org']))
    let res3
    await act(async () => {
      res3 = renderHook(() => useApp(), { wrapper: AppProvider })
    })
    expect(res3.result.current.lastOrgNames).toEqual(['valid-org', 'another-org'])
  })

  it('isolates localStorage setItem failure in explore when saving oe_active_orgs', async () => {
    const originalSetItem = localStorage.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => {
      if (key === 'oe_active_orgs') {
        throw new Error('QuotaExceededError')
      }
      return originalSetItem.call(localStorage, key, val)
    })

    const { result } = renderHook(() => useApp(), { wrapper: AppProvider })

    let modelResult
    await act(async () => {
      modelResult = await result.current.explore(['test-org'])
    })

    expect(modelResult).toBeTruthy()
    expect(result.current.orgs).toHaveLength(1)
  })

  it('isolates localStorage setItem failure in explore when saving oe_recent', async () => {
    const originalSetItem = localStorage.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => {
      if (key === 'oe_recent') {
        throw new Error('QuotaExceededError')
      }
      return originalSetItem.call(localStorage, key, val)
    })

    const { result } = renderHook(() => useApp(), { wrapper: AppProvider })

    let modelResult
    await act(async () => {
      modelResult = await result.current.explore(['test-org'])
    })

    expect(modelResult).toBeTruthy()
    expect(result.current.error).toBe('')
  })
})
