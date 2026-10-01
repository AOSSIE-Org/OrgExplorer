/**
 * Risk Advisor Service
 * Rule engine for signal-based repository risk classification and automated recommendations.
 */

export function classifyRepositoryRisk(repo, issuesData = {}) {
  if (!repo) return { tier: 'healthy', mainIssue: 'No data', reasons: [] }

  const reasons = []

  // Signal 1: Bus Factor = 1 is ALWAYS Critical
  const busFactor = repo.busFactor?.factor ?? (repo.contributors ? repo.contributors.length : 0)
  if (busFactor === 1) {
    reasons.push('Bus Factor = 1 (Single maintainer dependency)')
  }

  // Check critical status
  if (reasons.length > 0) {
    return {
      tier: 'critical',
      mainIssue: reasons[0],
      reasons,
    }
  }

  // Signal 2: Warning signals (Hibernating, missing license, high stale ratio)
  const daysSincePush = repo.pushed_at ? (Date.now() - new Date(repo.pushed_at)) / 86_400_000 : null
  const isHibernating = repo.activityClassification === 'Hibernating' || (daysSincePush !== null && daysSincePush > 180)
  if (isHibernating) {
    reasons.push('Hibernating (No pushes in >180 days)')
  }

  const isMissingLicense = !repo.license && !repo.archived && !repo.fork
  if (isMissingLicense) {
    reasons.push('Missing LICENSE file')
  }

  // Check repo-specific issue audit data if available
  const key = `${repo.orgLogin}/${repo.name}`
  const repoIssues = issuesData[key] || []
  if (repoIssues.length > 0) {
    const daysSince = d => Math.floor((Date.now() - new Date(d)) / 86_400_000)
    const openIssues = repoIssues.filter(i => i.state === 'open')
    const staleCount = openIssues.filter(i => daysSince(i.created_at) >= 90).length
    const staleRatio = openIssues.length > 0 ? (staleCount / openIssues.length) * 100 : 0
    if (staleRatio > 25) {
      reasons.push(`High stale issue ratio (${staleRatio.toFixed(0)}%)`)
    }
  }

  if (reasons.length > 0) {
    return {
      tier: 'warning',
      mainIssue: reasons[0],
      reasons,
    }
  }

  return {
    tier: 'healthy',
    mainIssue: 'No critical or warning risk signals',
    reasons: [],
  }
}

export function generateRiskRecommendations(model, issuesData = {}) {
  if (!model || !model.allRepos || model.allRepos.length === 0) {
    return []
  }

  const recommendations = []

  model.allRepos.forEach(repo => {
    const risk = classifyRepositoryRisk(repo, issuesData)

    if (risk.tier === 'critical') {
      recommendations.push({
        id: `rec-crit-${repo.id || repo.name}`,
        severity: 'critical',
        repoName: repo.name,
        orgLogin: repo.orgLogin,
        title: `Bus Factor = 1 in ${repo.name}`,
        description: `Repository relies on a single contributor. Consider recruiting co-maintainers to mitigate single-point-of-failure risk.`,
        action: 'Review Contributors',
        htmlUrl: repo.html_url || `https://github.com/${repo.orgLogin}/${repo.name}`,
      })
    } else if (risk.tier === 'warning') {
      let desc = risk.mainIssue
      if (risk.reasons.includes('Missing LICENSE file')) {
        desc = `Non-archived repository lacks a license file. Add an open-source license to ensure legal compliance.`
      } else if (risk.reasons.some(r => r.includes('Hibernating'))) {
        desc = `No code pushed for >180 days. Evaluate if project is active or should be archived.`
      } else if (risk.reasons.some(r => r.includes('stale issue ratio'))) {
        desc = `Over 25% of open items are untouched for 90+ days. Triage or close stale items.`
      }

      recommendations.push({
        id: `rec-warn-${repo.id || repo.name}`,
        severity: 'warning',
        repoName: repo.name,
        orgLogin: repo.orgLogin,
        title: `${risk.mainIssue} in ${repo.name}`,
        description: desc,
        action: 'Inspect Repository',
        htmlUrl: repo.html_url || `https://github.com/${repo.orgLogin}/${repo.name}`,
      })
    }
  })

  // Add positive highlight recommendation if org has thriving repos
  const healthyRepos = model.allRepos.filter(r => classifyRepositoryRisk(r, issuesData).tier === 'healthy')
  if (healthyRepos.length > 0) {
    recommendations.push({
      id: 'rec-positive-org',
      severity: 'positive',
      repoName: `${healthyRepos.length} Repositories`,
      orgLogin: model.allRepos[0]?.orgLogin || 'Org',
      title: `${healthyRepos.length} repositories are operating in Healthy status`,
      description: `Active push frequency, license compliance, and distributed maintainer participation detected across these repositories.`,
      action: 'View All Repos',
    })
  }

  // Priority sorting: critical > warning > positive
  const severityRank = { critical: 1, warning: 2, positive: 3 }
  return recommendations.sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
}
