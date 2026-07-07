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
  const [error, setError] = useState('')
  const [cachedOrgs, setCachedOrgs] = useState([])

  useEffect(() => {
    fetch('/data/manifest.json')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.orgs)) {
          setCachedOrgs(data.orgs.map(o => o.login.toLowerCase()))
        }
      })
      .catch(() => {
        // Fallback to empty if manifest does not exist
      })
  }, [])

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
      
      const fetchPromises = orgNames.map(async name => {
        const lowerName = name.toLowerCase()
        if (cachedOrgs.includes(lowerName)) {
          const res = await fetch(`/data/orgs/${lowerName}.json`)
          if (!res.ok) throw new Error(`Failed to load cached data for ${name}`)
          const data = await res.json()
          return { cached: true, name, data }
        } else {
          const org = await fetchOrg(name, pat)
          const repos = await fetchRepos(org.login, org.public_repos, pat)
          return { cached: false, name, org, repos }
        }
      })

      const results = await Promise.all(fetchPromises)

      // 1. Set orgs (tag cached ones so OverviewPage can show badge)
      const validOrgs = results.map(r => r.cached ? { ...r.data.org, cached: true } : r.org)
      setOrgs(validOrgs)

      // 2. Set total repos and reposPerOrg
      const reposPerOrg = {}
      const totalReposPerOrg = {}
      results.forEach(r => {
        const orgLogin = r.cached ? r.data.org.login : r.org.login
        const repos = r.cached ? r.data.repos : r.repos
        reposPerOrg[orgLogin] = repos
        totalReposPerOrg[orgLogin] = [...repos]
      })

      const total = Object.values(totalReposPerOrg).reduce(
        (sum, repos) => sum + repos.length,
        0
      )
      setTotalRepo(total)

      // 3. Fetch contributor data for top repositories
      setLoadMsg('Fetching contributor data for top repositories...')
      const contribsPerRepo = {}
      const cachedIssuesData = {}

      for (const r of results) {
        const orgLogin = r.cached ? r.data.org.login : r.org.login
        if (r.cached) {
          const cachedContribs = r.data.contributors || {}
          Object.entries(cachedContribs).forEach(([repoKey, contribList]) => {
            const repoName = repoKey.includes('/') ? repoKey.split('/')[1] : repoKey
            contribsPerRepo[`${orgLogin}/${repoName}`] = contribList
          })

          const cachedIssues = r.data.issues || {}
          Object.entries(cachedIssues).forEach(([repoKey, issueList]) => {
            const repoName = repoKey.includes('/') ? repoKey.split('/')[1] : repoKey
            cachedIssuesData[`${orgLogin}/${repoName}`] = issueList
          })

          const top = pat ? (reposPerOrg[orgLogin] || []) : getTopRepositories(reposPerOrg[orgLogin] || [], 10)
          reposPerOrg[orgLogin] = top
        } else {
          const top = pat ? (reposPerOrg[orgLogin] || []) : getTopRepositories(reposPerOrg[orgLogin] || [], 10)
          reposPerOrg[orgLogin] = top

          await Promise.allSettled(top.map(async repo => {
            contribsPerRepo[`${orgLogin}/${repo.name}`] = await fetchContributors(orgLogin, repo.name, pat)
          }))
        }
      }

      if (Object.keys(cachedIssuesData).length > 0) {
        setIssuesData(prev => ({ ...prev, ...cachedIssuesData }))
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
  }, [pat, cachedOrgs])

  // Governance audit — parallel batches of 5 (Section 3.2.5)
  const runAudit = useCallback(async () => {
    if (!model || govLoading) return
    setGovLoading(true)
    const map = { ...issuesData }
    const repos = pat ? model.totalRepos : model.totalRepos.slice(0, 15)

    const reposToFetch = repos.filter(repo => !map[`${repo.orgLogin}/${repo.name}`])

    if (reposToFetch.length > 0) {
      for (let i = 0; i < reposToFetch.length; i += 5) {
        const batch = reposToFetch.slice(i, i + 5)
        await Promise.allSettled(batch.map(async repo => {
          map[`${repo.orgLogin}/${repo.name}`] = await fetchIssues(repo.orgLogin, repo.name, pat)
        }))
      }
    }
    setIssuesData(map)
    setGovLoading(false)
  }, [model, pat, govLoading, issuesData])

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
      rateLimit, loading, loadMsg, govLoading, error, totalRepo,
      explore, runAudit, setError, refreshRateLimit, staleRepoStats,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
