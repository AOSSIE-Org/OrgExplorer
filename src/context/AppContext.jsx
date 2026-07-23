import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { fetchOrg, fetchRepos, fetchContributors, fetchIssues, fetchRateLimit, fetchPulls } from '../services/github'
import { buildAnalyticalModel, getTopRepositories } from '../services/analytics'

const Ctx = createContext(null)

function getStoredRateLimit() {
  const stored = localStorage.getItem('oe_rate_limit')

  if (!stored) return null

  try {
    const data = JSON.parse(stored)

    if (Date.now() > data.reset * 1000) {
      localStorage.removeItem('oe_rate_limit')
      return null
    }

    return data
  } catch {
    localStorage.removeItem('oe_rate_limit')
    return null
  }
}

export function AppProvider({ children }) {
  const [pat, setPat] = useState(() => localStorage.getItem('oe_pat') || '')
  const [orgs, setOrgs] = useState([])
  const [model, setModel] = useState(null)
  const [issuesData, setIssuesData] = useState({})
  const [pullsData, setPullsData] = useState({})
  const [rateLimit, setRateLimit] = useState(getStoredRateLimit)
  const [loading, setLoading] = useState(false)
  const [loadMsg, setLoadMsg] = useState('')
  const [govLoading, setGovLoading] = useState(false)
  const [error, setError] = useState('')
  const [totalRepo, setTotalRepo] = useState(0)
  const [advanceAnalyticsLoading, setAdvanceAnalyticsLoading] = useState(false);
  const [advanceAnalyticsComplete, setAdvanceAnalyticsComplete] = useState(false) 
  const [isComplete, setIsComplete] = useState(false)
  const [auditComplete, setAuditComplete] = useState(false)
  const [lastOrgNames, setLastOrgNames] = useState([])

  useEffect(() => {
    const handler = e => {
      setRateLimit(e.detail)
      localStorage.setItem('oe_rate_limit', JSON.stringify(e.detail))
    }

    window.addEventListener('rate-limit-update', handler)

    return () => {
      window.removeEventListener('rate-limit-update', handler)
    }
  }, [])

  useEffect(() => {
    if (!rateLimit?.reset) return

    const timeout = setTimeout(() => {
      localStorage.removeItem('oe_rate_limit')
      setRateLimit(null)
    }, Math.max(0, rateLimit.reset * 1000 - Date.now()))

    return () => clearTimeout(timeout)
  }, [rateLimit])

  const refreshRateLimit = useCallback(async () => {
    const rl = await fetchRateLimit(pat)
    if (rl) {
      setRateLimit(rl)
      return true
    }
    return false
  }, [pat])
  const savePat = useCallback(token => {
    setPat(token)
    token ? localStorage.setItem('oe_pat', token) : localStorage.removeItem('oe_pat')
  }, [])

  // Multi-org explore
  const explore = useCallback(async orgNames => {
    setLoading(true);
    setError('');
    setModel(null);
    setOrgs([]);
    setIssuesData({});
    setLastOrgNames(orgNames);
    setAuditComplete(false);
    setAdvanceAnalyticsComplete(false);
    try {
      setLoadMsg('Fetching organization metadata...')
      const orgRes = await Promise.allSettled(orgNames.map(n => fetchOrg(n, pat)))
      const validOrgs = orgRes.filter(r => r.status === 'fulfilled').map(r => r.value)
      if (!validOrgs.length) throw new Error('No valid organizations found. Check the names and try again.')
      setOrgs(validOrgs)

      setLoadMsg('Fetching repositories...')
      const reposPerOrg = {}
      await Promise.allSettled(validOrgs.map(async org => {
        reposPerOrg[org.login] = await fetchRepos(org.login, org.public_repos, pat)
      }))

      const total = Object.values(reposPerOrg).reduce((sum, repos) => sum + repos.length, 0);
      setTotalRepo(total);

      const totalReposPerOrg = Object.fromEntries(
        Object.entries(reposPerOrg).map(([org, repos]) => [org, [...repos]])
      );

      setLoadMsg('Fetching contributor data for top repositories...')
      const contribsPerRepo = {}
      for (const org of validOrgs) {

        const top = pat ? (reposPerOrg[org.login] || []) : getTopRepositories(reposPerOrg[org.login] || [], 10);
        reposPerOrg[org.login] = top;

        await Promise.allSettled(top.map(async repo => {
          contribsPerRepo[`${org.login}/${repo.name}`] = await fetchContributors(org.login, repo.name, pat)
        }))
      }

      setLoadMsg('Building analytical data model...')
      const builtModel = buildAnalyticalModel(validOrgs, reposPerOrg, contribsPerRepo, totalReposPerOrg)
      setModel(builtModel)

      setIsComplete(!!pat)

      // Save to recent searches
      const prev = JSON.parse(localStorage.getItem('oe_recent') || '[]')
      const entry = orgNames.join(', ')
      localStorage.setItem('oe_recent', JSON.stringify([...new Set([entry, ...prev])].slice(0, 6)))
      return builtModel
    } catch (err) {
      setError(err.message === 'RATE_LIMIT'
        ? 'GitHub API rate limit reached. Add a PAT in Settings for 5,000 req/hr.'
        : err.message)
      return false
    } finally {
      setLoading(false); setLoadMsg('')
    }
  }, [pat])

  // re-run explore for the same orgs: used by the banner on
  // Overview / Contributors / Repositories / Network
  const runFullExplore = useCallback(() => {
    if (!lastOrgNames.length) return Promise.resolve(false)
    return explore(lastOrgNames)
  }, [explore, lastOrgNames])

  const selectAnalysisRepos = useCallback((allRepos) => {
    const byOrg = {}
    for (const repo of allRepos) {
      (byOrg[repo.orgLogin] ??= []).push(repo)
    }
    return Object.values(byOrg).flatMap(orgRepos =>
      pat ? orgRepos : getTopRepositories(orgRepos, 10)
    )
  }, [pat])

  // Shared issue-fetch logic: same repo-selection rule as contributors
  const auditRepos = useCallback(async (allRepos) => {
    const repos = selectAnalysisRepos(allRepos)

    const map = {}
    for (let i = 0; i < repos.length; i += 5) {
      const batch = repos.slice(i, i + 5)
      await Promise.allSettled(batch.map(async repo => {
        map[`${repo.orgLogin}/${repo.name}`] = await fetchIssues(repo.orgLogin, repo.name, pat)
      }))
    }
    return map
  }, [pat, selectAnalysisRepos])

  // Governance audit : used directly when repos are already complete
  const runAudit = useCallback(async () => {
    if (!model || govLoading) return
    setGovLoading(true)
    const map = await auditRepos(model.allRepos)
    setIssuesData(map)
    setGovLoading(false)
    setAuditComplete(!!pat)
  }, [model, pat, govLoading, auditRepos])

  // Entry point for Governance / Analytics "Run Complete Analysis"
  // - If repos/contributors aren't complete yet -> fetch them first (explore),
  //   then fetch issues using the freshly-returned model (avoids stale closure).
  // - If already complete -> skip repo fetching (cache/state already has it),
  //   just fetch issues.
  const runGovernanceAnalysis = useCallback(async () => {
    if (govLoading) return

    let currentModel = model
    if (!isComplete) {
      setGovLoading(true) // reflect "working" immediately, explore() also sets its own loading
      const freshModel = await runFullExplore()
      setGovLoading(false)
      if (!freshModel) return
      currentModel = freshModel
    }

    if (!currentModel) return

    setGovLoading(true)
    const map = await auditRepos(currentModel.allRepos)
    setIssuesData(map)
    setGovLoading(false)
    setAuditComplete(!!pat)
  }, [isComplete, model, runFullExplore, auditRepos, pat, govLoading])

  // Advanced analytics — parallel batches of 5 (Section 3.2.5)
  // Entry point for Analytics "Run Complete Analysis"
  // - If repos/contributors aren't complete yet -> fetch them first (explore),
  //   then fetch pulls using the freshly-returned model (avoids stale closure).
  // - If already complete -> skip repo fetching, just fetch pulls.
  const runAdvanceAnalytics = useCallback(async () => {
    if (advanceAnalyticsLoading) return

    let currentModel = model
    if (!isComplete) {
      setAdvanceAnalyticsLoading(true) // reflect "working" immediately
      const freshModel = await runFullExplore()
      setAdvanceAnalyticsLoading(false)
      if (!freshModel) return
      currentModel = freshModel
    }

    if (!currentModel) return

    setAdvanceAnalyticsLoading(true)
    const map = {}
    const repos = selectAnalysisRepos(currentModel.totalRepos)

    for (let i = 0; i < repos.length; i += 5) {
      const batch = repos.slice(i, i + 5)
      await Promise.allSettled(batch.map(async repo => {
        map[`${repo.orgLogin}/${repo.name}`] = await fetchPulls(repo.orgLogin, repo.name, pat)
      }))
    }
    setPullsData(map)
    setAdvanceAnalyticsLoading(false)
    setAdvanceAnalyticsComplete(!!pat)
  }, [isComplete, model, runFullExplore, selectAnalysisRepos, pat, advanceAnalyticsLoading])

  // Combined entry point for the whole Analytics page banner
  // Runs explore() once if needed, then fetches issues + pulls in parallel
  const runFullAnalytics = useCallback(async () => {
    if (govLoading || advanceAnalyticsLoading) return

    let currentModel = model
    if (!isComplete) {
      setGovLoading(true)
      setAdvanceAnalyticsLoading(true)
      const freshModel = await runFullExplore()
      setGovLoading(false)
      setAdvanceAnalyticsLoading(false)
      if (!freshModel) return
      currentModel = freshModel
    }

    if (!currentModel) return

    setGovLoading(true)
    setAdvanceAnalyticsLoading(true)

    const [issuesMap, pullsMap] = await Promise.all([
      auditRepos(currentModel.allRepos),
      (async () => {
        const repos = selectAnalysisRepos(currentModel.totalRepos)
        const map = {}
        for (let i = 0; i < repos.length; i += 5) {
          const batch = repos.slice(i, i + 5)
          await Promise.allSettled(batch.map(async repo => {
            map[`${repo.orgLogin}/${repo.name}`] = await fetchPulls(repo.orgLogin, repo.name, pat)
          }))
        }
        return map
      })()
    ])

    setIssuesData(issuesMap)
    setPullsData(pullsMap)
    setGovLoading(false)
    setAdvanceAnalyticsLoading(false)
    setAuditComplete(!!pat)
    setAdvanceAnalyticsComplete(!!pat)
  }, [model, isComplete, runFullExplore, auditRepos, selectAnalysisRepos, pat, govLoading, advanceAnalyticsLoading])

  const STALE_DAYS = 90
  
  const staleRepoStats = useMemo(() => {
    const now = Date.now()
  
    return Object.entries(issuesData || {}).map(([key, issues]) => {
      const [org, repo] = key.split('/')
  
      const normalIssues = issues.filter(i => !i.pull_request)
  
      const openIssues = normalIssues.filter(i => i.state === 'open')
  
      const staleIssues = openIssues.filter(i => {
        const updated = new Date(i.updated_at).getTime()
        const diffDays = (now - updated) / (1000 * 60 * 60 * 24)
        return diffDays >= STALE_DAYS
      })
  
      const ratio =
        openIssues.length === 0
          ? 0
          : Math.round((staleIssues.length / openIssues.length) * 100)
  
      return {
        id: key,
        org,
        repo,
        ratio,
        staleCount: staleIssues.length,
        openCount: openIssues.length
      }
    }).sort((a, b) => b.ratio - a.ratio)
  }, [issuesData])

  return (
    <Ctx.Provider value={{
      pat, savePat, orgs, model, issuesData, pullsData,
      rateLimit, loading, loadMsg, govLoading, error, totalRepo,
      runAdvanceAnalytics, refreshRateLimit, advanceAnalyticsLoading, advanceAnalyticsComplete,
      runFullAnalytics,
      isComplete, auditComplete, lastOrgNames,
      explore, runFullExplore, runAudit, runGovernanceAnalysis, setError, staleRepoStats
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
