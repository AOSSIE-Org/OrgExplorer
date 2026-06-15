import { createContext, useContext, useState, useCallback } from 'react'
import { fetchOrg, fetchRepos, fetchContributors, fetchIssues, fetchRateLimit } from '../services/github'
import { buildAnalyticalModel } from '../services/analytics'

const Ctx = createContext(null)

export function AppProvider({ children }) {
  const [pat,        setPat]        = useState(() => localStorage.getItem('oe_pat') || '')
  const [orgs,       setOrgs]       = useState([])
  const [model,      setModel]      = useState(null)
  const [issuesData, setIssuesData] = useState({})
  const [rateLimit,  setRateLimit]  = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [loadMsg,    setLoadMsg]    = useState('')
  const [govLoading, setGovLoading] = useState(false)
  const [error,      setError]      = useState('')

  const refreshRateLimit = useCallback(async () => {
    const rl = await fetchRateLimit(pat)
    if (rl) setRateLimit(rl)
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
      const orgRes   = await Promise.allSettled(orgNames.map(n => fetchOrg(n, pat)))
      const validOrgs = orgRes.filter(r => r.status === 'fulfilled').map(r => r.value)
      if (!validOrgs.length) throw new Error('No valid organizations found. Check the names and try again.')
      setOrgs(validOrgs)

      setLoadMsg('Fetching repositories...')
      const reposPerOrg = {}
      await Promise.allSettled(validOrgs.map(async org => {
        reposPerOrg[org.login] = await fetchRepos(org.login, pat)
      }))

      setLoadMsg('Fetching contributor data for top repositories...')
      const contribsPerRepo = {}
      for (const org of validOrgs) {
        const top = (reposPerOrg[org.login] || [])
          .sort((a, b) => b.stargazers_count - a.stargazers_count)
          .slice(0, 10)
        await Promise.allSettled(top.map(async repo => {
          contribsPerRepo[`${org.login}/${repo.name}`] = await fetchContributors(org.login, repo.name, pat)
        }))
      }

      setLoadMsg('Building analytical data model...')
      setModel(buildAnalyticalModel(validOrgs, reposPerOrg, contribsPerRepo))

      const rl = await fetchRateLimit(pat)
      if (rl) setRateLimit(rl)

      // Save to recent searches
      const prev  = JSON.parse(localStorage.getItem('oe_recent') || '[]')
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
    const repos = model.allRepos.slice(0, 15)

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

  return (
    <Ctx.Provider value={{
      pat, savePat, orgs, model, issuesData,
      rateLimit, loading, loadMsg, govLoading, error,
      explore, runAudit, setError, refreshRateLimit
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
