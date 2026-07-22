//  Repo Health Indicator
// Activity (40%) + Issue Health (30%) + Diversity (30%)

const MS_PER_DAY = 86_400_000

function daysSince(dateStr, now = Date.now()) {
  const time = Date.parse(dateStr)

  if (!Number.isFinite(time)) return Infinity

  return Math.max(0, (now - time) / MS_PER_DAY)
}

function safeNumber(value, fallback = 0) {
  const number = Number(value)

  return Number.isFinite(number) ? number : fallback
}

function enrichRepo(repo, orgLogin, contributors = [], now = Date.now()) {
  const healthScore = computeHealthScore(repo, contributors.length, now)
  const activityClassification = computeActivityClassification(repo, now)
  const busFactor = computeBusFactor(contributors)

  return {
    ...repo,
    orgLogin,
    contributors,
    healthScore,
    activityClassification,
    busFactor,
  }
}

export function computeHealthScore(repo, contributorCount = 0, now = Date.now()) {
  const days = daysSince(repo?.pushed_at, now)

  const activity = Math.max(0, 100 - days)

  const openIssues = Math.max(0, safeNumber(repo?.open_issues_count))
  const total = openIssues + 10
  const issueHealth = Math.max(0, 100 - (openIssues / total) * 100)

  const diversity = Math.min(100, Math.max(0, safeNumber(contributorCount)) * 10)

  return Math.round(
    activity * 0.4 +
    issueHealth * 0.3 +
    diversity * 0.3
  )
}

// Repo Lifecycle — Thriving, Active, Dormant, Hibernating based on recency of last push
export function computeActivityClassification(repo, now = Date.now()) {
  const days = daysSince(repo?.pushed_at, now)

  if (days <= 30) return 'Thriving'
  if (days <= 90) return 'Active'
  if (days <= 180) return 'Dormant'

  return 'Hibernating'
}

// Bus Factor
export function computeBusFactor(contributors = []) {
  const sorted = [...contributors]
    .map(c => ({
      ...c,
      contributions: Math.max(0, safeNumber(c?.contributions)),
    }))
    .filter(c => c.contributions > 0)
    .sort((a, b) => b.contributions - a.contributions)

  if (!sorted.length) {
    return { factor: 0, risk: 'unknown' }
  }

  const total = sorted.reduce((sum, c) => sum + c.contributions, 0)

  if (!total) {
    return { factor: 0, risk: 'unknown' }
  }

  let cumulative = 0

  for (let i = 0; i < sorted.length; i++) {
    cumulative += sorted[i].contributions

    if (cumulative / total >= 0.5) {
      const factor = i + 1

      return {
        factor,
        risk:
          factor <= 1 ? 'critical' :
          factor <= 2 ? 'high' :
          'healthy',
      }
    }
  }

  return {
    factor: sorted.length,
    risk: 'healthy',
  }
}

// Unified Analytical Data Model
// Merges multiple orgs into one normalized graph:
// Organization → Repositories → Contributors → Issues/PRs
export function buildAnalyticalModel(
  orgs = [],
  reposPerOrg = {},
  contribsPerRepo = {},
  totalReposPerOrg = {}
) {
  const now = Date.now()

  const allRepos = []
  const contributorMap = {}
  const totalRepos = []

  orgs.forEach(org => {
    const orgLogin = org?.login

    if (!orgLogin) return

    const repos = reposPerOrg[orgLogin] || []
    const total = totalReposPerOrg[orgLogin] || []

    total.forEach(repo => {
      const key = `${orgLogin}/${repo.name}`
      const contributors = contribsPerRepo[key] || []

      totalRepos.push(enrichRepo(repo, orgLogin, contributors, now))
    })

    repos.forEach(repo => {
      const key = `${orgLogin}/${repo.name}`
      const contributors = contribsPerRepo[key] || []

      allRepos.push(enrichRepo(repo, orgLogin, contributors, now))

      // Build contributor map — deduplicated by login across orgs
      contributors.forEach(contributor => {
        if (!contributor?.login) return

        const contributionCount = Math.max(0, safeNumber(contributor.contributions))

        if (!contributorMap[contributor.login]) {
          contributorMap[contributor.login] = {
            login: contributor.login,
            avatar_url: contributor.avatar_url,
            totalContribs: 0,
            repos: [],
            orgs: new Set(),
            lastActive: null,
            lastActiveMs: null,
          }
        }

        const entry = contributorMap[contributor.login]

        entry.totalContribs += contributionCount
        entry.repos.push({
          name: repo.name,
          org: orgLogin,
          count: contributionCount,
        })
        entry.orgs.add(orgLogin)

        const pushedAtMs = Date.parse(repo.pushed_at)

        if (Number.isFinite(pushedAtMs)) {
          if (!entry.lastActiveMs || pushedAtMs > entry.lastActiveMs) {
            entry.lastActiveMs = pushedAtMs
            entry.lastActive = repo.pushed_at
          }
        }
      })
    })
  })

  // Finalize contributors: compute signals
  const contributors = Object.values(contributorMap)
    .map(({ orgs, lastActiveMs, ...contributor }) => ({
      ...contributor,
      orgs: Array.from(orgs),
      isConnector: contributor.repos.length >= 3,
      isCrossOrg: orgs.size > 1,
      freshness: contributor.lastActive
        ? Math.round(Math.max(0, 100 - daysSince(contributor.lastActive, now)))
        : 0,
    }))
    .sort((a, b) => b.totalContribs - a.totalContribs)

  // Graph is constructed here and persisted through cache layers
  return {
    allRepos,
    contributors,
    totalRepos,
  }
}

