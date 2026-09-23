//  Repo Health Indicator
// Activity (40%) + Issue Health (30%) + Diversity (30%)
export function computeHealthScore(repo, contributorCount = 0) {
  const daysSince   = (Date.now() - new Date(repo.pushed_at)) / 86_400_000
  const activity    = Math.max(0, 100 - daysSince)
  const total       = (repo.open_issues_count || 0) + 10
  const issueHealth = Math.max(0, 100 - (repo.open_issues_count / total) * 100)
  const diversity   = Math.min(100, contributorCount * 10)
  return Math.round(activity * 0.4 + issueHealth * 0.3 + diversity * 0.3)
}

/**
 * Detailed breakdown of health score components, weights, metrics, and formula.
 */
export function computeHealthBreakdown(repo, contributorCount = 0) {
  const pushedAtMs = repo?.pushed_at ? new Date(repo.pushed_at).getTime() : NaN
  const daysSince = Number.isFinite(pushedAtMs) ? Math.max(0, (Date.now() - pushedAtMs) / 86_400_000) : 365
  const activity = Math.max(0, 100 - daysSince)

  const openIssues = repo?.open_issues_count || 0
  const total = openIssues + 10
  const issueHealth = Math.max(0, 100 - (openIssues / total) * 100)

  const diversity = Math.min(100, (contributorCount || 0) * 10)

  const activityWeighted = activity * 0.4
  const issueHealthWeighted = issueHealth * 0.3
  const diversityWeighted = diversity * 0.3
  const overall = Math.round(activityWeighted + issueHealthWeighted + diversityWeighted)

  return {
    overall,
    categories: [
      {
        id: 'activity',
        name: 'Activity Health',
        score: Math.round(activity),
        weight: 0.4,
        weightedScore: Number(activityWeighted.toFixed(1)),
        metrics: [
          { label: 'Last Push', value: repo?.pushed_at ? repo.pushed_at.slice(0, 10) : 'No recorded push' },
          { label: 'Days Since Push', value: Number.isFinite(pushedAtMs) ? Math.floor(daysSince) : 'Unknown' },
          { label: 'Status', value: computeActivityClassification(repo) }
        ],
        description: 'Measures recent maintenance activity and commit momentum. Repositories updated within the last 30 days earn the highest score.'
      },
      {
        id: 'issues',
        name: 'Issue Health',
        score: Math.round(issueHealth),
        weight: 0.3,
        weightedScore: Number(issueHealthWeighted.toFixed(1)),
        metrics: [
          { label: 'Open Issues', value: openIssues },
          { label: 'Issue Load Ratio', value: `${Math.round((openIssues / total) * 100)}%` }
        ],
        description: 'Evaluates issue maintenance burden. A lower backlog relative to project scale yields a healthier score.'
      },
      {
        id: 'diversity',
        name: 'Contributor Diversity',
        score: Math.round(diversity),
        weight: 0.3,
        weightedScore: Number(diversityWeighted.toFixed(1)),
        metrics: [
          { label: 'Contributors', value: contributorCount },
          { label: 'Target Base', value: '10+ contributors' }
        ],
        description: 'Reflects contributor spread and project resilience. Projects with 10 or more contributors reach maximum diversity score.'
      }
    ]
  }
}

/**
 * Actionable recommendations based on repository signals and metrics.
 */
