import { describe, it, expect } from 'vitest'
import { buildRepositoryCreationTimeline } from './repositoryCreationTimeline'

const repo = createdAt => ({ created_at: createdAt })

describe('buildRepositoryCreationTimeline', () => {
  it('sorts unsorted repositories, counts each period and includes quiet years', () => {
    const repos = [
      repo('2026-03-02T00:00:00Z'),
      repo('2024-12-31T23:00:00Z'),
      repo('2026-01-01T00:00:00Z'),
    ]
    const original = [...repos]

    expect(buildRepositoryCreationTimeline(repos)).toEqual([
      { period: '2024', created: 1, cumulative: 1 },
      { period: '2025', created: 0, cumulative: 1 },
      { period: '2026', created: 2, cumulative: 3 },
    ])
    expect(repos).toEqual(original)
  })

  it('fills monthly gaps across a year boundary without resetting the cumulative total', () => {
    expect(buildRepositoryCreationTimeline([
      repo('2025-12-01T00:00:00Z'), repo('2026-02-01T00:00:00Z'),
    ], 'monthly')).toEqual([
      { period: '2025-12', created: 1, cumulative: 1 },
      { period: '2026-01', created: 0, cumulative: 1 },
      { period: '2026-02', created: 1, cumulative: 2 },
    ])
  })

  it('uses UTC rather than the timestamp offset for month and year boundaries', () => {
    const repos = [repo('2026-01-01T00:30:00+05:30')]
    expect(buildRepositoryCreationTimeline(repos, 'monthly')).toEqual([
      { period: '2025-12', created: 1, cumulative: 1 },
    ])
    expect(buildRepositoryCreationTimeline(repos)).toEqual([
      { period: '2025', created: 1, cumulative: 1 },
    ])
  })

  it('ignores absent, empty, invalid and non-string dates', () => {
    const invalid = [repo(null), repo(undefined), repo(''), repo(' '), repo('bad-date'), repo(0)]
    expect(buildRepositoryCreationTimeline(invalid)).toEqual([])
    expect(buildRepositoryCreationTimeline([...invalid, repo('2026-01-01T00:00:00Z')])).toEqual([
      { period: '2026', created: 1, cumulative: 1 },
    ])
    expect(buildRepositoryCreationTimeline([])).toEqual([])
  })

  it('preserves the full loaded history rather than limiting the chart to recent periods', () => {
    const result = buildRepositoryCreationTimeline([
      repo('2024-01-01T00:00:00Z'), repo('2026-03-01T00:00:00Z'),
    ], 'monthly')
    expect(result).toHaveLength(27)
    expect(result[0]).toEqual({ period: '2024-01', created: 1, cumulative: 1 })
    expect(result.at(-1)).toEqual({ period: '2026-03', created: 1, cumulative: 2 })
  })
})
