import { describe, it, expect } from 'vitest'
import {
  computeHealthScore,
  computeActivityClassification,
  computeBusFactor,
} from './analytics'

function daysAgoISO(days) {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

describe('computeHealthScore', () => {
  it('scores a freshly pushed, issue-free repo with 2 contributors at 76', () => {
    // activity = 100 - 0 = 100
    // issueHealth = 100 - (0 / (0+10)) * 100 = 100
    // diversity = min(100, 2 * 10) = 20
    // score = round(100*0.4 + 100*0.3 + 20*0.3) = round(40 + 30 + 6) = 76
    const repo = { pushed_at: new Date().toISOString(), open_issues_count: 0 }

    expect(computeHealthScore(repo, 2)).toBe(76)
  })

  it('lowers the score as open issue count grows relative to the +10 baseline', () => {
    const freshRepo = pushed => ({ pushed_at: pushed, open_issues_count: 0 })

    const noIssues = computeHealthScore({ ...freshRepo(new Date().toISOString()), open_issues_count: 0 }, 0)
    const manyIssues = computeHealthScore({ ...freshRepo(new Date().toISOString()), open_issues_count: 90 }, 0)

    expect(manyIssues).toBeLessThan(noIssues)
  })

  it('caps diversity contribution at 100 once contributor count reaches 10', () => {
    const repo = { pushed_at: new Date().toISOString(), open_issues_count: 0 }

    const at10 = computeHealthScore(repo, 10)
    const at50 = computeHealthScore(repo, 50)

    // diversity is min(100, count*10) for both -> identical score
    expect(at10).toBe(at50)
  })

  it('lowers activity score as days since last push increases', () => {
    const recentRepo = { pushed_at: daysAgoISO(5), open_issues_count: 0 }
    const staleRepo = { pushed_at: daysAgoISO(95), open_issues_count: 0 }

    expect(computeHealthScore(recentRepo, 5)).toBeGreaterThan(
      computeHealthScore(staleRepo, 5)
    )
  })

  it('never returns a negative score for a very old, issue-heavy repo', () => {
    const repo = { pushed_at: daysAgoISO(1000), open_issues_count: 500 }

    expect(computeHealthScore(repo, 0)).toBeGreaterThanOrEqual(0)
  })
})

describe('computeActivityClassification', () => {
  it('classifies a repo pushed within 30 days as Thriving', () => {
    expect(computeActivityClassification({ pushed_at: daysAgoISO(10) })).toBe('Thriving')
  })

  it('classifies a repo pushed within 31-90 days as Active', () => {
    expect(computeActivityClassification({ pushed_at: daysAgoISO(60) })).toBe('Active')
  })

  it('classifies a repo pushed within 91-180 days as Dormant', () => {
    expect(computeActivityClassification({ pushed_at: daysAgoISO(120) })).toBe('Dormant')
  })

  it('classifies a repo pushed more than 180 days ago as Hibernating', () => {
    expect(computeActivityClassification({ pushed_at: daysAgoISO(200) })).toBe('Hibernating')
  })

  it('treats the exact 30-day boundary as Thriving (inclusive)', () => {
    expect(computeActivityClassification({ pushed_at: daysAgoISO(30) })).toBe('Thriving')
  })
})

describe('computeBusFactor', () => {
  it('returns unknown/0 for an empty contributor list', () => {
    expect(computeBusFactor([])).toEqual({ factor: 0, risk: 'unknown' })
  })

  it('returns unknown/0 when total contributions sum to zero', () => {
    const contributors = [{ contributions: 0 }, { contributions: 0 }]
    expect(computeBusFactor(contributors)).toEqual({ factor: 0, risk: 'unknown' })
  })

  it('flags critical risk when one contributor alone exceeds 50% of contributions', () => {
    const contributors = [{ contributions: 60 }, { contributions: 40 }]
    // cum after contributor 1: 60/100 = 0.6 > 0.5 -> factor 1
    expect(computeBusFactor(contributors)).toEqual({ factor: 1, risk: 'critical' })
  })

  it('flags high risk when it takes exactly 2 contributors to exceed 50%', () => {
    const contributors = [{ contributions: 30 }, { contributions: 30 }, { contributions: 40 }]
    // cum after 1: 30/100=0.3 (not >0.5); cum after 2: 60/100=0.6>0.5 -> factor 2
    expect(computeBusFactor(contributors)).toEqual({ factor: 2, risk: 'high' })
  })

  it('flags healthy risk when it takes 3+ contributors to exceed 50%', () => {
    const contributors = [
      { contributions: 20 }, { contributions: 20 }, { contributions: 20 }, { contributions: 40 },
    ]
    // cum: 20/100=.2, 40/100=.4, 60/100=.6>0.5 -> factor 3
    expect(computeBusFactor(contributors)).toEqual({ factor: 3, risk: 'healthy' })
  })

  it('respects contributor order — cumulative sum is positional, not sorted', () => {
    // Smallest contributor listed first; still accumulates in list order
    const contributors = [{ contributions: 10 }, { contributions: 90 }]
    // cum after 1: 10/100=.1; cum after 2: 100/100=1.0>0.5 -> factor 2
    expect(computeBusFactor(contributors)).toEqual({ factor: 2, risk: 'high' })
  })
})
