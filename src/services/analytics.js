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

// Repository Health & Risk Scorecard (Governance 2.0)
export function computeRepoHealthScore(repo, issues = [], pulls = []) {
  const orgLogin = repo.orgLogin || repo.owner?.login || '';
  const repoName = repo.name || '';
  const repoKey = repo.repoKey || (orgLogin ? `${orgLogin}/${repoName}` : repoName);

  // Pillar 1: Bus Factor
  let busFactorPillar = {
    score: null,
    weight: 20,
    label: 'No data',
    riskLevel: 'unknown',
    factor: 0
  };

  const contribs = repo.contributors || repo.contributorsList;
  if (Array.isArray(contribs) && contribs.length > 0) {
    const bf = computeBusFactor(contribs);
    const f = bf.factor;
    if (f === 0) {
      busFactorPillar = { score: null, weight: 20, label: 'No data', riskLevel: 'unknown', factor: 0 };
    } else if (f === 1) {
      busFactorPillar = { score: 0, weight: 20, label: 'Critical', riskLevel: 'critical', factor: 1 };
    } else if (f === 2) {
      busFactorPillar = { score: 50, weight: 20, label: 'Warning', riskLevel: 'warning', factor: 2 };
    } else {
      const score = Math.min(100, 80 + (f - 3) * 10);
      busFactorPillar = { score, weight: 20, label: 'Healthy', riskLevel: 'healthy', factor: f };
    }
  } else if (repo.busFactor && repo.busFactor.risk !== 'unknown') {
    const f = repo.busFactor.factor;
    if (f === 1) {
      busFactorPillar = { score: 0, weight: 20, label: 'Critical', riskLevel: 'critical', factor: 1 };
    } else if (f === 2) {
      busFactorPillar = { score: 50, weight: 20, label: 'Warning', riskLevel: 'warning', factor: 2 };
    } else if (f >= 3) {
      const score = Math.min(100, 80 + (f - 3) * 10);
      busFactorPillar = { score, weight: 20, label: 'Healthy', riskLevel: 'healthy', factor: f };
    }
  }

  // Pillar 2: Governance Compliance
  const hasLicense = Boolean(repo.license || repo.has_license);
  const hasReadme = repo._files?.readme !== undefined ? Boolean(repo._files.readme) : (repo.has_readme !== undefined ? Boolean(repo.has_readme) : true);
  const hasContributing = repo._files?.contributing !== undefined ? Boolean(repo._files.contributing) : (repo.has_contributing !== undefined ? Boolean(repo.has_contributing) : null);
  const hasSecurity = repo._files?.security !== undefined ? Boolean(repo._files.security) : (repo.has_security !== undefined ? Boolean(repo.has_security) : null);

  const checks = {
    license: hasLicense,
    readme: hasReadme,
    contributing: hasContributing,
    security: hasSecurity
  };

  let compliancePillar = null;
  const knownChecks = Object.entries(checks).filter(([, v]) => v !== null);
  if (knownChecks.length > 0) {
    const passedCount = knownChecks.filter(([, v]) => v === true).length;
    // Each known check is weighted equally to sum to 100
    const compScore = Math.round((passedCount / knownChecks.length) * 100);
    const riskLevel = compScore >= 70 ? 'healthy' : compScore >= 40 ? 'warning' : 'critical';
    const label = compScore >= 70 ? 'Healthy' : compScore >= 40 ? 'Warning' : 'Critical';
    compliancePillar = {
      score: compScore,
      weight: 20,
      label: knownChecks.length < 4 ? `${label} (Limited data)` : label,
      riskLevel,
      checks
    };
  } else {
    compliancePillar = {
      score: null,
      weight: 20,
      label: 'No data',
      riskLevel: 'unknown',
      checks
    };
  }

  // Pillar 3: Activity Freshness
  let freshnessPillar = { score: null, weight: 20, label: 'No data', riskLevel: 'unknown', daysSince: null };
  const pushedAt = repo.pushed_at || repo.updated_at;
  if (pushedAt) {
    const pushedMs = Date.parse(pushedAt);
    if (Number.isFinite(pushedMs)) {
      const daysSince = Math.max(0, Math.floor((Date.now() - pushedMs) / 86_400_000));
      const freshnessScore = Math.max(0, Math.min(100, Math.round(100 - daysSince * (100 / 365))));
      const riskLevel = freshnessScore >= 70 ? 'healthy' : freshnessScore >= 40 ? 'warning' : 'critical';
      const label = freshnessScore >= 70 ? 'Excellent' : freshnessScore >= 40 ? 'Warning' : 'Critical';
      freshnessPillar = {
        score: freshnessScore,
        weight: 20,
        label,
        riskLevel,
        daysSince
      };
    }
  }

  // Pillar 4: Responsiveness
  let responsivenessPillar = { score: null, weight: 20, label: 'No data', riskLevel: 'unknown', staleRatio: null };
  if (Array.isArray(issues) && (issues.length > 0 || (repo._hasIssuesAudit || repo._auditDone))) {
    const normalIssues = issues.filter(i => !i.pull_request);
    const openIssues = normalIssues.filter(i => i.state === 'open');

    let staleRatio = 0;
    let baseScore = 100;

    if (openIssues.length > 0) {
      const now = Date.now();
      const staleIssues = openIssues.filter(i => (now - new Date(i.updated_at).getTime()) / 86_400_000 >= 90);
      staleRatio = staleIssues.length / openIssues.length;
      baseScore = 100 - staleRatio * 100;
    }

    // Zombie PR penalty (5 pts per zombie PR, max penalty 40)
    const zombiePRs = issues.filter(i => i.pull_request && i.state === 'open' && (Date.now() - new Date(i.created_at || i.updated_at).getTime()) / 86_400_000 >= 90);
    const zombiePenalty = Math.min(40, zombiePRs.length * 5);

    const respScore = Math.max(0, Math.min(100, Math.round(baseScore - zombiePenalty)));
    const riskLevel = respScore >= 70 ? 'healthy' : respScore >= 40 ? 'warning' : 'critical';
    const label = respScore >= 70 ? 'Healthy' : respScore >= 40 ? 'Warning' : 'Critical';

    responsivenessPillar = {
      score: respScore,
      weight: 20,
      label,
      riskLevel,
      staleRatio: Number(staleRatio.toFixed(2))
    };
  }

  // Pillar 5: PR Resolution Rate
  let prResolutionPillar = { score: null, weight: 20, label: 'Insufficient data', riskLevel: 'unknown', mergeRate: null };
  const allPRs = Array.isArray(pulls) && pulls.length > 0 ? pulls : (Array.isArray(issues) ? issues.filter(i => i.pull_request) : []);
  const closedPRs = allPRs.filter(p => p.state === 'closed');

  if (closedPRs.length > 0) {
    const mergedPRs = closedPRs.filter(p => p.merged_at != null || p.pull_request?.merged_at != null || p.merged === true);
    const mergeRate = mergedPRs.length / closedPRs.length;
    const prScore = Math.round(mergeRate * 100);
    const riskLevel = prScore >= 70 ? 'healthy' : prScore >= 40 ? 'warning' : 'critical';
    const label = prScore >= 70 ? 'Healthy' : prScore >= 40 ? 'Warning' : 'Critical';

    prResolutionPillar = {
      score: prScore,
      weight: 20,
      label,
      riskLevel,
      mergeRate: Number(mergeRate.toFixed(2))
    };
  }

  // Pillars object
  const pillars = {
    busFactor: busFactorPillar,
    compliance: compliancePillar,
    freshness: freshnessPillar,
    responsiveness: responsivenessPillar,
    prResolution: prResolutionPillar
  };

  // Missing data handling & Weight normalization
  const availablePillars = Object.values(pillars).filter(p => p && p.score !== null);
  const totalAvailableWeight = availablePillars.reduce((sum, p) => sum + p.weight, 0);

  let overallScore = null;
  let overallRiskLevel = 'unknown';

  if (totalAvailableWeight > 0) {
    const weightedSum = availablePillars.reduce((sum, p) => sum + (p.score * p.weight), 0);
    overallScore = Math.round(weightedSum / totalAvailableWeight);
    overallRiskLevel = overallScore >= 70 ? 'healthy' : overallScore >= 40 ? 'warning' : 'critical';
  }

  // Recommendations Engine
  const recommendations = [];

  if (busFactorPillar.score !== null && busFactorPillar.factor <= 1) {
    recommendations.push({
      severity: 'critical',
      message: 'Single maintainer risk detected — recruit additional contributors'
    });
  }

  if (compliancePillar.score !== null && compliancePillar.checks.license === false) {
    recommendations.push({
      severity: 'critical',
      message: 'No license found — add a license to clarify open-source usage'
    });
  }

  if (compliancePillar.score !== null && compliancePillar.checks.readme === false) {
    recommendations.push({
      severity: 'warning',
      message: 'Add README.md to describe project purpose and setup'
    });
  }

  if (compliancePillar.score !== null && compliancePillar.checks.contributing === false) {
    recommendations.push({
      severity: 'warning',
      message: 'Add CONTRIBUTING.md to guide new contributors'
    });
  }

  if (compliancePillar.score !== null && compliancePillar.checks.security === false) {
    recommendations.push({
      severity: 'warning',
      message: 'Add SECURITY.md to define the vulnerability disclosure process'
    });
  }

  if (freshnessPillar.score !== null && freshnessPillar.daysSince > 180) {
    recommendations.push({
      severity: 'warning',
      message: 'No recent commits — consider re-activating or archiving the repository'
    });
  }

  if (responsivenessPillar.score !== null && responsivenessPillar.staleRatio > 0.50) {
    recommendations.push({
      severity: 'warning',
      message: 'Over 50% of open issues are stale — consider a triage sprint'
    });
  }

  if (prResolutionPillar.score !== null && prResolutionPillar.mergeRate < 0.30) {
    recommendations.push({
      severity: 'warning',
      message: 'Low PR merge rate — review PR acceptance criteria or contributor guidance'
    });
  }

  return {
    repoKey,
    repoName,
    orgLogin,
    overallScore,
    riskLevel: overallRiskLevel,
    pillars,
    recommendations
  };
}

