import { describe, it, expect } from 'vitest'
import { computeMaintainerMetrics } from './analytics'

describe('computeMaintainerMetrics', () => {
  const pullsData = {
    'AOSSIE-Org/OrgExplorer': [
      { state: 'closed', merged_at: '2026-09-01T00:00:00Z' },
      { state: 'closed', merged_at: '2026-09-02T00:00:00Z' },
      { state: 'closed', merged_at: null },
      { state: 'open',   merged_at: null },
    ],
    'AOSSIE-Org/PictoPy': [
      { state: 'open',   merged_at: null },
      { state: 'closed', merged_at: '2026-09-03T00:00:00Z' },
    ],
  }

  it('counts merged PRs across all repos', () => {
    expect(computeMaintainerMetrics(pullsData).merged).toBe(3)
  })

  it('counts closed-but-unmerged PRs', () => {
    expect(computeMaintainerMetrics(pullsData).closedUnmerged).toBe(1)
  })

  it('counts open PRs', () => {
    expect(computeMaintainerMetrics(pullsData).open).toBe(2)
  })

  it('totals all PRs', () => {
    expect(computeMaintainerMetrics(pullsData).totalPRs).toBe(6)
  })

  it('produces a per-repo breakdown', () => {
    const perRepo = computeMaintainerMetrics(pullsData).perRepo
    const oe = perRepo.find(r => r.repo === 'AOSSIE-Org/OrgExplorer')
    expect(oe).toEqual({ repo: 'AOSSIE-Org/OrgExplorer', total: 4, merged: 2, closedUnmerged: 1, open: 1 })
  })

  it('handles empty / missing input without throwing', () => {
    expect(computeMaintainerMetrics({}).totalPRs).toBe(0)
    expect(computeMaintainerMetrics(undefined).totalPRs).toBe(0)
  })

  it('ignores a non-array repo value', () => {
    expect(() => computeMaintainerMetrics({ 'x/y': null })).not.toThrow()
  })
})