export function getHealthRecommendations(repo, contributorCount = 0) {
  const recommendations = []
  const pushedAtMs = repo?.pushed_at ? new Date(repo.pushed_at).getTime() : NaN
  const daysSince = Number.isFinite(pushedAtMs) ? Math.max(0, (Date.now() - pushedAtMs) / 86_400_000) : 365
  const openIssues = repo?.open_issues_count || 0

  // 1. Activity & Recency
  if (daysSince > 180) {
    recommendations.push({
      type: 'critical',
      category: 'Activity',
      title: 'Resume Development & Push Updates',
      description: `Repository has been inactive for ${Math.floor(daysSince)} days (Hibernating). Regular commits and maintenance prevent code rot and signal active stewardship.`
    })
  } else if (daysSince > 90) {
    recommendations.push({
      type: 'warning',
      category: 'Activity',
      title: 'Address Inactivity',
      description: `Last push was ${Math.floor(daysSince)} days ago (Dormant). Pushing routine dependency upgrades or bug fixes will help restore Active status.`
    })
  } else if (daysSince <= 30) {
    recommendations.push({
      type: 'good',
      category: 'Activity',
      title: 'Strong Development Momentum',
      description: 'Recent pushes within the last 30 days demonstrate ongoing active maintenance.'
    })
  }

  // 2. Issue Health
  if (openIssues > 40) {
    recommendations.push({
      type: 'critical',
      category: 'Issues',
      title: 'Triage High Issue Backlog',
      description: `There are ${openIssues} open issues. A large unresolved backlog can discourage contributors and slow release cycles.`
    })
  } else if (openIssues > 20) {
    recommendations.push({
      type: 'warning',
      category: 'Issues',
      title: 'Review Open Issues',
      description: `There are ${openIssues} open issues. Consider tagging stale issues, grouping similar bug reports, or marking 'good first issue' tasks.`
    })
  } else if (openIssues === 0) {
    recommendations.push({
      type: 'good',
      category: 'Issues',
      title: 'Clean Issue Backlog',
      description: 'Zero open issues indicate high responsiveness and prompt resolution.'
    })
  }

  // 3. Contributor Diversity / Resilience
  if (contributorCount <= 1) {
    recommendations.push({
      type: 'critical',
      category: 'Community',
      title: 'Mitigate Single Maintainer Risk',
      description: 'Only 1 contributor is recorded. Onboarding co-maintainers or reviewing external PRs is crucial to prevent single point of failure (Bus Factor = 1).'
    })
  } else if (contributorCount < 5) {
    recommendations.push({
      type: 'warning',
      category: 'Community',
      title: 'Expand Contributor Base',
      description: `Only ${contributorCount} contributor(s) recorded. Promoting community contributions will improve diversity and resilience.`
    })
  } else if (contributorCount >= 10) {
    recommendations.push({
      type: 'good',
      category: 'Community',
      title: 'Healthy Contributor Community',
      description: `${contributorCount} contributors active across the repository provide strong organizational stability.`
    })
  }

  // 4. Governance & Documentation
  if (!repo?.license) {
    recommendations.push({
      type: 'warning',
      category: 'Governance',
      title: 'Add an Open Source License',
      description: 'No license detected. Without an explicit open-source license (such as MIT or Apache 2.0), third parties may hesitate to adopt or contribute.'
    })
  }

  if (!repo?.description) {
    recommendations.push({
      type: 'optimization',
      category: 'Documentation',
      title: 'Add Repository Description & Topics',
      description: 'Providing a clear summary and discoverability tags helps developers and automated tools understand the project purpose.'
    })
  }

  // Sort order: critical first, then warning, optimization, good
  const PRIORITY = { critical: 0, warning: 1, optimization: 2, good: 3 }
  return recommendations.sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type])
}

// Repo Lifecycle — Thriving, Active, Dormant, Hibernating based on recency of last push
export function computeActivityClassification(repo) {
  const days = (Date.now() - new Date(repo.pushed_at)) / 86_400_000
  if (days <= 30)  return 'Thriving'
  if (days <= 90)  return 'Active'
  if (days <= 180) return 'Dormant'
  return 'Hibernating'
}

//  Bus Factor
export function computeBusFactor(contributors = []) {
  if (!contributors.length) return { factor: 0, risk: 'unknown' }
  const total = contributors.reduce((s, c) => s + c.contributions, 0)
  if (!total) return { factor: 0, risk: 'unknown' }
  let cum = 0
  for (let i = 0; i < contributors.length; i++) {
    cum += contributors[i].contributions
    if (cum / total > 0.5) {
      const f = i + 1
      return { factor: f, risk: f <= 1 ? 'critical' : f <= 2 ? 'high' : 'healthy' }
    }
  }
  return { factor: contributors.length, risk: 'healthy' }
}

// Unified Analytical Data Model
// Merges multiple orgs into one normalized graph:
// Organization → Repositories → Contributors → Issues/PRs
export function buildAnalyticalModel(orgs, reposPerOrg, contribsPerRepo, totalReposPerOrg) {
  const allRepos      = []
  const contributorMap = {}
  const totalRepos = [];

  orgs.forEach(org => {
    const repos = reposPerOrg[org.login] || []
    const total = totalReposPerOrg[org.login] || [];

    total.forEach(repo => {
      const key = `${org.login}/${repo.name}`
      const contribs = contribsPerRepo[key] || []
      const health = computeHealthScore(repo, contribs.length)
      const activityClassification = computeActivityClassification(repo)
      const bf = computeBusFactor(contribs)
      totalRepos.push({ ...repo, orgLogin: org.login, contributors: contribs, healthScore: health, activityClassification: activityClassification, busFactor: bf })
    })

    repos.forEach(repo => {
      const key = `${org.login}/${repo.name}`
      const contribs = contribsPerRepo[key] || []
      allRepos.push({ ...repo, orgLogin: org.login });

      // Build contributor map — deduplicated by login across orgs
      contribs.forEach(c => {
        if (!contributorMap[c.login]) {
          contributorMap[c.login] = {
            login: c.login,
            avatar_url: c.avatar_url,
            totalContribs: 0,
            repos: [],
            orgs: new Set(),
            lastActive: null,
          }
        }
        const entry = contributorMap[c.login]
        entry.totalContribs += c.contributions
        entry.repos.push({ name: repo.name, org: org.login, count: c.contributions })
        entry.orgs.add(org.login)
        if (!entry.lastActive || repo.pushed_at > entry.lastActive) {
          entry.lastActive = repo.pushed_at
        }
      })
    })
  })

  // Finalize contributors: compute signals
  const contributors = Object.values(contributorMap).map(c => ({
    ...c,
    orgs:        Array.from(c.orgs),
    isConnector: c.repos.length >= 3,
    isCrossOrg:  c.orgs.size > 1,
    freshness:   c.lastActive
      ? Math.max(0, 100 - (Date.now() - new Date(c.lastActive)) / 86_400_000)
      : 0,
  })).sort((a, b) => b.totalContribs - a.totalContribs)

  // Graph is constructed here and persisted through cache layers
  return { allRepos, contributors, totalRepos }
}

