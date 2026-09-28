import { describe, it, expect } from 'vitest'
import { selectPRsToEnrich } from './github'

describe('selectPRsToEnrich', () => {
  const pullsData = {
    'AOSSIE-Org/OrgExplorer': [
      { number: 1, state: 'closed', merged_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
      { number: 2, state: 'open',   merged_at: null,                   updated_at: '2026-09-10T00:00:00Z' },
      { number: 3, state: 'closed', merged_at: null,                   updated_at: '2026-09-05T00:00:00Z' },
    ],
    'AOSSIE-Org/PictoPy': [
      { number: 4, state: 'closed', merged_at: '2026-09-08T00:00:00Z', updated_at: '2026-09-08T00:00:00Z' },
    ],
  }

  it('excludes open PRs', () => {
    const sel = selectPRsToEnrich(pullsData)
    expect(sel.find(p => p.number === 2)).toBeUndefined()
  })

  it('includes merged and closed-unmerged PRs', () => {
    const nums = selectPRsToEnrich(pullsData).map(p => p.number).sort()
    expect(nums).toEqual([1, 3, 4])
  })

  it('sorts by updated_at, most recent first', () => {
    const nums = selectPRsToEnrich(pullsData).map(p => p.number)
    expect(nums).toEqual([4, 3, 1]) // 09-08, 09-05, 09-01
  })

  it('splits org/repo from the key', () => {
    const first = selectPRsToEnrich(pullsData)[0]
    expect(first.org).toBe('AOSSIE-Org')
    expect(first.repo).toBe('PictoPy')
  })

  it('respects the cap', () => {
    expect(selectPRsToEnrich(pullsData, 2)).toHaveLength(2)
  })

  it('handles empty / malformed input', () => {
    expect(selectPRsToEnrich({})).toEqual([])
    expect(selectPRsToEnrich(undefined)).toEqual([])
    expect(() => selectPRsToEnrich({ 'x/y': null })).not.toThrow()
  })
})