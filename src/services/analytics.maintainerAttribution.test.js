import { describe, it, expect } from 'vitest'
import { computeMaintainerAttribution } from './analytics'

describe('computeMaintainerAttribution', () => {
  const prs = [
    { merged_by: 'alice', reviewers: [{ login: 'bob' }] },
    { merged_by: 'alice', reviewers: [{ login: 'bob' }, { login: 'carol' }] },
    { merged_by: null,    reviewers: [{ login: 'bob' }, { login: 'bob' }] },
    { merged_by: 'carol', reviewers: [] },
  ]

  it('counts merges per maintainer', () => {
    const rows = computeMaintainerAttribution(prs)
    expect(rows.find(r => r.login === 'alice').merged).toBe(2)
    expect(rows.find(r => r.login === 'carol').merged).toBe(1)
  })

  it('counts a reviewer once per PR even with multiple reviews', () => {
    const rows = computeMaintainerAttribution(prs)
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
    { merged_by: 'alice', merged_at: '2026-09-01T00:00:00Z', reviewers: [], repo: 'RepoA' },
    { merged_by: 'alice', merged_at: '2026-09-10T00:00:00Z', reviewers: [], repo: 'RepoB' },
    { merged_by: 'alice', merged_at: '2026-09-05T00:00:00Z', reviewers: [], repo: 'RepoA' },
    { merged_by: null,    merged_at: null, reviewers: [{ login: 'bob', reviewed_at: '2026-09-03T00:00:00Z' }], repo: 'RepoC' },
  ]

  it('counts distinct repos per maintainer', () => {
    const rows = computeMaintainerAttribution(prs)
    expect(rows.find(r => r.login === 'alice').repos).toBe(2)
    expect(rows.find(r => r.login === 'bob').repos).toBe(1)
  })

  it('tracks lastActive as the most recent activity date', () => {
    const alice = computeMaintainerAttribution(prs).find(r => r.login === 'alice')
    expect(alice.lastActive).toBe('2026-09-10T00:00:00Z')
  })

  it('returns repos as a number, not a Set', () => {
    const alice = computeMaintainerAttribution(prs).find(r => r.login === 'alice')
    expect(typeof alice.repos).toBe('number')
  })

  it('handles PRs missing repo or dates', () => {
    const rows = computeMaintainerAttribution([
      { merged_by: 'carol', merged_at: null, reviewers: [] },
    ])
    const carol = rows.find(r => r.login === 'carol')
    expect(carol.repos).toBe(0)
    expect(carol.lastActive).toBeNull()
  })

  it('credits each actor with their own date, not the PR merge date (CodeRabbit #276)', () => {
    const pr = [{
      merged_by: 'bob', merged_at: '2026-01-10T00:00:00Z',
      reviewers: [{ login: 'alice', reviewed_at: '2026-01-01T00:00:00Z' }],
      repo: 'RepoX',
    }]
    const rows = computeMaintainerAttribution(pr)
    expect(rows.find(r => r.login === 'alice').lastActive).toBe('2026-01-01T00:00:00Z')
    expect(rows.find(r => r.login === 'bob').lastActive).toBe('2026-01-10T00:00:00Z')
  })
})
