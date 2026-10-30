import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { fetchOrg, fetchRepos, fetchContributors, fetchIssues, fetchRateLimit, fetchPulls } from '../services/github'
import { buildAnalyticalModel, getTopRepositories } from '../services/analytics'
import { saveAnalysis, loadAnalysis } from '../services/cache'
import { createAbortError, isAbortError } from '../services/abort'

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
  // True until the cached analysis has been read, so routes that need a model
  // wait for the restore instead of bouncing to the picker on first paint.
  const [hydrating, setHydrating] = useState(true)
  // Set when state came straight from the cache, so the write-back effect can
  // skip it. Re-saving an untouched restore would stamp a fresh savedAt on
  // every page load and the entry would never reach its TTL.
  const restoredFromCache = useRef(false)

  const patRequestId = useRef(0)
  // The active data pipeline. `id` identifies its generation and `controller`
  // aborts its in-flight network requests when a newer pipeline supersedes it.
  const pipelineRef = useRef({ id: 0, controller: null })

  // An unmount must not leave a pipeline streaming requests in the background.
  useEffect(() => () => {
    pipelineRef.current.controller?.abort()
  }, [])

  // Restore the last analysis on startup. The model is held in memory, so
  // without this a reload, bookmark or shared link loses it entirely.
  useEffect(() => {
    let cancelled = false

    loadAnalysis()
      .then(cached => {
        // A search started while IndexedDB was still being read. Its result is
        // newer than the restored snapshot, so leave the active state alone.
        if (cancelled || !cached || pipelineRef.current.id !== 0) return

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

    return () => { cancelled = true }
  }, [])

  // Persist the analysis whenever it changes, including audit and analytics
  // results — those are the most expensive data to refetch.
  useEffect(() => {
    if (hydrating || !model) return

    // Skip the write that would immediately follow a restore.
    if (restoredFromCache.current) {
      restoredFromCache.current = false
      return
    }

    saveAnalysis({
      orgs, model, totalRepo, isComplete, lastOrgNames,
      issuesData, pullsData, auditComplete, advanceAnalyticsComplete
    })
  }, [
    hydrating, orgs, model, totalRepo, isComplete, lastOrgNames,
    issuesData, pullsData, auditComplete, advanceAnalyticsComplete
  ])

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
    const requestId = patRequestId.current
    const rl = await fetchRateLimit(pat)

    if (requestId !== patRequestId.current) return null

    if (rl) {
      setRateLimit(rl)
      return true
    }
    return false
  }, [pat])
  const savePat = useCallback(async token => {
    const requestId = ++patRequestId.current

    setPat(token)

    if (token) {
      localStorage.setItem('oe_pat', token)

      const rl = await fetchRateLimit(token)

      // A newer save or delete started while this request was in flight.
      if (requestId !== patRequestId.current) return

      if (rl) {
        setRateLimit(rl)
        localStorage.setItem('oe_rate_limit', JSON.stringify(rl))
      }
    } else {
      localStorage.removeItem('oe_pat')
      localStorage.removeItem('oe_rate_limit')
      setRateLimit(null)
    }
  }, [])

  /**
   * Start a new pipeline generation and abort the previous one.
   *
   * The new id is published *before* aborting so cleanup handlers belonging to
   * the old run can immediately see that they are stale and must not write to
   * shared state.
   */
  const beginPipeline = useCallback(() => {
    const previous = pipelineRef.current
    const session = {
      id: previous.id + 1,
      controller: new AbortController()
    }
    pipelineRef.current = session
    previous.controller?.abort()
    return session
  }, [])

  const isPipelineCurrent = useCallback(session =>
    !!session &&
    session.id === pipelineRef.current.id &&
    !session.controller.signal.aborted,
  [])

  /** Throws an AbortError as soon as this run is no longer the active one. */
  const ensurePipelineCurrent = useCallback(session => {
    if (!isPipelineCurrent(session)) throw createAbortError()
  }, [isPipelineCurrent])

  /**
   * Clear transient UI flags owned by every kind of pipeline. A new run must
   * reset flags belonging to the operation it superseded, otherwise an old
   * aborted run's guarded `finally` can leave a loading loop behind.
   */
  const resetPipelineUi = useCallback(() => {
    setLoading(false)
    setLoadMsg('')
    setGovLoading(false)
    setAdvanceAnalyticsLoading(false)
    setError('')
  }, [])

  /**
   * A new search replaces every piece of state derived from the previous
   * portfolio. Leaving issues, pulls or totals behind is what produced a
   * mixed model when a slow request from the old search resolved late.
   */
  const resetExploreState = useCallback((session, names) => {
    if (!isPipelineCurrent(session)) return

    setLoading(true)
    setError('')
    setModel(null)
    setOrgs([])
    setIssuesData({})
    setPullsData({})
    setTotalRepo(0)
    setIsComplete(false)
    setLastOrgNames(names)
    setAuditComplete(false)
    setAdvanceAnalyticsComplete(false)
    setLoadMsg('Fetching organization metadata...')
  }, [isPipelineCurrent])

  /**
   * Explore using an existing session. Public entry points call this so a
   * composite run (full analytics -> explore -> audit) keeps one generation
   * instead of aborting itself when it reaches the explore step.
   */
  const exploreCore = useCallback(async (session, names) => {
    if (!names.length) return false

    const signal = session.controller.signal

    try {
      ensurePipelineCurrent(session)
      resetExploreState(session, names)

      const orgRes = await Promise.allSettled(names.map(n => fetchOrg(n, pat, signal)))
      ensurePipelineCurrent(session)

      const rateLimitError = orgRes.find(r => r.status === 'rejected' && r.reason?.message === 'RATE_LIMIT')
      if (rateLimitError) {
        throw new Error('RATE_LIMIT')
      }

      const unexpectedError = orgRes.find(r => r.status === 'rejected' && r.reason?.message !== 'NOT_FOUND')
      if (unexpectedError) {
        throw (unexpectedError.reason || new Error('Failed to fetch organization data.'))
      }

      const validOrgs = orgRes.filter(r => r.status === 'fulfilled').map(r => r.value)
      if (!validOrgs.length) throw new Error('No valid organizations found. Check the names and try again.')
      ensurePipelineCurrent(session)
      setOrgs(validOrgs)

      setLoadMsg('Fetching repositories...')
      const reposPerOrg = {}
      const repoRes = await Promise.allSettled(validOrgs.map(async org => {
        const repos = await fetchRepos(org.login, org.public_repos, pat, signal)
        reposPerOrg[org.login] = repos
        return repos
      }))
      ensurePipelineCurrent(session)

      const repoRateLimit = repoRes.find(r => r.status === 'rejected' && r.reason?.message === 'RATE_LIMIT')
      if (repoRateLimit) {
        throw new Error('RATE_LIMIT')
      }

      const total = Object.values(reposPerOrg).reduce((sum, repos) => sum + (repos ? repos.length : 0), 0);
      setTotalRepo(total);

      const totalReposPerOrg = Object.fromEntries(
        Object.entries(reposPerOrg).map(([org, repos]) => [org, [...(repos || [])]])
      );

      setLoadMsg('Fetching contributor data for top repositories...')
      const contribsPerRepo = {}
      for (const org of validOrgs) {
        ensurePipelineCurrent(session)

        const top = pat ? (reposPerOrg[org.login] || []) : getTopRepositories(reposPerOrg[org.login] || [], 10);
        reposPerOrg[org.login] = top;

        const contribRes = await Promise.allSettled(top.map(async repo => {
          const contribs = await fetchContributors(org.login, repo.name, pat, signal)
          contribsPerRepo[`${org.login}/${repo.name}`] = contribs
          return contribs
        }))
        ensurePipelineCurrent(session)

        const contribRateLimit = contribRes.find(r => r.status === 'rejected' && r.reason?.message === 'RATE_LIMIT')
        if (contribRateLimit) {
          throw new Error('RATE_LIMIT')
        }
      }

      setLoadMsg('Building analytical data model...')
      const builtModel = buildAnalyticalModel(validOrgs, reposPerOrg, contribsPerRepo, totalReposPerOrg)
      ensurePipelineCurrent(session)
      setModel(builtModel)

      setIsComplete(!!pat)

      // Save to recent searches, canonicalized to the official login
      // casing returned by GitHub and deduplicated case-insensitively, so
      // `AOSSIE-Org` and `aossie-org` share one entry (and one cache key).
      const prev = JSON.parse(localStorage.getItem('oe_recent') || '[]')
      const entry = validOrgs.map(o => o.login).join(', ')
      const entryKey = entry.toLowerCase()
      const next = [entry, ...prev.filter(r => String(r).toLowerCase() !== entryKey)].slice(0, 6)
      localStorage.setItem('oe_recent', JSON.stringify(next))
      return builtModel
    } catch (err) {
      // An aborted or superseded run is expected and must never surface an
      // error or touch state owned by the newer session.
      if (isAbortError(err) || !isPipelineCurrent(session)) return false

      setError(err?.message === 'RATE_LIMIT'
        ? (pat
            ? 'GitHub API rate limit reached. Please wait for your quota to refresh.'
            : 'GitHub API rate limit reached. Add a PAT in Settings for 5,000 req/hr.')
        : (err?.message || 'Failed to fetch organization data.'))
      return false
    } finally {
      if (isPipelineCurrent(session)) {
        setLoading(false)
        setLoadMsg('')
      }
    }
  }, [pat, ensurePipelineCurrent, isPipelineCurrent, resetExploreState])

  // Multi-org explore
  const explore = useCallback(async orgNames => {
    // Trim and dedupe case-insensitively: `AOSSIE-Org` and `aossie-org`
    // are the same org on GitHub and must not trigger duplicate fetches.
    const seen = new Set()
    const names = []
    for (const n of orgNames) {
      const trimmed = String(n).trim()
      const key = trimmed.toLowerCase()
      if (trimmed && !seen.has(key)) {
        seen.add(key)
        names.push(trimmed)
      }
    }
    if (!names.length) return false

    const session = beginPipeline()
    resetPipelineUi()
    return exploreCore(session, names)
  }, [beginPipeline, resetPipelineUi, exploreCore])

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
  const auditRepos = useCallback(async (session, allRepos) => {
    const signal = session.controller.signal
    const repos = selectAnalysisRepos(allRepos)

    const map = {}
    for (let i = 0; i < repos.length; i += 5) {
      ensurePipelineCurrent(session)
      const batch = repos.slice(i, i + 5)
      await Promise.allSettled(batch.map(async repo => {
        map[`${repo.orgLogin}/${repo.name}`] = await fetchIssues(repo.orgLogin, repo.name, pat, signal)
      }))
      // allSettled hides abort rejections, so check the session explicitly
      // before moving on to the next batch.
      ensurePipelineCurrent(session)
    }
    return map
  }, [pat, selectAnalysisRepos, ensurePipelineCurrent])

  // Shared pull-fetch logic used by advanced analytics and the combined run
  const pullsRepos = useCallback(async (session, allRepos) => {
    const signal = session.controller.signal
    const repos = selectAnalysisRepos(allRepos)

    const map = {}
    for (let i = 0; i < repos.length; i += 5) {
      ensurePipelineCurrent(session)
      const batch = repos.slice(i, i + 5)
      await Promise.allSettled(batch.map(async repo => {
        map[`${repo.orgLogin}/${repo.name}`] = await fetchPulls(repo.orgLogin, repo.name, pat, signal)
      }))
      ensurePipelineCurrent(session)
    }
    return map
  }, [pat, selectAnalysisRepos, ensurePipelineCurrent])

  // Governance audit : used directly when repos are already complete
  const runAudit = useCallback(async () => {
    if (!model || govLoading) return false

    const session = beginPipeline()
    resetPipelineUi()
    setGovLoading(true)

    try {
      const map = await auditRepos(session, model.allRepos)
      ensurePipelineCurrent(session)
      setIssuesData(map)
      setAuditComplete(!!pat)
      return true
    } catch (err) {
      if (isAbortError(err) || !isPipelineCurrent(session)) return false
      setError(err?.message || 'Failed to run governance audit.')
      return false
    } finally {
      if (isPipelineCurrent(session)) setGovLoading(false)
    }
  }, [model, pat, govLoading, beginPipeline, resetPipelineUi, auditRepos, ensurePipelineCurrent, isPipelineCurrent])

  // Entry point for Governance / Analytics "Run Complete Analysis"
  // - If repos/contributors aren't complete yet -> fetch them first (explore),
  //   then fetch issues using the freshly-returned model (avoids stale closure).
  // - If already complete -> skip repo fetching (cache/state already has it),
  //   just fetch issues.
  const runGovernanceAnalysis = useCallback(async () => {
    if (govLoading) return false

    const session = beginPipeline()
    resetPipelineUi()
    setGovLoading(true)

    try {
      let currentModel = model
      if (!isComplete) {
        currentModel = await exploreCore(session, lastOrgNames)
        ensurePipelineCurrent(session)
        if (!currentModel) return false
      }

      if (!currentModel) return false

      const map = await auditRepos(session, currentModel.allRepos)
      ensurePipelineCurrent(session)
      setIssuesData(map)
      setAuditComplete(!!pat)
      return true
    } catch (err) {
      if (isAbortError(err) || !isPipelineCurrent(session)) return false
      setError(err?.message || 'Failed to run governance analysis.')
      return false
    } finally {
      if (isPipelineCurrent(session)) setGovLoading(false)
    }
  }, [
    isComplete, model, lastOrgNames, pat, govLoading, beginPipeline,
    resetPipelineUi, exploreCore, auditRepos, ensurePipelineCurrent, isPipelineCurrent
  ])

  // Advanced analytics — parallel batches of 5 (Section 3.2.5)
  // Entry point for Analytics "Run Complete Analysis"
  // - If repos/contributors aren't complete yet -> fetch them first (explore),
  //   then fetch pulls using the freshly-returned model (avoids stale closure).
  // - If already complete -> skip repo fetching, just fetch pulls.
  const runAdvanceAnalytics = useCallback(async () => {
    if (advanceAnalyticsLoading) return false

    const session = beginPipeline()
    resetPipelineUi()
    setAdvanceAnalyticsLoading(true)

    try {
      let currentModel = model
      if (!isComplete) {
        currentModel = await exploreCore(session, lastOrgNames)
        ensurePipelineCurrent(session)
        if (!currentModel) return false
      }

      if (!currentModel) return false

      const map = await pullsRepos(session, currentModel.totalRepos)
      ensurePipelineCurrent(session)
      setPullsData(map)
      setAdvanceAnalyticsComplete(!!pat)
      return true
    } catch (err) {
      if (isAbortError(err) || !isPipelineCurrent(session)) return false
      setError(err?.message || 'Failed to run advanced analytics.')
      return false
    } finally {
      if (isPipelineCurrent(session)) setAdvanceAnalyticsLoading(false)
    }
  }, [
    isComplete, model, lastOrgNames, pat, advanceAnalyticsLoading, beginPipeline,
    resetPipelineUi, exploreCore, pullsRepos, ensurePipelineCurrent, isPipelineCurrent
  ])

  // Combined entry point for the whole Analytics page banner
  // Runs explore() once if needed, then fetches issues + pulls in parallel
  const runFullAnalytics = useCallback(async () => {
    if (govLoading || advanceAnalyticsLoading) return false

    const session = beginPipeline()
    resetPipelineUi()
    setGovLoading(true)
    setAdvanceAnalyticsLoading(true)

    try {
      let currentModel = model
      if (!isComplete) {
        currentModel = await exploreCore(session, lastOrgNames)
        ensurePipelineCurrent(session)
        if (!currentModel) return false
      }

      if (!currentModel) return false

      const [issuesMap, pullsMap] = await Promise.all([
        auditRepos(session, currentModel.allRepos),
        pullsRepos(session, currentModel.totalRepos)
      ])
      ensurePipelineCurrent(session)

      setIssuesData(issuesMap)
      setPullsData(pullsMap)
      setAuditComplete(!!pat)
      setAdvanceAnalyticsComplete(!!pat)
      return true
    } catch (err) {
      if (isAbortError(err) || !isPipelineCurrent(session)) return false
      setError(err?.message || 'Failed to run the complete analysis.')
      return false
    } finally {
      if (isPipelineCurrent(session)) {
        setGovLoading(false)
        setAdvanceAnalyticsLoading(false)
      }
    }
  }, [
    model, isComplete, lastOrgNames, pat, govLoading, advanceAnalyticsLoading,
    beginPipeline, resetPipelineUi, exploreCore, auditRepos, pullsRepos,
    ensurePipelineCurrent, isPipelineCurrent
  ])

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
      isComplete, auditComplete, lastOrgNames, hydrating,
      explore, runFullExplore, runAudit, runGovernanceAnalysis, setError, staleRepoStats
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => useContext(Ctx)
