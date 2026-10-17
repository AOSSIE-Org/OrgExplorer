
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef
} from 'react'
import {
  fetchOrg,
  fetchRepos,
  fetchContributors,
  fetchIssues,
  fetchRateLimit,
  fetchPulls
} from '../services/github'
import { buildAnalyticalModel, getTopRepositories } from '../services/analytics'
import { storage, STORAGE_KEYS } from '../utils/storage'
import { saveAnalysis, loadAnalysis } from '../services/cache'

const Ctx = createContext(null)

function getStoredRateLimit() {
  const stored = storage.get(STORAGE_KEYS.RATE_LIMIT)

  if (!stored) return null

  try {
    if (!stored.reset || Date.now() > stored.reset * 1000) {
      storage.remove(STORAGE_KEYS.RATE_LIMIT)
      return null
    }

    return stored
  } catch {
    storage.remove(STORAGE_KEYS.RATE_LIMIT)
    return null
  }
}

export function AppProvider({ children }) {
  const [pat, setPat] = useState(() => storage.get(STORAGE_KEYS.PAT) || '')
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
  const [advanceAnalyticsLoading, setAdvanceAnalyticsLoading] = useState(false)
  const [advanceAnalyticsComplete, setAdvanceAnalyticsComplete] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [auditComplete, setAuditComplete] = useState(false)
  const [lastOrgNames, setLastOrgNames] = useState([])
  // Keep routes waiting until cached analysis has been restored.
  const [hydrating, setHydrating] = useState(true)

  // Avoid refreshing the cache timestamp just because it was restored.
  const restoredFromCache = useRef(false)
  const patRequestId = useRef(0)

  // Restore the last analysis on startup.
  useEffect(() => {
    let cancelled = false

    loadAnalysis()
      .then(cached => {
        if (cancelled || !cached) return

        restoredFromCache.current = true

        setOrgs(cached.orgs || [])
        setModel(cached.model)
        setTotalRepo(cached.totalRepo || 0)
        setIsComplete(!!cached.isComplete)
        setLastOrgNames(cached.lastOrgNames || [])
        setIssuesData(cached.issuesData || {})
        setPullsData(cached.pullsData || {})
        setAuditComplete(!!cached.auditComplete)
        setAdvanceAnalyticsComplete(!!cached.advanceAnalyticsComplete)
      })
      .finally(() => {
        if (!cancelled) setHydrating(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Persist analysis when it changes.
  useEffect(() => {
    if (hydrating || !model) return

    if (restoredFromCache.current) {
      restoredFromCache.current = false
      return
    }

    saveAnalysis({
      orgs,
      model,
      totalRepo,
      isComplete,
      lastOrgNames,
      issuesData,
      pullsData,
      auditComplete,
      advanceAnalyticsComplete
    })
  }, [
    hydrating,
    orgs,
    model,
    totalRepo,
    isComplete,
    lastOrgNames,
    issuesData,
    pullsData,
    auditComplete,
    advanceAnalyticsComplete
  ])

  // Listen for rate-limit updates from other parts of the application.
  useEffect(() => {
    const handler = event => {
      setRateLimit(event.detail)
      storage.set(STORAGE_KEYS.RATE_LIMIT, event.detail)
    }

    window.addEventListener('rate-limit-update', handler)

    return () => {
      window.removeEventListener('rate-limit-update', handler)
    }
  }, [])

  // Clear expired rate-limit information.
  useEffect(() => {
    if (!rateLimit?.reset) return

    const timeout = setTimeout(() => {
      storage.remove(STORAGE_KEYS.RATE_LIMIT)
      setRateLimit(null)
    }, Math.max(0, rateLimit.reset * 1000 - Date.now()))

    return () => clearTimeout(timeout)
  }, [rateLimit])

  const refreshRateLimit = useCallback(async () => {
    const requestId = patRequestId.current
    const rl = await fetchRateLimit(pat)

    if (requestId !== patRequestId.current) return null

    if (rl) {
      setRateLimit(rl)
      return true
    }

    return false
  }, [pat])

  // Save or remove the GitHub personal access token.
  const savePat = useCallback(async token => {
    const requestId = ++patRequestId.current

    setPat(token)

    if (token) {
      storage.set(STORAGE_KEYS.PAT, token)

      const rl = await fetchRateLimit(token)

      // Ignore stale responses if another save or delete has started.
      if (requestId !== patRequestId.current) return

      if (rl) {
        setRateLimit(rl)
        storage.set(STORAGE_KEYS.RATE_LIMIT, rl)
      }
    } else {
      storage.remove(STORAGE_KEYS.PAT)
      storage.remove(STORAGE_KEYS.RATE_LIMIT)
      setRateLimit(null)
    }
  }, [])

  // Explore multiple organizations.
  const explore = useCallback(async orgNames => {
    // Trim and deduplicate organization names case-insensitively.
    const seen = new Set()
    const names = []

    for (const name of orgNames) {
      const trimmed = String(name).trim()
      const key = trimmed.toLowerCase()

      if (trimmed && !seen.has(key)) {
        seen.add(key)
        names.push(trimmed)
      }
    }

    if (!names.length) return false

    setLoading(true)
    setError('')
    setModel(null)
    setOrgs([])
    setIssuesData({})
    setLastOrgNames(names)
    setAuditComplete(false)
    setAdvanceAnalyticsComplete(false)

    try {
      setLoadMsg('Fetching organization metadata...')

      const orgRes = await Promise.allSettled(
        names.map(name => fetchOrg(name, pat))
      )

      const rateLimitError = orgRes.find(
        result =>
          result.status === 'rejected' &&
          result.reason?.message === 'RATE_LIMIT'
      )

      if (rateLimitError) {
        throw new Error('RATE_LIMIT')
      }

      const unexpectedError = orgRes.find(
        result =>
          result.status === 'rejected' &&
          result.reason?.message !== 'NOT_FOUND'
      )

      if (unexpectedError) {
        throw (
          unexpectedError.reason ||
          new Error('Failed to fetch organization data.')
        )
      }

      const validOrgs = orgRes
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)

      if (!validOrgs.length) {
        throw new Error(
          'No valid organizations found. Check the names and try again.'
        )
      }

      setOrgs(validOrgs)

      setLoadMsg('Fetching repositories...')

      const reposPerOrg = {}

      const repoRes = await Promise.allSettled(
        validOrgs.map(async org => {
          const repos = await fetchRepos(org.login, org.public_repos, pat)
          reposPerOrg[org.login] = repos
          return repos
        })
      )

      const repoRateLimit = repoRes.find(
        result =>
          result.status === 'rejected' &&
          result.reason?.message === 'RATE_LIMIT'
      )

      if (repoRateLimit) {
        throw new Error('RATE_LIMIT')
      }

      const total = Object.values(reposPerOrg).reduce(
        (sum, repos) => sum + (repos ? repos.length : 0),
        0
      )

      setTotalRepo(total)

      const totalReposPerOrg = Object.fromEntries(
        Object.entries(reposPerOrg).map(([org, repos]) => [
          org,
          [...(repos || [])]
        ])
      )

      setLoadMsg('Fetching contributor data for top repositories...')

      const contribsPerRepo = {}

      for (const org of validOrgs) {
        const top = pat
          ? reposPerOrg[org.login] || []
          : getTopRepositories(reposPerOrg[org.login] || [], 10)

        reposPerOrg[org.login] = top

        const contribRes = await Promise.allSettled(
          top.map(async repo => {
            const contribs = await fetchContributors(
              org.login,
              repo.name,
              pat
            )

            contribsPerRepo[`${org.login}/${repo.name}`] = contribs
            return contribs
          })
        )

        const contribRateLimit = contribRes.find(
          result =>
            result.status === 'rejected' &&
            result.reason?.message === 'RATE_LIMIT'
        )

        if (contribRateLimit) {
          throw new Error('RATE_LIMIT')
        }
      }

      setLoadMsg('Building analytical data model...')

      const builtModel = buildAnalyticalModel(
        validOrgs,
        reposPerOrg,
        contribsPerRepo,
        totalReposPerOrg
      )

      setModel(builtModel)
      setIsComplete(!!pat)

      // Save recent searches using official GitHub organization names.
      // Deduplicate entries case-insensitively and keep the latest six.
      const prev = storage.get(STORAGE_KEYS.RECENT_SEARCHES) || []
      const entry = validOrgs.map(org => org.login).join(', ')
      const entryKey = entry.toLowerCase()

      const next = [
        entry,
        ...prev.filter(
          item => String(item).toLowerCase() !== entryKey
        )
      ].slice(0, 6)

      storage.set(STORAGE_KEYS.RECENT_SEARCHES, next)

      return builtModel
    } catch (err) {
      setError(
        err.message === 'RATE_LIMIT'
          ? pat
            ? 'GitHub API rate limit reached. Please wait for your quota to refresh.'
            : 'GitHub API rate limit reached. Add a PAT in Settings for 5,000 req/hr.'
          : err.message
      )

      return false
    } finally {
      setLoading(false)
      setLoadMsg('')
    }
  }, [pat])

  // Re-run exploration for the same organizations.
  const runFullExplore = useCallback(() => {
    if (!lastOrgNames.length) return Promise.resolve(false)
    return explore(lastOrgNames)
  }, [explore, lastOrgNames])

  const selectAnalysisRepos = useCallback(allRepos => {
    const byOrg = {}

    for (const repo of allRepos) {
      ;(byOrg[repo.orgLogin] ??= []).push(repo)
    }

    return Object.values(byOrg).flatMap(orgRepos =>
      pat ? orgRepos : getTopRepositories(orgRepos, 10)
    )
  }, [pat])

  // Shared issue-fetch logic.
  const auditRepos = useCallback(async allRepos => {
    const repos = selectAnalysisRepos(allRepos)
    const map = {}

    for (let i = 0; i < repos.length; i += 5) {
      const batch = repos.slice(i, i + 5)

      await Promise.allSettled(
        batch.map(async repo => {
          map[`${repo.orgLogin}/${repo.name}`] = await fetchIssues(
            repo.orgLogin,
            repo.name,
            pat
          )
        })
      )
    }

    return map
  }, [pat, selectAnalysisRepos])

  // Governance audit.
  const runAudit = useCallback(async () => {
    if (!model || govLoading) return

    setGovLoading(true)

    try {
      const map = await auditRepos(model.allRepos)
      setIssuesData(map)
      setAuditComplete(!!pat)
    } finally {
      setGovLoading(false)
    }
  }, [model, pat, govLoading, auditRepos])

  // Run complete governance analysis.
  const runGovernanceAnalysis = useCallback(async () => {
    if (govLoading) return

    let currentModel = model

    if (!isComplete) {
      setGovLoading(true)

      const freshModel = await runFullExplore()

      setGovLoading(false)

      if (!freshModel) return
      currentModel = freshModel
    }

    if (!currentModel) return

    setGovLoading(true)

    try {
      const map = await auditRepos(currentModel.allRepos)
      setIssuesData(map)
      setAuditComplete(!!pat)
    } finally {
      setGovLoading(false)
    }
  }, [isComplete, model, runFullExplore, auditRepos, pat, govLoading])

  // Advanced analytics.
  const runAdvanceAnalytics = useCallback(async () => {
    if (advanceAnalyticsLoading) return

    let currentModel = model

    if (!isComplete) {
      setAdvanceAnalyticsLoading(true)

      const freshModel = await runFullExplore()

      setAdvanceAnalyticsLoading(false)

      if (!freshModel) return
      currentModel = freshModel
    }

    if (!currentModel) return

    setAdvanceAnalyticsLoading(true)

    try {
      const map = {}
      const repos = selectAnalysisRepos(currentModel.totalRepos)

      for (let i = 0; i < repos.length; i += 5) {
        const batch = repos.slice(i, i + 5)

        await Promise.allSettled(
          batch.map(async repo => {
            map[`${repo.orgLogin}/${repo.name}`] = await fetchPulls(
              repo.orgLogin,
              repo.name,
              pat
            )
          })
        )
      }

      setPullsData(map)
      setAdvanceAnalyticsComplete(!!pat)
    } finally {
      setAdvanceAnalyticsLoading(false)
    }
  }, [
    isComplete,
    model,
    runFullExplore,
    selectAnalysisRepos,
    pat,
    advanceAnalyticsLoading
  ])

  // Run both governance and advanced analytics.
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

    try {
      const [issuesMap, pullsMap] = await Promise.all([
        auditRepos(currentModel.allRepos),
        (async () => {
          const repos = selectAnalysisRepos(currentModel.totalRepos)
          const map = {}

          for (let i = 0; i < repos.length; i += 5) {
            const batch = repos.slice(i, i + 5)

            await Promise.allSettled(
              batch.map(async repo => {
                map[`${repo.orgLogin}/${repo.name}`] = await fetchPulls(
                  repo.orgLogin,
                  repo.name,
                  pat
                )
              })
            )
          }

          return map
        })()
      ])

      setIssuesData(issuesMap)
      setPullsData(pullsMap)
      setAuditComplete(!!pat)
      setAdvanceAnalyticsComplete(!!pat)
    } finally {
      setGovLoading(false)
      setAdvanceAnalyticsLoading(false)
    }
  }, [
    model,
    isComplete,
    runFullExplore,
    auditRepos,
    selectAnalysisRepos,
    pat,
    govLoading,
    advanceAnalyticsLoading
  ])

  const STALE_DAYS = 90

  const staleRepoStats = useMemo(() => {
    const now = Date.now()

    return Object.entries(issuesData || {})
      .map(([key, issues]) => {
        const [org, repo] = key.split('/')
        const normalIssues = issues.filter(issue => !issue.pull_request)
        const openIssues = normalIssues.filter(issue => issue.state === 'open')

        const staleIssues = openIssues.filter(issue => {
          const updated = new Date(issue.updated_at).getTime()
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
      })
      .sort((a, b) => b.ratio - a.ratio)
  }, [issuesData])

  return (
    <Ctx.Provider
      value={{
        pat,
        savePat,
        orgs,
        model,
        issuesData,
        pullsData,
        rateLimit,
        loading,
        loadMsg,
        govLoading,
        error,
        totalRepo,
        runAdvanceAnalytics,
        refreshRateLimit,
        advanceAnalyticsLoading,
        advanceAnalyticsComplete,
        runFullAnalytics,
        isComplete,
        auditComplete,
        lastOrgNames,
        hydrating,
        explore,
        runFullExplore,
        runAudit,
        runGovernanceAnalysis,
        setError,
        staleRepoStats
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
