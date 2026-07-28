import { describe, it, expect } from 'vitest'
import { buildTimeSeries } from './analytics'

describe('buildTimeSeries', () => {
  it('buckets a plain issue by its created_at month', () => {
    const issues = [{ created_at: '2026-03-15T00:00:00Z' }]

    const result = buildTimeSeries(issues, 'monthly')

    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-03')
    expect(result[0].issues_created).toBe(1)
    expect(result[0].prs_created).toBe(0)
  })

  it('counts a pull_request item as a PR, not an issue', () => {
    const issues = [{ created_at: '2026-03-15T00:00:00Z', pull_request: {} }]

    const result = buildTimeSeries(issues, 'monthly')

    expect(result[0].prs_created).toBe(1)
    expect(result[0].issues_created).toBe(0)
  })

  it('buckets closed_at into the correct month, separate from created_at', () => {
    const issues = [{
      created_at: '2026-01-01T00:00:00Z',
      closed_at: '2026-02-01T00:00:00Z',
    }]

    const result = buildTimeSeries(issues, 'monthly')

    const jan = result.find(r => r.date === '2026-01')
    const feb = result.find(r => r.date === '2026-02')

    expect(jan.issues_created).toBe(1)
    expect(jan.issues_closed).toBe(0)
    expect(feb.issues_closed).toBe(1)
    expect(feb.issues_created).toBe(0)
  })

  it('buckets a merged PR into prs_merged using pull_request.merged_at, not closed_at', () => {
    const issues = [{
      created_at: '2026-01-01T00:00:00Z',
      closed_at: '2026-01-05T00:00:00Z',
      pull_request: { merged_at: '2026-01-05T00:00:00Z' },
    }]

    const result = buildTimeSeries(issues, 'monthly')
    const jan = result.find(r => r.date === '2026-01')

    expect(jan.prs_created).toBe(1)
    expect(jan.prs_closed).toBe(1)
    expect(jan.prs_merged).toBe(1)
  })

  it('does not count prs_merged for a closed-but-not-merged PR', () => {
    const issues = [{
      created_at: '2026-01-01T00:00:00Z',
      closed_at: '2026-01-05T00:00:00Z',
      pull_request: { merged_at: null },
    }]

    const result = buildTimeSeries(issues, 'monthly')
    const jan = result.find(r => r.date === '2026-01')

    expect(jan.prs_closed).toBe(1)
    expect(jan.prs_merged).toBe(0)
  })

  it('produces one bucket per week when granularity is weekly, distinct from monthly', () => {
    const issues = [
      { created_at: '2026-01-01T00:00:00Z' },
      { created_at: '2026-01-08T00:00:00Z' },
    ]

    const weekly = buildTimeSeries(issues, 'weekly')

    // Two different weeks -> two buckets, and week-format labels
    expect(weekly.length).toBeGreaterThanOrEqual(1)
    weekly.forEach(bucket => expect(bucket.date).toMatch(/^\d{4}-W\d{2}$/))
  })

  it('sorts buckets chronologically', () => {
    const issues = [
      { created_at: '2026-03-01T00:00:00Z' },
      { created_at: '2026-01-01T00:00:00Z' },
      { created_at: '2026-02-01T00:00:00Z' },
    ]

    const result = buildTimeSeries(issues, 'monthly')

    expect(result.map(r => r.date)).toEqual(['2026-01', '2026-02', '2026-03'])
  })

  it('returns at most the last 12 buckets when more months are present', () => {
    const issues = Array.from({ length: 15 }, (_, i) => ({
      created_at: `2025-${String((i % 12) + 1).padStart(2, '0')}-01T00:00:00Z`,
    }))
    // Construct 15 distinct months across two years to exceed the 12-bucket cap
    const spreadIssues = Array.from({ length: 15 }, (_, i) => {
      const year = 2025 + Math.floor(i / 12)
      const month = (i % 12) + 1
      return { created_at: `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z` }
    })

    const result = buildTimeSeries(spreadIssues, 'monthly')

    expect(result.length).toBeLessThanOrEqual(12)
  })

  it('returns an empty array when given no issues', () => {
    expect(buildTimeSeries([], 'monthly')).toEqual([])
  })

  it('ignores an item with no created_at and no closed_at', () => {
    const result = buildTimeSeries([{ created_at: null }], 'monthly')
    expect(result).toEqual([])
  })
})
