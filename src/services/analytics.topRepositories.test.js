import { describe, it, expect } from 'vitest'
import { getTopRepositories } from './analytics'

function daysAgoISO(days) {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

describe('getTopRepositories', () => {
  it('returns empty array when given an empty repo list', () => {
    expect(getTopRepositories([])).toEqual([])
  })

  it('defaults to returning at most 10 repositories', () => {
    const repos = Array.from({ length: 15 }, (_, i) => ({
      name: `repo-${i}`,
      stargazers_count: i,
      forks_count: 0,
      watchers_count: 0,
      pushed_at: daysAgoISO(400),
    }))

    const result = getTopRepositories(repos)
    expect(result).toHaveLength(10)
    expect(result[0].name).toBe('repo-14')
    expect(result[9].name).toBe('repo-5')
  })

  it('respects a custom limit parameter', () => {
    const repos = [
      { name: 'repo-1', stargazers_count: 10, forks_count: 0, watchers_count: 0, pushed_at: daysAgoISO(400) },
      { name: 'repo-2', stargazers_count: 20, forks_count: 0, watchers_count: 0, pushed_at: daysAgoISO(400) },
      { name: 'repo-3', stargazers_count: 30, forks_count: 0, watchers_count: 0, pushed_at: daysAgoISO(400) },
    ]

    const result = getTopRepositories(repos, 2)
    expect(result).toHaveLength(2)
    expect(result.map(r => r.name)).toEqual(['repo-3', 'repo-2'])
  })

  it('calculates score using weighted stars, forks, watchers, and activity bonus', () => {
    const repo = {
      name: 'top-repo',
      stargazers_count: 10,
      forks_count: 5,
      watchers_count: 4,
      pushed_at: new Date().toISOString(),
    }

    const [result] = getTopRepositories([repo])
    expect(result.score).toBeCloseTo(208.5, 1)
  })

  it('gives zero activity bonus for repositories pushed over 365 days ago', () => {
    const repo = {
      name: 'old-repo',
      stargazers_count: 100,
      forks_count: 10,
      watchers_count: 10,
      pushed_at: daysAgoISO(400),
    }

    const [result] = getTopRepositories([repo])
    expect(result.score).toBe(135)
  })

  it('handles missing or non-numeric metrics gracefully', () => {
    const repo = {
      name: 'sparse-repo',
      pushed_at: null,
    }

    const [result] = getTopRepositories([repo])
    expect(result.score).toBe(0)
    expect(Number.isFinite(result.score)).toBe(true)
  })

  it('does not mutate the original input array', () => {
    const repos = [
      { name: 'b', stargazers_count: 5, pushed_at: daysAgoISO(400) },
      { name: 'a', stargazers_count: 10, pushed_at: daysAgoISO(400) },
    ]
    const copy = [...repos]

    getTopRepositories(repos)
    expect(repos[0].name).toBe(copy[0].name)
    expect(repos[1].name).toBe(copy[1].name)
  })
})
