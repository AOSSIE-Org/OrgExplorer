import { describe, it, expect } from 'vitest'
import { getHealthGrade, computeDimensionScores, computeOrgHealthSummary } from './healthScorecard'
import { classifyRepositoryRisk, generateRiskRecommendations } from './riskAdvisor'

function daysAgoISO(days) {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

describe('getHealthGrade', () => {
  it('maps explicit grade thresholds correctly', () => {
    expect(getHealthGrade(98)).toBe('A+')
    expect(getHealthGrade(95)).toBe('A+')
    expect(getHealthGrade(94)).toBe('A')
    expect(getHealthGrade(85)).toBe('A')
    expect(getHealthGrade(84)).toBe('B')
    expect(getHealthGrade(70)).toBe('B')
    expect(getHealthGrade(69)).toBe('C')
    expect(getHealthGrade(55)).toBe('C')
    expect(getHealthGrade(54)).toBe('D')
    expect(getHealthGrade(40)).toBe('D')
    expect(getHealthGrade(39)).toBe('F')
    expect(getHealthGrade(0)).toBe('F')
  })
})

describe('computeDimensionScores', () => {
  it('handles empty organization model gracefully', () => {
    const res = computeDimensionScores(null)
    expect(res).toEqual({
      activity: 0,
      diversity: 0,
      compliance: 0,
      issueHealth: 0,
      hasAudit: false,
    })
  })

  it('marks issueHealth as null when audit has not been run (Insufficient Data)', () => {
    const model = {
      allRepos: [
        { name: 'repo-1', pushed_at: daysAgoISO(10), license: { key: 'mit' }, busFactor: { factor: 3 } },
      ],
    }
    const dimensions = computeDimensionScores(model, {}, false)
    expect(dimensions.hasAudit).toBe(false)
    expect(dimensions.issueHealth).toBeNull()
  })

  it('calculates compliance based on license presence among non-archived non-fork repos', () => {
    const model = {
      allRepos: [
        { name: 'repo-licensed', license: { key: 'mit' }, archived: false, fork: false },
        { name: 'repo-no-license', license: null, archived: false, fork: false },
        { name: 'archived-no-license', license: null, archived: true, fork: false },
      ],
    }
    const dimensions = computeDimensionScores(model, {}, false)
    // 1 licensed out of 2 valid repos = 50%
    expect(dimensions.compliance).toBe(50)
  })
})

describe('computeOrgHealthSummary', () => {
  it('bounds score strictly between 0 and 100', () => {
    const model = {
      allRepos: [
        { name: 'repo-1', pushed_at: daysAgoISO(5), license: { key: 'mit' }, busFactor: { factor: 5 }, contributors: [1,2,3,4,5] },
      ],
    }
    const summary = computeOrgHealthSummary(model, {}, false)
    expect(summary.score).toBeGreaterThanOrEqual(0)
    expect(summary.score).toBeLessThanOrEqual(100)
  })
})

describe('classifyRepositoryRisk', () => {
  it('flags Bus Factor = 1 as Critical regardless of recency or license', () => {
    const repo = {
      name: 'repo-a',
      orgLogin: 'org',
      pushed_at: daysAgoISO(1),
      license: { key: 'mit' },
      busFactor: { factor: 1 },
    }
    const risk = classifyRepositoryRisk(repo)
    expect(risk.tier).toBe('critical')
    expect(risk.mainIssue).toContain('Bus Factor = 1')
  })

  it('flags Hibernating and Missing License as Warning', () => {
    const repo = {
      name: 'dormant-repo',
      orgLogin: 'org',
      pushed_at: daysAgoISO(200),
      activityClassification: 'Hibernating',
      license: null,
      busFactor: { factor: 3 },
    }
    const risk = classifyRepositoryRisk(repo)
    expect(risk.tier).toBe('warning')
  })

  it('detects hibernating repo from pushed_at when activityClassification is absent', () => {
    const repo = {
      name: 'old-push-repo',
      orgLogin: 'org',
      pushed_at: daysAgoISO(200),
      license: { key: 'mit' },
      busFactor: { factor: 3 },
    }
    const risk = classifyRepositoryRisk(repo)
    expect(risk.tier).toBe('warning')
    expect(risk.mainIssue).toContain('Hibernating')
  })

  it('classifies repos without risk signals as Healthy', () => {
    const repo = {
      name: 'healthy-repo',
      orgLogin: 'org',
      pushed_at: daysAgoISO(5),
      activityClassification: 'Thriving',
      license: { key: 'mit' },
      busFactor: { factor: 4 },
      contributors: [1, 2, 3, 4],
    }
    const risk = classifyRepositoryRisk(repo)
    expect(risk.tier).toBe('healthy')
  })
})

describe('generateRiskRecommendations', () => {
  it('sorts recommendations by priority (critical > warning > positive)', () => {
    const model = {
      allRepos: [
        {
          id: 1, name: 'healthy-repo', orgLogin: 'org', pushed_at: daysAgoISO(5),
          license: { key: 'mit' }, busFactor: { factor: 4 }, contributors: [1,2,3,4]
        },
        {
          id: 2, name: 'crit-repo', orgLogin: 'org', pushed_at: daysAgoISO(5),
          license: { key: 'mit' }, busFactor: { factor: 1 }, contributors: [1]
        },
        {
          id: 3, name: 'warn-repo', orgLogin: 'org', pushed_at: daysAgoISO(200),
          activityClassification: 'Hibernating', license: null, busFactor: { factor: 3 }
        },
      ],
    }

    const recs = generateRiskRecommendations(model, {})
    expect(recs.length).toBeGreaterThanOrEqual(3)
    expect(recs[0].severity).toBe('critical')
    expect(recs[1].severity).toBe('warning')
    expect(recs[recs.length - 1].severity).toBe('positive')
  })
})
