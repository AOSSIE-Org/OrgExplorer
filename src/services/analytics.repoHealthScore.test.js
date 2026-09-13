import { describe, it, expect } from 'vitest'
import { computeRepoHealthScore } from './analytics'

function daysAgoISO(days) {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

describe('computeRepoHealthScore', () => {
  describe('Bus Factor Pillar', () => {
    it('scores 0 / critical for 1 contributor', () => {
      const repo = {
        name: 'repo1',
        orgLogin: 'org1',
        contributors: [{ login: 'u1', contributions: 100 }]
      }
      const res = computeRepoHealthScore(repo)
      expect(res.pillars.busFactor).toMatchObject({
        score: 0,
        factor: 1,
        riskLevel: 'critical'
      })
    })

    it('scores 50 / warning when the bus factor is 2', () => {
      const repo = {
        name: 'repo1',
        orgLogin: 'org1',
        contributors: [
          { login: 'u1', contributions: 40 },
          { login: 'u2', contributions: 30 },
          { login: 'u3', contributions: 30 }
        ]
      }
      const res = computeRepoHealthScore(repo)
      expect(res.pillars.busFactor).toMatchObject({
        score: 50,
        factor: 2,
        riskLevel: 'warning'
      })
    })

    it('scores 80+ / healthy when the bus factor is 3', () => {
      const repo = {
        name: 'repo1',
        orgLogin: 'org1',
        contributors: [
          { login: 'u1', contributions: 25 },
          { login: 'u2', contributions: 25 },
          { login: 'u3', contributions: 25 },
          { login: 'u4', contributions: 25 }
        ]
      }
      const res = computeRepoHealthScore(repo)
      expect(res.pillars.busFactor).toMatchObject({
        score: 80,
        factor: 3,
        riskLevel: 'healthy'
      })
    })

    it('scores healthy for already-descending contributor distribution', () => {
      const repo = {
        name: 'repo1',
        orgLogin: 'org1',
        contributors: [
          { login: 'u1', contributions: 35 },
          { login: 'u2', contributions: 25 },
          { login: 'u3', contributions: 20 },
          { login: 'u4', contributions: 20 }
        ]
      }
      const res = computeRepoHealthScore(repo)
      expect(res.pillars.busFactor).toMatchObject({
        score: 50,
        factor: 2,
        riskLevel: 'warning'
      })
    })
  })

  describe('Compliance Pillar', () => {
    it('scores 100 when all 4 files are present', () => {
      const repo = {
        name: 'repo1',
        orgLogin: 'org1',
        license: { key: 'mit' },
        has_readme: true,
        has_contributing: true,
        has_security: true
      }
      const res = computeRepoHealthScore(repo)
      expect(res.pillars.compliance).toMatchObject({
        score: 100,
        riskLevel: 'healthy',
        checks: { license: true, readme: true, contributing: true, security: true }
      })
    })

    it('detects missing license, contributing, and security files', () => {
      const repo = {
        name: 'repo1',
        orgLogin: 'org1',
        license: null,
        has_readme: true,
        has_contributing: false,
        has_security: false
      }
      const res = computeRepoHealthScore(repo)
      expect(res.pillars.compliance).toMatchObject({
        score: 25,
        riskLevel: 'critical',
        checks: { license: false, readme: true, contributing: false, security: false }
      })
    })

    it('handles limited data gracefully when contributing and security are not checked', () => {
      const repo = {
        name: 'repo1',
        orgLogin: 'org1',
        license: { key: 'mit' },
        has_readme: true
      }
      const res = computeRepoHealthScore(repo)
      expect(res.pillars.compliance.score).toBe(100) // 2/2 known checks passed
      expect(res.pillars.compliance.label).toContain('Limited data')
    })

    it('handles unknown README state when not checked', () => {
      const repo = {
        name: 'repo1',
        orgLogin: 'org1',
        license: { key: 'mit' }
      }
      const res = computeRepoHealthScore(repo)
      expect(res.pillars.compliance.checks.readme).toBeNull()
      expect(res.pillars.compliance.score).toBe(100) // 1/1 known check passed
      expect(res.pillars.compliance.label).toContain('Limited data')
    })
  })

  describe('Activity Freshness Pillar', () => {
    it('scores 100 for today push', () => {
      const repo = { name: 'repo1', orgLogin: 'org1', pushed_at: daysAgoISO(0) }
      const res = computeRepoHealthScore(repo)
      expect(res.pillars.freshness.score).toBe(100)
    })

    it('scores ~92 for 30 days ago push', () => {
      const repo = { name: 'repo1', orgLogin: 'org1', pushed_at: daysAgoISO(30) }
      const res = computeRepoHealthScore(repo)
      expect(res.pillars.freshness.score).toBe(92)
    })

    it('scores ~51 for 180 days ago push', () => {
      const repo = { name: 'repo1', orgLogin: 'org1', pushed_at: daysAgoISO(180) }
      const res = computeRepoHealthScore(repo)
      expect(res.pillars.freshness.score).toBe(51)
      expect(res.pillars.freshness.riskLevel).toBe('warning')
    })

    it('scores 0 for 365+ days ago push', () => {
      const repo = { name: 'repo1', orgLogin: 'org1', pushed_at: daysAgoISO(400) }
      const res = computeRepoHealthScore(repo)
      expect(res.pillars.freshness.score).toBe(0)
      expect(res.pillars.freshness.riskLevel).toBe('critical')
    })
  })

  describe('Responsiveness Pillar', () => {
    it('scores 100 when there are no stale issues', () => {
      const repo = { name: 'repo1', orgLogin: 'org1' }
      const issues = [
        { state: 'open', updated_at: daysAgoISO(5) },
        { state: 'open', updated_at: daysAgoISO(10) }
      ]
      const res = computeRepoHealthScore(repo, issues)
      expect(res.pillars.responsiveness.score).toBe(100)
    })

    it('penalizes stale issue ratio', () => {
      const repo = { name: 'repo1', orgLogin: 'org1' }
      const issues = [
        { state: 'open', updated_at: daysAgoISO(100) }, // stale
        { state: 'open', updated_at: daysAgoISO(5) }
      ]
      const res = computeRepoHealthScore(repo, issues)
      // 50% stale -> baseScore = 50
      expect(res.pillars.responsiveness.score).toBe(50)
      expect(res.pillars.responsiveness.staleRatio).toBe(0.5)
    })

    it('applies zombie PR penalty', () => {
      const repo = { name: 'repo1', orgLogin: 'org1' }
      const issues = [
        { state: 'open', updated_at: daysAgoISO(5) },
        { pull_request: {}, state: 'open', created_at: daysAgoISO(100) }, // zombie PR (-5)
        { pull_request: {}, state: 'open', created_at: daysAgoISO(120) }  // zombie PR (-5)
      ]
      const res = computeRepoHealthScore(repo, issues)
      // baseScore = 100, zombiePenalty = 10 -> score = 90
      expect(res.pillars.responsiveness.score).toBe(90)
    })

    it('caps zombie PR penalty at 40 points', () => {
      const repo = { name: 'repo1', orgLogin: 'org1' }
      const issues = Array.from({ length: 9 }, () => ({
        pull_request: {},
        state: 'open',
        created_at: daysAgoISO(100)
      }))
      const res = computeRepoHealthScore(repo, issues)
      // baseScore = 100, 9 * 5 = 45 -> capped at 40 penalty -> score = 60
      expect(res.pillars.responsiveness.score).toBe(60)
    })

    it('clamps responsiveness score at 0 when stale ratio and penalty exceed 100', () => {
      const repo = { name: 'repo1', orgLogin: 'org1' }
      const issues = [
        { state: 'open', updated_at: daysAgoISO(100) }, // 100% stale -> baseScore = 0
        ...Array.from({ length: 9 }, () => ({
          pull_request: {},
          state: 'open',
          created_at: daysAgoISO(100)
        })) // max penalty = 40
      ]
      const res = computeRepoHealthScore(repo, issues)
      // baseScore = 0, penalty = 40 -> max(0, -40) = 0
      expect(res.pillars.responsiveness.score).toBe(0)
      expect(res.pillars.responsiveness.riskLevel).toBe('critical')
    })
  })

  describe('PR Resolution Rate Pillar', () => {
    it('scores 100 when all closed PRs were merged', () => {
      const repo = { name: 'repo1', orgLogin: 'org1' }
      const pulls = [
        { state: 'closed', merged_at: daysAgoISO(10) },
        { state: 'closed', merged_at: daysAgoISO(20) }
      ]
      const res = computeRepoHealthScore(repo, [], pulls)
      expect(res.pillars.prResolution.score).toBe(100)
      expect(res.pillars.prResolution.mergeRate).toBe(1)
    })

    it('calculates merge rate for mixed merged/unmerged closed PRs', () => {
      const repo = { name: 'repo1', orgLogin: 'org1' }
      const pulls = [
        { state: 'closed', merged_at: daysAgoISO(10) },
        { state: 'closed', merged_at: daysAgoISO(20) },
        { state: 'closed', merged_at: null },
        { state: 'closed', merged_at: null }
      ]
      const res = computeRepoHealthScore(repo, [], pulls)
      expect(res.pillars.prResolution.score).toBe(50)
      expect(res.pillars.prResolution.mergeRate).toBe(0.5)
    })

    it('returns score: null when there is insufficient PR history', () => {
      const repo = { name: 'repo1', orgLogin: 'org1' }
      const pulls = [
        { state: 'open', merged_at: null }
      ]
      const res = computeRepoHealthScore(repo, [], pulls)
      expect(res.pillars.prResolution.score).toBeNull()
      expect(res.pillars.prResolution.label).toBe('Insufficient data')
    })
  })

  describe('Overall Score & Weight Normalization', () => {
    it('normalizes weights correctly when PR resolution data is unavailable', () => {
      const repo = {
        name: 'repo1',
        orgLogin: 'org1',
        contributors: [{ login: 'u1', contributions: 20 }, { login: 'u2', contributions: 20 }, { login: 'u3', contributions: 20 }, { login: 'u4', contributions: 40 }], // score 80
        pushed_at: daysAgoISO(0), // freshness score 100
        license: { key: 'mit' },
        has_readme: true // compliance score 100
      }
      const issues = [{ state: 'open', updated_at: daysAgoISO(5) }] // responsiveness score 100
      // prResolution score: null
      const res = computeRepoHealthScore(repo, issues, [])

      // Available weights: 20 * 4 = 80. Weighted sum: 80*20 + 100*20 + 100*20 + 100*20 = 7600
      // 7600 / 80 = 95
      expect(res.overallScore).toBe(95)
      expect(res.riskLevel).toBe('healthy')
    })
  })

  describe('Recommendations Engine', () => {
    it('generates recommendations for single maintainer, missing license, stale issues', () => {
      const repo = {
        name: 'repo1',
        orgLogin: 'org1',
        contributors: [{ login: 'u1', contributions: 100 }], // single maintainer
        license: null, // missing license
        has_readme: true,
        pushed_at: daysAgoISO(200) // inactive > 180 days
      }
      const issues = [
        { state: 'open', updated_at: daysAgoISO(100) },
        { state: 'open', updated_at: daysAgoISO(120) }
      ] // 100% stale issues
      const pulls = [
        { state: 'closed', merged_at: null },
        { state: 'closed', merged_at: null },
        { state: 'closed', merged_at: null },
        { state: 'closed', merged_at: daysAgoISO(10) }
      ] // 25% merge rate

      const res = computeRepoHealthScore(repo, issues, pulls)
      const msgs = res.recommendations.map(r => r.message)

      expect(msgs).toContain('Single maintainer risk detected — recruit additional contributors')
      expect(msgs).toContain('No license found — add a license to clarify open-source usage')
      expect(msgs).toContain('No recent commits — consider re-activating or archiving the repository')
      expect(msgs).toContain('Over 50% of open issues are stale — consider a triage sprint')
      expect(msgs).toContain('Low PR merge rate — review PR acceptance criteria or contributor guidance')
    })

    it('returns empty recommendations for a healthy repository', () => {
      const repo = {
        name: 'repo1',
        orgLogin: 'org1',
        contributors: [
          { login: 'u1', contributions: 25 },
          { login: 'u2', contributions: 25 },
          { login: 'u3', contributions: 25 },
          { login: 'u4', contributions: 25 }
        ],
        license: { key: 'mit' },
        has_readme: true,
        has_contributing: true,
        has_security: true,
        pushed_at: daysAgoISO(5)
      }
      const issues = [{ state: 'open', updated_at: daysAgoISO(5) }]
      const pulls = [{ state: 'closed', merged_at: daysAgoISO(5) }]
      const res = computeRepoHealthScore(repo, issues, pulls)
      expect(res.recommendations).toHaveLength(0)
    })

    it('generates recommendations for missing README, CONTRIBUTING, and SECURITY files', () => {
      const repo = {
        name: 'repo1',
        orgLogin: 'org1',
        license: { key: 'mit' },
        has_readme: false,
        has_contributing: false,
        has_security: false,
        contributors: [
          { login: 'u1', contributions: 25 },
          { login: 'u2', contributions: 25 },
          { login: 'u3', contributions: 25 },
          { login: 'u4', contributions: 25 }
        ],
        pushed_at: daysAgoISO(5)
      }
      const res = computeRepoHealthScore(repo)
      const msgs = res.recommendations.map(r => r.message)
      expect(msgs).toContain('Add README.md to describe project purpose and setup')
      expect(msgs).toContain('Add CONTRIBUTING.md to guide new contributors')
      expect(msgs).toContain('Add SECURITY.md to define the vulnerability disclosure process')
    })
  })
})
