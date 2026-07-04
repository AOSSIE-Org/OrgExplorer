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

  // Multi-org explore — core of Section 3.2.0
  const explore = useCallback(async orgNames => {
    setLoading(true); setError(''); setModel(null); setOrgs([]); setIssuesData({})
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

      const total = Object.values(reposPerOrg).reduce(
        (sum, repos) => sum + repos.length,
        0
      );

      setTotalRepo(total);
      const totalReposPerOrg = Object.fromEntries(
        Object.entries(reposPerOrg).map(([org, repos]) => [
          org,
          [...repos], // copy each array
        ])
      );

      setLoadMsg('Fetching contributor data for top repositories...')
      const contribsPerRepo = {}
      for (const org of validOrgs) {

        const top = pat ? (reposPerOrg[org.login] || []) : getTopRepositories(reposPerOrg[org.login] || [], 10);
        reposPerOrg[org.login] = top; // Update to only include top repos

        await Promise.allSettled(top.map(async repo => {
          contribsPerRepo[`${org.login}/${repo.name}`] = await fetchContributors(org.login, repo.name, pat)
        }))
      }

      setLoadMsg('Building analytical data model...')
      setModel(buildAnalyticalModel(validOrgs, reposPerOrg, contribsPerRepo, totalReposPerOrg))


      // Save to recent searches
      const prev = JSON.parse(localStorage.getItem('oe_recent') || '[]')
      const entry = orgNames.join(', ')
      localStorage.setItem('oe_recent', JSON.stringify([...new Set([entry, ...prev])].slice(0, 6)))
      return true
    } catch (err) {
      setError(err.message === 'RATE_LIMIT'
        ? 'GitHub API rate limit reached. Add a PAT in Settings for 5,000 req/hr.'
        : err.message)
      return false
    } finally {
      setLoading(false); setLoadMsg('')
    }
  }, [pat])

  // Governance audit — parallel batches of 5 (Section 3.2.5)
  const runAudit = useCallback(async () => {
    if (!model || govLoading) return
    setGovLoading(true)
    const map   = {}
    const repos = pat? model.totalRepos : model.totalRepos.slice(0, 15)

    // Batches of 5 using Promise.allSettled
    for (let i = 0; i < repos.length; i += 5) {
      const batch = repos.slice(i, i + 5)
      await Promise.allSettled(batch.map(async repo => {
        map[`${repo.orgLogin}/${repo.name}`] = await fetchIssues(repo.orgLogin, repo.name, pat)
      }))
    }
    setIssuesData(map)
    setGovLoading(false)
  }, [model, pat, govLoading])

  // Advanced analytics — parallel batches of 5 (Section 3.2.5)
  const runAdvanceAnalytics = useCallback(async () => {
    if (!model || advanceAnalyticsLoading) return
    setAdvanceAnalyticsLoading(true)
    const map = {}
    const repos = model.totalRepos;

    // Batches of 5 using Promise.allSettled
    for (let i = 0; i < repos.length; i += 5) {
      const batch = repos.slice(i, i + 5)
      await Promise.allSettled(batch.map(async repo => {
        map[`${repo.orgLogin}/${repo.name}`] = await fetchPulls(repo.orgLogin, repo.name, pat)
      }))
    }
    setPullsData(map)
    setAdvanceAnalyticsLoading(false)
  }, [model, pat, advanceAnalyticsLoading])

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
      explore, runAudit, runAdvanceAnalytics, setError, refreshRateLimit, staleRepoStats, advanceAnalyticsLoading
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
