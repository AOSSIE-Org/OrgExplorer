import { describe, it, expect } from 'vitest'
import { selectPRsToEnrich } from './github'

describe('selectPRsToEnrich (per-repo)', () => {
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

  it('includes merged and closed-unmerged PRs from all repos', () => {
    const nums = selectPRsToEnrich(pullsData).map(p => p.number).sort((a, b) => a - b)
    expect(nums).toEqual([1, 3, 4])
  })

  it('sorts most-recent-first within each repo', () => {
    // OrgExplorer has #3 (09-05) and #1 (09-01) -> #3 before #1
    const oe = selectPRsToEnrich(pullsData).filter(p => p.repo === 'OrgExplorer').map(p => p.number)
    expect(oe).toEqual([3, 1])
  })

  it('carries org, repo, and dates on each selected PR', () => {
    const pictopy = selectPRsToEnrich(pullsData).find(p => p.number === 4)
    expect(pictopy.org).toBe('AOSSIE-Org')
    expect(pictopy.repo).toBe('PictoPy')
    expect(pictopy.merged_at).toBe('2026-09-08T00:00:00Z')
  })

  it('applies the cap per repo, not globally', () => {
    // cap=1 per repo -> 1 from OrgExplorer + 1 from PictoPy = 2 total
    const sel = selectPRsToEnrich(pullsData, 1)
    expect(sel).toHaveLength(2)
    // OrgExplorer keeps its most-recent (#3), not #1
    expect(sel.find(p => p.repo === 'OrgExplorer').number).toBe(3)
  })

  it('does not let a busy repo crowd out a quieter one', () => {
    // The key fix for #250: every repo is represented regardless of others' volume.
    const busy = {
      'AOSSIE-Org/Busy':  Array.from({ length: 50 }, (_, i) => ({
        number: 100 + i, state: 'closed', merged_at: '2026-09-20T00:00:00Z', updated_at: '2026-09-20T00:00:00Z',
      })),
      'AOSSIE-Org/Quiet': [
        { number: 5, state: 'closed', merged_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
      ],
    }
    const sel = selectPRsToEnrich(busy, 30)
    // Quiet repo's single old PR must still be present, despite Busy having 50 recent ones
    expect(sel.find(p => p.repo === 'Quiet')).toBeTruthy()
  })

  it('handles empty / malformed input', () => {
    expect(selectPRsToEnrich({})).toEqual([])
    expect(selectPRsToEnrich(undefined)).toEqual([])
    expect(() => selectPRsToEnrich({ 'x/y': null })).not.toThrow()
  })
})
  it('caps the total at totalCap across all repos', () => {
    // 20 repos x 10 PRs each = 200 candidates, but totalCap should bound it.
    const big = {}
    for (let r = 0; r < 20; r++) {
      big[`AOSSIE-Org/Repo${r}`] = Array.from({ length: 10 }, (_, i) => ({
        number: r * 100 + i, state: 'closed', merged_at: `2026-09-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`,
        updated_at: `2026-09-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`,
      }))
    }
    const sel = selectPRsToEnrich(big, 10, 150)
    expect(sel.length).toBe(150)
  })

  it('round-robins so every repo is represented before the cap is hit', () => {
    const big = {}
    for (let r = 0; r < 20; r++) {
      big[`AOSSIE-Org/Repo${r}`] = [
        { number: r, state: 'closed', merged_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
      ]
    }
    const sel = selectPRsToEnrich(big, 10, 150)
    // 20 repos x 1 PR = 20 total, all under cap, every repo present
    const repos = new Set(sel.map(p => p.repo))
    expect(repos.size).toBe(20)
  })