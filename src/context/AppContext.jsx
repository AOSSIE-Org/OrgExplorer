import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { fetchOrg, fetchRepos, fetchContributors, fetchIssues, fetchRateLimit } from '../services/github'
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
  const [rateLimit, setRateLimit] = useState(getStoredRateLimit)
  const [loading, setLoading] = useState(false)
  const [loadMsg, setLoadMsg] = useState('')
  const [govLoading, setGovLoading] = useState(false)
  const [exploreError, setExploreError] = useState('')
  const [auditError, setAuditError] = useState('')
  const [totalRepo, setTotalRepo] = useState(0)

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
    setLoading(true); setExploreError(''); setModel(null); setOrgs([]); setIssuesData({}); setAuditError('')
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
      setExploreError(err.message === 'RATE_LIMIT'
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
    setAuditError('')
    const map   = {}
    const repos = pat ? model.totalRepos : model.totalRepos.slice(0, 15)
    let rateLimitHit = false
    const otherFailures = []

    // Batches of 5 using Promise.allSettled
    for (let i = 0; i < repos.length; i += 5) {
      const batch = repos.slice(i, i + 5)
      const results = await Promise.allSettled(batch.map(async repo => {
        const issues = await fetchIssues(repo.orgLogin, repo.name, pat)
        map[`${repo.orgLogin}/${repo.name}`] = issues
      }))

      for (let j = 0; j < results.length; j++) {
        const result = results[j]
        if (result.status === 'rejected') {
          const msg = result.reason?.message
          if (msg === 'RATE_LIMIT') {
            rateLimitHit = true
          } else {
            // NOT_FOUND, HTTP_4xx/5xx, network failures, etc.
            otherFailures.push(batch[j] ? `${batch[j].orgLogin}/${batch[j].name}` : 'unknown repo')
          }
        }
      }

      if (rateLimitHit) {
        break // no point continuing — remaining fetches will also fail
      }
    }

    setIssuesData(map)
    setGovLoading(false)

    if (rateLimitHit) {
      setAuditError('GitHub API rate limit reached during audit. Results shown may be incomplete. Add a PAT in Settings for 5,000 req/hr.')
    } else if (otherFailures.length) {
      setAuditError(`Audit completed with errors. Failed to fetch issues for: ${otherFailures.join(', ')}. Results may be incomplete.`)
    }
  }, [model, pat, govLoading])

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
      pat, savePat, orgs, model, issuesData,
      rateLimit, loading, loadMsg, govLoading, totalRepo,
      exploreError, setExploreError,
      auditError, setAuditError,
      explore, runAudit, refreshRateLimit, staleRepoStats,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
