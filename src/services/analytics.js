//  Repo Health Indicator
// Activity (40%) + Issue Health (30%) + Diversity (30%)
export function computeHealthScore(repo, contributorCount = 0) {
  const pushedAtMs = Date.parse(repo.pushed_at)
  const daysSince = Number.isFinite(pushedAtMs) ? (Date.now() - pushedAtMs) / 86_400_000 : Infinity
  const activity = Math.max(0, 100 - daysSince)
  const total = (repo.open_issues_count || 0) + 10
    const issueHealth = Math.max(0, 100 - ((repo.open_issues_count || 0) / total) * 100)
  const diversity = Math.min(100, contributorCount * 10)
  return Math.round(activity * 0.4 + issueHealth * 0.3 + diversity * 0.3)
}

// Repo Lifecycle — Thriving, Active, Dormant, Hibernating based on recency of last push
export function computeActivityClassification(repo) {
  const pushedAtMs = Date.parse(repo.pushed_at)
  const days = Number.isFinite(pushedAtMs) ? (Date.now() - pushedAtMs) / 86_400_000 : Infinity
  if (days <= 30) return 'Thriving'
  if (days <= 90) return 'Active'
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
  const allRepos = []
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
    orgs: Array.from(c.orgs),
    isConnector: c.repos.length >= 3,
    isCrossOrg: c.orgs.size > 1,
    freshness: c.lastActive
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
      else buckets[ck].issues_created++
    }

    if (item.closed_at) {
      const xk = toKey(item.closed_at)
      if (xk) {
        ensure(xk)
        if (isPR) buckets[xk].prs_closed++
        else buckets[xk].issues_closed++
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
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

export function exportReposCSV(repos) {
  const header = ['Repository', 'Org', 'Stars', 'Forks', 'Open Issues', 'Health Score', 'Activity Classification', 'Language', 'Last Active']
  const rows = repos.map(r => [r.name, r.orgLogin, r.stargazers_count, r.forks_count, r.open_issues_count, r.healthScore, r.activityClassification, r.language || 'N/A', r.pushed_at?.slice(0, 10)])
  download([header, ...rows].map(r => r.join(',')).join('\n'), 'orgexplorer-repos.csv')
}

export function exportContributorsCSV(contributors) {
  const header = ['Login', 'Total Contributions', 'Repos', 'Orgs', 'Last Active', 'Connector', 'Cross-Org']
  const rows = contributors.map(c => [c.login, c.totalContribs, c.repos.length, c.orgs.length, c.lastActive?.slice(0, 10) || '', c.isConnector, c.isCrossOrg])
  download([header, ...rows].map(r => r.join(',')).join('\n'), 'orgexplorer-contributors.csv')
}

export function exportTrendsCSV(series) {
  const header = ['Date', 'PRs Created', 'PRs Merged', 'PRs Closed', 'Issues Created', 'Issues Closed']
  const rows = series.map(s => [s.date, s.prs_created, s.prs_merged, s.prs_closed, s.issues_created, s.issues_closed])
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
