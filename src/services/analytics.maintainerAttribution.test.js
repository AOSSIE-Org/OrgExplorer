import { describe, it, expect } from 'vitest'
import { computeMaintainerAttribution } from './analytics'

describe('computeMaintainerAttribution', () => {
  const prs = [
    { merged_by: 'alice', reviewers: ['bob'] },
    { merged_by: 'alice', reviewers: ['bob', 'carol'] },
    { merged_by: null,    reviewers: ['bob', 'bob'] },   // bob reviewed twice on one PR
    { merged_by: 'carol', reviewers: [] },
  ]

  it('counts merges per maintainer', () => {
    const rows = computeMaintainerAttribution(prs)
    expect(rows.find(r => r.login === 'alice').merged).toBe(2)
    expect(rows.find(r => r.login === 'carol').merged).toBe(1)
  })

  it('counts a reviewer once per PR even with multiple reviews', () => {
    const rows = computeMaintainerAttribution(prs)
    // bob reviewed PR1, PR2, PR3 (twice on PR3 -> counts once) = 3
    expect(rows.find(r => r.login === 'bob').reviewed).toBe(3)
  })

  it('includes people who only reviewed, never merged', () => {
    const bob = computeMaintainerAttribution(prs).find(r => r.login === 'bob')
    expect(bob.merged).toBe(0)
    expect(bob.reviewed).toBe(3)
  })

  it('sorts by combined merged + reviewed, descending', () => {
    const rows = computeMaintainerAttribution(prs)
    const totals = rows.map(r => r.merged + r.reviewed)
    expect(totals).toEqual([...totals].sort((a, b) => b - a))
  })

  it('handles empty / missing input', () => {
    expect(computeMaintainerAttribution([])).toEqual([])
    expect(computeMaintainerAttribution()).toEqual([])
  })

  it('skips null PR entries and null merged_by', () => {
    expect(() => computeMaintainerAttribution([null, { merged_by: null, reviewers: [] }])).not.toThrow()
  })
})


describe('computeMaintainerAttribution — repos and lastActive', () => {
  const prs = [
    { merged_by: 'alice', reviewers: [], repo: 'RepoA', activity_at: '2026-09-01T00:00:00Z' },
    { merged_by: 'alice', reviewers: [], repo: 'RepoB', activity_at: '2026-09-10T00:00:00Z' },
    { merged_by: 'alice', reviewers: [], repo: 'RepoA', activity_at: '2026-09-05T00:00:00Z' },
    { merged_by: null,    reviewers: ['bob'], repo: 'RepoC', activity_at: '2026-09-03T00:00:00Z' },
  ]

  it('counts distinct repos per maintainer', () => {
    const rows = computeMaintainerAttribution(prs)
    // alice merged in RepoA (twice) and RepoB -> 2 distinct repos
    expect(rows.find(r => r.login === 'alice').repos).toBe(2)
    // bob reviewed in RepoC only -> 1
    expect(rows.find(r => r.login === 'bob').repos).toBe(1)
  })

  it('tracks lastActive as the most recent activity date', () => {
    const alice = computeMaintainerAttribution(prs).find(r => r.login === 'alice')
    expect(alice.lastActive).toBe('2026-09-10T00:00:00Z') // the latest of her three
  })

  it('returns repos as a number, not a Set', () => {
    const alice = computeMaintainerAttribution(prs).find(r => r.login === 'alice')
    expect(typeof alice.repos).toBe('number')
  })

  it('handles PRs missing repo or activity_at', () => {
    const rows = computeMaintainerAttribution([
      { merged_by: 'carol', reviewers: [] }, // no repo, no activity_at
    ])
    const carol = rows.find(r => r.login === 'carol')
    expect(carol.repos).toBe(0)
    expect(carol.lastActive).toBeNull()
  })
})