// Time-Series Bucketing
// Parses created_at, closed_at, merged_at into weekly/monthly bins
function getISOWeekKey(dateStr) {
  const d = new Date(dateStr)

  if (Number.isNaN(d.getTime())) return null

  const date = new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate()
  ))

  const day = date.getUTCDay() || 7

  date.setUTCDate(date.getUTCDate() + 4 - day)

  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((date - yearStart) / MS_PER_DAY) + 1) / 7)

  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function buildTimeSeries(issues = [], granularity = 'monthly') {
  const buckets = {}

  const toKey = dateStr => {
    if (!dateStr) return null

    const d = new Date(dateStr)

    if (Number.isNaN(d.getTime())) return null

    if (granularity === 'weekly') {
      return getISOWeekKey(dateStr)
    }

    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  }

  const ensure = key => {
    if (!buckets[key]) {
      buckets[key] = {
        date: key,
        prs_created: 0,
        prs_merged: 0,
        prs_closed: 0,
        issues_created: 0,
        issues_closed: 0,
      }
    }
  }

  issues.forEach(item => {
    const isPR = Boolean(item?.pull_request)

    const createdKey = toKey(item?.created_at)

    if (createdKey) {
      ensure(createdKey)

      if (isPR) buckets[createdKey].prs_created++
      else buckets[createdKey].issues_created++
    }

    const closedKey = toKey(item?.closed_at)

    if (closedKey) {
      ensure(closedKey)

      if (isPR) buckets[closedKey].prs_closed++
      else buckets[closedKey].issues_closed++
    }

    const mergedKey = isPR ? toKey(item?.pull_request?.merged_at) : null

    if (mergedKey) {
      ensure(mergedKey)
      buckets[mergedKey].prs_merged++
    }
  })

  return Object.values(buckets)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12)
}

// CSV Export
function csvCell(value) {
  if (value === null || value === undefined) return ''

  let cell = String(value)

  // Prevent CSV formula injection in spreadsheet apps
  if (/^[=+\-@]/.test(cell)) {
    cell = `'${cell}`
  }

  if (/[",\n\r]/.test(cell)) {
    cell = `"${cell.replaceAll('"', '""')}"`
  }

  return cell
}

function toCSV(rows) {
  return rows
    .map(row => row.map(csvCell).join(','))
    .join('\n')
}

function download(content, filename, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)

  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: filename,
  })

  document.body.appendChild(a)
  a.click()
  a.remove()

  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function exportReposCSV(repos = []) {
  const header = [
    'Repository',
    'Org',
    'Stars',
    'Forks',
    'Open Issues',
    'Health Score',
    'Activity Classification',
    'Language',
    'Last Active',
  ]

  const rows = repos.map(repo => [
    repo.name,
    repo.orgLogin,
    repo.stargazers_count ?? 0,
    repo.forks_count ?? 0,
    repo.open_issues_count ?? 0,
    repo.healthScore ?? '',
    repo.activityClassification ?? '',
    repo.language || 'N/A',
    repo.pushed_at?.slice(0, 10) || '',
  ])

  download(toCSV([header, ...rows]), 'orgexplorer-repos.csv')
}

export function exportContributorsCSV(contributors = []) {
  const header = [
    'Login',
    'Total Contributions',
    'Repos',
    'Orgs',
    'Last Active',
    'Connector',
    'Cross-Org',
  ]

  const rows = contributors.map(contributor => [
    contributor.login,
    contributor.totalContribs ?? 0,
    contributor.repos?.length ?? 0,
    contributor.orgs?.length ?? 0,
    contributor.lastActive?.slice(0, 10) || '',
    Boolean(contributor.isConnector),
    Boolean(contributor.isCrossOrg),
  ])

  download(toCSV([header, ...rows]), 'orgexplorer-contributors.csv')
}

export function exportTrendsCSV(series = []) {
  const header = [
    'Date',
    'PRs Created',
    'PRs Merged',
    'PRs Closed',
    'Issues Created',
    'Issues Closed',
  ]

  const rows = series.map(item => [
    item.date,
    item.prs_created ?? 0,
    item.prs_merged ?? 0,
    item.prs_closed ?? 0,
    item.issues_created ?? 0,
    item.issues_closed ?? 0,
  ])

  download(toCSV([header, ...rows]), 'orgexplorer-trends.csv')
}

export function getTopRepositories(repos = [], limit = 10, now = Date.now()) {
  return [...repos]
    .map(repo => {
      const daysSinceLastPush = daysSince(repo.pushed_at, now)

      const stars = Math.max(0, safeNumber(repo.stargazers_count))
      const forks = Math.max(0, safeNumber(repo.forks_count))
      const openIssues = Math.max(0, safeNumber(repo.open_issues_count))
      const healthScore = Math.max(0, safeNumber(repo.healthScore))

      const activityBonus = 0.5 * Math.max(0, 365 - daysSinceLastPush)
      const issuePenalty = Math.min(openIssues, 100) * 0.2

      const score =
        stars +
        forks * 2 +
        healthScore * 0.5 +
        activityBonus -
        issuePenalty

      return {
        ...repo,
        score: Math.round(score * 100) / 100,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