// Time-Series Bucketing
// Parses created_at, closed_at, merged_at into weekly/monthly bins
export function buildTimeSeries(issues = [], granularity = 'monthly') {
  const buckets = {}

  const toKey = dateStr => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    if (granularity === 'weekly') {
      const jan1 = new Date(d.getFullYear(), 0, 1)
      const week = Math.ceil(((d - jan1) / 86_400_000 + jan1.getDay() + 1) / 7)
      return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const ensure = key => {
    if (!buckets[key]) {
      buckets[key] = { date: key, prs_created: 0, prs_merged: 0, prs_closed: 0, issues_created: 0, issues_closed: 0 }
    }
  }

  issues.forEach(item => {
    const isPR = Boolean(item.pull_request)

    const ck = toKey(item.created_at)
    if (ck) {
      ensure(ck)
      if (isPR) buckets[ck].prs_created++
      else      buckets[ck].issues_created++
    }

    if (item.closed_at) {
      const xk = toKey(item.closed_at)
      if (xk) {
        ensure(xk)
        if (isPR) buckets[xk].prs_closed++
        else      buckets[xk].issues_closed++
      }
    }

    if (isPR && item.pull_request?.merged_at) {
      const mk = toKey(item.pull_request.merged_at)
      if (mk) { ensure(mk); buckets[mk].prs_merged++ }
    }
  })

  return Object.values(buckets)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12)
}

// CSV Export
function download(content, filename, type = 'text/csv') {
  const blob = new Blob([content], { type })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

export function exportReposCSV(repos) {
  const header = ['Repository','Org','Stars','Forks','Open Issues','Health Score','Activity Classification','Language','Last Active']
  const rows   = repos.map(r => [r.name, r.orgLogin, r.stargazers_count, r.forks_count, r.open_issues_count, r.healthScore, r.activityClassification, r.language || 'N/A', r.pushed_at?.slice(0, 10)])
  download([header, ...rows].map(r => r.join(',')).join('\n'), 'orgexplorer-repos.csv')
}

export function exportContributorsCSV(contributors) {
  const header = ['Login','Total Contributions','Repos','Orgs','Last Active','Connector','Cross-Org']
  const rows   = contributors.map(c => [c.login, c.totalContribs, c.repos.length, c.orgs.length, c.lastActive?.slice(0, 10) || '', c.isConnector, c.isCrossOrg])
  download([header, ...rows].map(r => r.join(',')).join('\n'), 'orgexplorer-contributors.csv')
}

export function exportTrendsCSV(series) {
  const header = ['Date','PRs Created','PRs Merged','PRs Closed','Issues Created','Issues Closed']
  const rows   = series.map(s => [s.date, s.prs_created, s.prs_merged, s.prs_closed, s.issues_created, s.issues_closed])
  download([header, ...rows].map(r => r.join(',')).join('\n'), 'orgexplorer-trends.csv')
}

export function getTopRepositories(repos, limit = 10) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  return [...repos]
    .map(repo => {
      const pushedAtMs = Date.parse(repo.pushed_at);  
      const daysSinceLastPush = Number.isFinite(pushedAtMs) ? (Date.now() - pushedAtMs) / MS_PER_DAY : Infinity;

      const activityBonus = 0.5 * Math.max(0, 365 - daysSinceLastPush);

      const score =  
        (repo.stargazers_count ?? 0) +  
        (repo.forks_count ?? 0) * 2 +  
        (repo.watchers_count ?? 0) * 1.5 +  
        activityBonus;  

      return {
        ...repo,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
