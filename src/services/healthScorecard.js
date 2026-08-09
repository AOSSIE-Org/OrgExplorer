/**
 * Health Scorecard calculation service
 * Computes org-level metrics, dimension scores, and explicit letter grades.
 */

export function getHealthGrade(score) {
  if (score >= 95) return 'A+'
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

export function computeDimensionScores(model, issuesData = {}, hasAudit = false) {
  if (!model || !model.allRepos || model.allRepos.length === 0) {
    return {
      activity: 0,
      diversity: 0,
      compliance: 0,
      issueHealth: 0,
      hasAudit: false,
    }
  }

  const repos = model.allRepos

  // 1. Activity Dimension (0-100)
  // Percentage of active / thriving repos pushed within 90 days
  const now = Date.now()
  const recentPushes = repos.filter(r => {
    if (!r.pushed_at) return false
    const days = (now - new Date(r.pushed_at)) / 86_400_000
    return days <= 90
  }).length
  const activityScore = Math.round((recentPushes / repos.length) * 100)

  // 2. Maintainer Diversity Dimension (0-100)
  // Derived directly from bus factor & contributor counts
  let diversitySum = 0
  repos.forEach(r => {
    const bf = r.busFactor?.factor || (r.contributors ? r.contributors.length : 0)
    // Higher score for bus factor >= 2, scaled up to 100
    const repoDiv = Math.min(100, (bf >= 2 ? 60 : 20) + (r.contributors?.length || 0) * 8)
    diversitySum += repoDiv
  })
  const diversityScore = Math.round(diversitySum / repos.length)

  // 3. Compliance Dimension (0-100)
  // License presence among non-archived, non-fork repos
  const validRepos = repos.filter(r => !r.archived && !r.fork)
  const licensedRepos = validRepos.filter(r => Boolean(r.license)).length
  const complianceScore = validRepos.length > 0
    ? Math.round((licensedRepos / validRepos.length) * 100)
    : 100

  // 4. Issue / PR Health Dimension (0-100)
  // Only calculated if audit has been run, otherwise null to indicate Insufficient Data
  let issueHealthScore = null
  if (hasAudit && Object.keys(issuesData || {}).length > 0) {
    const allIssues = []
    Object.values(issuesData).forEach(issues => {
      if (Array.isArray(issues)) {
        issues.forEach(i => allIssues.push(i))
      }
    })

    if (allIssues.length > 0) {
      const closed = allIssues.filter(i => i.state === 'closed').length
      const resolutionRate = (closed / allIssues.length) * 100

      const daysSince = d => Math.floor((now - new Date(d)) / 86_400_000)
      const deadCount = allIssues.filter(i => i.state === 'open' && daysSince(i.created_at) >= 90).length
      const stalePenalty = Math.min(50, (deadCount / allIssues.length) * 100)

      issueHealthScore = Math.max(0, Math.round(resolutionRate * 0.7 + (100 - stalePenalty) * 0.3))
    } else {
      issueHealthScore = 100
    }
  }

  return {
    activity: Math.min(100, Math.max(0, activityScore)),
    diversity: Math.min(100, Math.max(0, diversityScore)),
    compliance: Math.min(100, Math.max(0, complianceScore)),
    issueHealth: issueHealthScore !== null ? Math.min(100, Math.max(0, issueHealthScore)) : null,
    hasAudit: issueHealthScore !== null,
  }
}

export function computeOrgHealthSummary(model, issuesData = {}, hasAudit = false) {
  if (!model || !model.allRepos || model.allRepos.length === 0) {
    return {
      score: 0,
      grade: 'F',
      riskCounts: { critical: 0, warning: 0, healthy: 0 },
      dimensions: { activity: 0, diversity: 0, compliance: 0, issueHealth: null, hasAudit: false },
      totalRepos: 0,
    }
  }

  const dimensions = computeDimensionScores(model, issuesData, hasAudit)

  // Compute aggregate score based on available dimensions
  let totalWeight = 0
  let weightedScore = 0

  // Activity: 30%
  weightedScore += dimensions.activity * 0.3
  totalWeight += 0.3

  // Diversity: 30%
  weightedScore += dimensions.diversity * 0.3
  totalWeight += 0.3

  // Compliance: 20%
  weightedScore += dimensions.compliance * 0.2
  totalWeight += 0.2

  // Issue / PR Health: 20% (if audit run, otherwise scale remaining weights)
  if (dimensions.hasAudit && dimensions.issueHealth !== null) {
    weightedScore += dimensions.issueHealth * 0.2
    totalWeight += 0.2
  }

  const finalScore = Math.round(weightedScore / totalWeight)
  const boundedScore = Math.min(100, Math.max(0, finalScore))
  const grade = getHealthGrade(boundedScore)

  return {
    score: boundedScore,
    grade,
    dimensions,
    totalRepos: model.allRepos.length,
  }
}
