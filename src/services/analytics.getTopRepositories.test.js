
import { describe, it, expect, vi, afterEach } from 'vitest'
import { getTopRepositories } from './analytics'

describe('getTopRepositories', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not let watchers_count affect repository scores', () => {
    vi.spyOn(Date, 'now').mockReturnValue(
      new Date('2026-01-01T00:00:00Z').getTime()
    )

    const baseRepo = {
      name: 'example-repo',
      stargazers_count: 100,
      forks_count: 10,
      pushed_at: '2025-01-01T00:00:00Z',
    }

    const withFewWatchers = {
      ...baseRepo,
      watchers_count: 1,
    }

    const withManyWatchers = {
      ...baseRepo,
      watchers_count: 10000,
    }

    const first = getTopRepositories([withFewWatchers], 1)[0]
    const second = getTopRepositories([withManyWatchers], 1)[0]

    expect(first.score).toBe(second.score)
    expect(first.score).toBe(120)
  })

  it('ranks repositories using stars, forks, and activity', () => {
    vi.spyOn(Date, 'now').mockReturnValue(
      new Date('2026-01-01T00:00:00Z').getTime()
    )

    const repos = [
      {
        name: 'less-popular',
        stargazers_count: 10,
        forks_count: 1,
        watchers_count: 10000,
        pushed_at: '2025-01-01T00:00:00Z',
      },
      {
        name: 'more-popular',
        stargazers_count: 100,
        forks_count: 10,
        watchers_count: 0,
        pushed_at: '2025-01-01T00:00:00Z',
      },
    ]

    const result = getTopRepositories(repos, 2)

    expect(result[0].name).toBe('more-popular')
    expect(result[0].score).toBe(120)
    expect(result[1].name).toBe('less-popular')
    expect(result[1].score).toBe(12)
  })
})
