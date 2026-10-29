import { describe, it, expect } from 'vitest'
import { buildAnalyticalModel, computeBusFactor, isBotContributor } from './analytics'

function makeRepo(name, overrides = {}) {
  return {
    name,
    pushed_at: new Date().toISOString(),
    open_issues_count: 0,
    stargazers_count: 0,
    forks_count: 0,
    ...overrides,
  }
}

function buildModel(repo, contributors) {
  return buildAnalyticalModel(
    [{ login: 'org-a' }],
    { 'org-a': [repo] },
    { [`org-a/${repo.name}`]: contributors },
    { 'org-a': [repo] }
  )
}

describe('isBotContributor', () => {
  it('detects accounts marked with type: Bot', () => {
    expect(isBotContributor({ login: 'ci-helper', type: 'Bot' })).toBe(true)
  })

  it('detects the [bot] login suffix when type is missing', () => {
    expect(isBotContributor({ login: 'dependabot[bot]' })).toBe(true)
  })

  it('matches type and suffix case-insensitively', () => {
    expect(isBotContributor({ login: 'x[BOT]', type: 'bot' })).toBe(true)
  })

  it('keeps human contributors', () => {
    expect(isBotContributor({ login: 'alice', type: 'User' })).toBe(false)
  })

  it('does not filter regular automation users without a bot marker', () => {
    expect(isBotContributor({ login: 'renovate-bot', type: 'User' })).toBe(false)
  })

  it('handles missing or malformed entries', () => {
    expect(isBotContributor(null)).toBe(false)
    expect(isBotContributor(undefined)).toBe(false)
    expect(isBotContributor({})).toBe(false)
    expect(isBotContributor({ login: null, type: null })).toBe(false)
  })
})

describe('buildAnalyticalModel bot filtering', () => {
  it('excludes type: Bot accounts from contributors and totalRepos data', () => {
    const repo = makeRepo('repo-a')
    const result = buildModel(repo, [
      { login: 'alice', type: 'User', contributions: 10 },
      { login: 'ci-helper', type: 'Bot', contributions: 90 },
    ])

    expect(result.contributors.map(c => c.login)).toEqual(['alice'])
    expect(result.totalRepos[0].contributors.map(c => c.login)).toEqual(['alice'])
  })

  it('excludes [bot] logins when the API omits type', () => {
    const repo = makeRepo('repo-a')
    const result = buildModel(repo, [
      { login: 'alice', type: 'User', contributions: 10 },
      { login: 'renovate[bot]', contributions: 50 },
    ])

    expect(result.contributors.map(c => c.login)).toEqual(['alice'])
    expect(result.totalRepos[0].contributors.map(c => c.login)).toEqual(['alice'])
  })

  it('keeps regular automation accounts that GitHub marks as User', () => {
    const repo = makeRepo('repo-a')
    const result = buildModel(repo, [
      { login: 'renovate-bot', type: 'User', contributions: 10 },
    ])

    expect(result.contributors.map(c => c.login)).toEqual(['renovate-bot'])
  })

  it('computes health diversity and bus factor over human contributors only', () => {
    const repo = makeRepo('repo-a')
    const result = buildModel(repo, [
      { login: 'alice', type: 'User', contributions: 40 },
      { login: 'bob', type: 'User', contributions: 35 },
      { login: 'ci[bot]', type: 'Bot', contributions: 25 },
    ])

    // 2 humans -> diversity 20 -> round(100*0.4 + 100*0.3 + 20*0.3) = 76.
    // Counting the bot would give 3 humans -> diversity 30 -> 79.
    expect(result.totalRepos[0].healthScore).toBe(76)

    // Alice owns 40/75 = 53.3% of human contributions, so the bus factor is 1.
    // Counting the bot would make her 40/100 = 40%, giving a bus factor of 2.
    expect(result.totalRepos[0].busFactor).toEqual({ factor: 1, risk: 'critical' })
    expect(result.contributors.map(c => c.login)).toEqual(['alice', 'bob'])
    expect(computeBusFactor(result.contributors)).toEqual({ factor: 1, risk: 'critical' })
  })

  it('does not let bots qualify as connectors or cross-org contributors', () => {
    const orgs = [{ login: 'org-a' }, { login: 'org-b' }]
    const repos = {
      'org-a': [makeRepo('r1'), makeRepo('r2'), makeRepo('r3')],
      'org-b': [makeRepo('r4')],
    }
    const human = { login: 'alice', type: 'User', contributions: 5 }
    const bot = { login: 'ci[bot]', type: 'Bot', contributions: 50 }
    const contribsPerRepo = {
      'org-a/r1': [human, bot],
      'org-a/r2': [human, bot],
      'org-a/r3': [human, bot],
      'org-b/r4': [bot],
    }

    const result = buildAnalyticalModel(orgs, repos, contribsPerRepo, repos)

    // Alice is a genuine connector across 3 repos. The bot touches 3 repos in
    // org-a and 1 in org-b, which would have made it both a connector and
    // cross-org contributor if bots were counted.
    expect(result.contributors.map(c => c.login)).toEqual(['alice'])
    expect(result.contributors[0].isConnector).toBe(true)
    expect(result.contributors[0].isCrossOrg).toBe(false)
  })

  it('leaves repositories without bots unchanged', () => {
    const repo = makeRepo('repo-a')
    const human = [{ login: 'alice', type: 'User', contributions: 10 }]
    const baseline = buildModel(repo, human)
    const withBot = buildModel(repo, [
      ...human,
      { login: 'dependabot[bot]', type: 'Bot', contributions: 90 },
    ])

    expect(withBot.totalRepos[0].healthScore).toBe(baseline.totalRepos[0].healthScore)
    expect(withBot.totalRepos[0].busFactor).toEqual(baseline.totalRepos[0].busFactor)
    expect(withBot.contributors.map(c => [c.login, c.totalContribs])).toEqual(
      baseline.contributors.map(c => [c.login, c.totalContribs])
    )
  })

  it('treats a repository with only bots as having no human contributors', () => {
    const repo = makeRepo('repo-a')
    const result = buildModel(repo, [
      { login: 'ci[bot]', type: 'Bot', contributions: 100 },
    ])

    expect(result.contributors).toEqual([])
    expect(result.totalRepos[0].contributors).toEqual([])
    expect(result.totalRepos[0].busFactor).toEqual({ factor: 0, risk: 'unknown' })
    expect(result.totalRepos[0].healthScore).toBe(70)
  })
})
