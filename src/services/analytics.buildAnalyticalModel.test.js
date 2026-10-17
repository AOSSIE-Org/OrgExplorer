import { describe, it, expect } from 'vitest'
import { buildAnalyticalModel } from './analytics'

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

describe('buildAnalyticalModel', () => {
  it('populates totalRepos from totalReposPerOrg, including repos with no contributor data', () => {
    const orgs = [{ login: 'org-a' }]
    const repoA = makeRepo('repo-a')
    const repoB = makeRepo('repo-b') // exists only in the "total" fetch, not scoped

    const reposPerOrg = { 'org-a': [repoA] } // scoped (e.g. top-10 without PAT)
    const totalReposPerOrg = { 'org-a': [repoA, repoB] } // full fetch
    const contribsPerRepo = {
      'org-a/repo-a': [{ login: 'alice', contributions: 10 }],
      // no entry for repo-b
    }

    const result = buildAnalyticalModel(orgs, reposPerOrg, contribsPerRepo, totalReposPerOrg)

    expect(result.totalRepos).toHaveLength(2)
    const repoBResult = result.totalRepos.find(r => r.name === 'repo-b')
    expect(repoBResult.contributors).toEqual([])
    expect(repoBResult.busFactor).toEqual({ factor: 0, risk: 'unknown' })
    expect(repoBResult.orgLogin).toBe('org-a')
  })

  it('populates allRepos only from the scoped reposPerOrg, not from totalReposPerOrg', () => {
    const orgs = [{ login: 'org-a' }]
    const repoA = makeRepo('repo-a')
    const repoB = makeRepo('repo-b')

    const reposPerOrg = { 'org-a': [repoA] }
    const totalReposPerOrg = { 'org-a': [repoA, repoB] }
    const contribsPerRepo = {}

    const result = buildAnalyticalModel(orgs, reposPerOrg, contribsPerRepo, totalReposPerOrg)

    expect(result.allRepos).toHaveLength(1)
    expect(result.allRepos[0].name).toBe('repo-a')
  })

  it('does NOT include a contributor whose only appearance is in a totalRepos-only repo', () => {
    // repo-b has contributor data in contribsPerRepo, but repo-b is only in
    // totalReposPerOrg, not reposPerOrg. The contributor map is built solely
    // from the reposPerOrg loop, so this contributor must not appear.
    const orgs = [{ login: 'org-a' }]
    const repoA = makeRepo('repo-a')
    const repoB = makeRepo('repo-b')

    const reposPerOrg = { 'org-a': [repoA] }
    const totalReposPerOrg = { 'org-a': [repoA, repoB] }
    const contribsPerRepo = {
      'org-a/repo-b': [{ login: 'ghost-contributor', avatar_url: '', contributions: 5 }],
    }

    const result = buildAnalyticalModel(orgs, reposPerOrg, contribsPerRepo, totalReposPerOrg)

    expect(result.contributors.find(c => c.login === 'ghost-contributor')).toBeUndefined()
  })

  it('deduplicates a contributor appearing across multiple scoped repos, summing contributions', () => {
    const orgs = [{ login: 'org-a' }]
    const repoA = makeRepo('repo-a')
    const repoB = makeRepo('repo-b')

    const reposPerOrg = { 'org-a': [repoA, repoB] }
    const totalReposPerOrg = { 'org-a': [repoA, repoB] }
    const contribsPerRepo = {
      'org-a/repo-a': [{ login: 'alice', avatar_url: '', contributions: 10 }],
      'org-a/repo-b': [{ login: 'alice', avatar_url: '', contributions: 15 }],
    }

    const result = buildAnalyticalModel(orgs, reposPerOrg, contribsPerRepo, totalReposPerOrg)

    expect(result.contributors).toHaveLength(1)
    expect(result.contributors[0].totalContribs).toBe(25)
    expect(result.contributors[0].repos).toHaveLength(2)
  })

  it('marks a contributor as isConnector once they appear in 3+ scoped repos', () => {
    const orgs = [{ login: 'org-a' }]
    const repos = [makeRepo('r1'), makeRepo('r2'), makeRepo('r3')]

    const reposPerOrg = { 'org-a': repos }
    const totalReposPerOrg = { 'org-a': repos }
    const contribsPerRepo = Object.fromEntries(
      repos.map(r => [`org-a/${r.name}`, [{ login: 'carol', avatar_url: '', contributions: 1 }]])
    )

    const result = buildAnalyticalModel(orgs, reposPerOrg, contribsPerRepo, totalReposPerOrg)

    expect(result.contributors[0].isConnector).toBe(true)
  })

  it('does not mark a contributor as isConnector with fewer than 3 scoped repos', () => {
    const orgs = [{ login: 'org-a' }]
    const repos = [makeRepo('r1'), makeRepo('r2')]

    const reposPerOrg = { 'org-a': repos }
    const totalReposPerOrg = { 'org-a': repos }
    const contribsPerRepo = Object.fromEntries(
      repos.map(r => [`org-a/${r.name}`, [{ login: 'dave', avatar_url: '', contributions: 1 }]])
    )

    const result = buildAnalyticalModel(orgs, reposPerOrg, contribsPerRepo, totalReposPerOrg)

    expect(result.contributors[0].isConnector).toBe(false)
  })

  it('marks a contributor as isCrossOrg when they appear in 2+ orgs', () => {
    const orgs = [{ login: 'org-a' }, { login: 'org-b' }]
    const repoA = makeRepo('repo-a')
    const repoB = makeRepo('repo-b')

    const reposPerOrg = { 'org-a': [repoA], 'org-b': [repoB] }
    const totalReposPerOrg = { 'org-a': [repoA], 'org-b': [repoB] }
    const contribsPerRepo = {
      'org-a/repo-a': [{ login: 'erin', avatar_url: '', contributions: 5 }],
      'org-b/repo-b': [{ login: 'erin', avatar_url: '', contributions: 5 }],
    }

    const result = buildAnalyticalModel(orgs, reposPerOrg, contribsPerRepo, totalReposPerOrg)

    expect(result.contributors[0].isCrossOrg).toBe(true)
    expect(result.contributors[0].orgs.sort()).toEqual(['org-a', 'org-b'])
  })

  it('sorts contributors by totalContribs descending', () => {
    const orgs = [{ login: 'org-a' }]
    const repoA = makeRepo('repo-a')

    const reposPerOrg = { 'org-a': [repoA] }
    const totalReposPerOrg = { 'org-a': [repoA] }
    const contribsPerRepo = {
      'org-a/repo-a': [
        { login: 'low', avatar_url: '', contributions: 5 },
        { login: 'high', avatar_url: '', contributions: 50 },
        { login: 'mid', avatar_url: '', contributions: 20 },
      ],
    }

    const result = buildAnalyticalModel(orgs, reposPerOrg, contribsPerRepo, totalReposPerOrg)

    expect(result.contributors.map(c => c.login)).toEqual(['high', 'mid', 'low'])
  })

  it('handles an org with zero repos without throwing', () => {
    const orgs = [{ login: 'empty-org' }]
    const result = buildAnalyticalModel(orgs, { 'empty-org': [] }, {}, { 'empty-org': [] })

    expect(result.allRepos).toEqual([])
    expect(result.totalRepos).toEqual([])
    expect(result.contributors).toEqual([])
  })
})
