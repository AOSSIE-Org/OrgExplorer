// IndexedDB Cache (L2) 
const DB_NAME = 'orgexplorer_cache'
const STORE = 'cache'
// Excludes bot accounts (CodeRabbit, dependabot, etc.) from maintainer attribution.
function isBot(user) {
  return user?.type === 'Bot' || /\[bot\]$/i.test(user?.login || '')
}
const TTL_MS = 3_600_000 // 1 hour

/**
 * Canonicalize an API URL into a deterministic cache key.
 *
 * GitHub treats org and repo names case-insensitively, but the raw URL
 * string does not — `.../orgs/AOSSIE-Org` and `.../orgs/aossie-org` would
 * otherwise become two separate entries, and a re-search in a different
 * case would burn rate-limit quota on data we already hold.
 *
 * Only the pathname is lowercased; query values are left untouched (they
 * can be case-sensitive, e.g. search qualifiers) while parameter order is
 * normalized so equivalent URLs share one key. The request URL itself is
 * never rewritten — this applies to the cache key only.
 */
export function normalizeCacheKey(url) {
  try {
    const u = new URL(url)
    u.pathname = (u.pathname.replace(/\/+$/, '') || '/').toLowerCase()
    u.searchParams.sort()
    return u.toString()
  } catch {
    return url
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE, { keyPath: 'k' })
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = () => reject(req.error)
  })
}

export async function cacheGet(key) {
  try {
    const db = await openDB()
    return new Promise(res => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(normalizeCacheKey(key))
      req.onsuccess = () => {
        const r = req.result
        if (!r || Date.now() - r.ts > TTL_MS) return res(null)
        res(r.v)
      }
      req.onerror = () => res(null)
    })
  } catch { return null }
}

export async function cacheSet(key, value) {
  try {
    const db = await openDB()
    return new Promise(res => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ k: normalizeCacheKey(key), v: value, ts: Date.now() })
      tx.oncomplete = () => res(true)
      tx.onerror = () => res(false)
    })
  } catch { return false }
}

export async function cacheClear() {
  try {
    const db = await openDB()
    return new Promise(res => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).clear()
      tx.oncomplete = () => res(true)
      tx.onerror = () => res(false)
    })
  } catch { return false }
}

// Core fetchWithCache 
async function fetchWithCache(url, pat) {
  // L2 check
  const cached = await cacheGet(url)
  if (cached) return cached

  const headers = { Accept: 'application/vnd.github.v3+json' }
  if (pat) headers.Authorization = `token ${pat}`

  const res = await fetch(url, { headers })

  window.dispatchEvent(
    new CustomEvent('rate-limit-update', {
      detail: {
        limit: Number(res.headers.get('x-ratelimit-limit')),
        remaining: Number(res.headers.get('x-ratelimit-remaining')),
        used: Number(res.headers.get('x-ratelimit-used')),
        reset: Number(res.headers.get('x-ratelimit-reset'))
      }
    })
  )

  if (res.status === 403) throw new Error('RATE_LIMIT')
  if (res.status === 404) throw new Error('NOT_FOUND')

  if (res.status === 204 || res.status === 409) {
    // Empty repository (e.g. contributors on a repo with no commits):
    // GitHub answers with no JSON body, so res.json() below would throw
    // and the failure would never be cached — every re-search would spend
    // another token on the same URL. Cache the empty result instead.
    // All list-endpoint callers treat [] as "no data", and analytics
    // already defaults missing entries to [].
    const empty = []
    cacheSet(url, empty) // write-back, non-blocking
    return empty
  }

  if (!res.ok) throw new Error(`HTTP_${res.status}`)

  const data = await res.json()
  cacheSet(url, data) // write-back, non-blocking
  return data
}

// Public service functions
export const fetchOrg = (org, pat) =>
  fetchWithCache(`https://api.github.com/orgs/${org}`, pat)

export async function fetchRepos(org, repoCount, pat) {
  const all = []
  const maxPages = pat ? Math.ceil(repoCount / 100) : 5
  for (let page = 1; page <= maxPages; page++) {
    const url = `https://api.github.com/orgs/${org}/repos?per_page=100&page=${page}&sort=updated`
    const data = await fetchWithCache(url, pat)
    all.push(...data)
    if (data.length < 100) break
  }
  return all
}

export async function fetchContributors(org, repo, pat) {
  const all = []
  const maxPages = pat ? 10 : 1
  for (let page = 1; page <= maxPages; page++) {
    const url = `https://api.github.com/repos/${org}/${repo}/contributors?per_page=100&page=${page}`
    const data = await fetchWithCache(url, pat)
    all.push(...data)
    if (data.length < 100) break
  }
  return all
}

export async function fetchIssues(org, repo, pat) {
  const all = []
  const maxPages = pat ? 10 : 1
  for (let page = 1; page <= maxPages; page++) {
    const url = `https://api.github.com/repos/${org}/${repo}/issues?state=all&per_page=100&page=${page}`
    const data = await fetchWithCache(url, pat)
    all.push(...data)
    if (data.length < 100) break
  }
  return all
}

export async function fetchPulls(org, repo, pat) {
  const all = []
  const maxPages = pat ? 10 : 1
  for (let page = 1; page <= maxPages; page++) {
    const url = `https://api.github.com/repos/${org}/${repo}/pulls?state=all&per_page=100&page=${page}`
    const data = await fetchWithCache(url, pat)
    all.push(...data)
    if (data.length < 100) break
  }
  return all
}
// Fetch per-PR detail needed for maintainer attribution:
//   - merged_by: who merged the PR (only present on the single-PR endpoint, not the list)
//   - reviewers: unique logins who submitted a review
// Reuses fetchWithCache, so each PR's detail + reviews are cached in IndexedDB.
export async function fetchPullDetails(org, repo, number, pat) {
  const base = `https://api.github.com/repos/${org}/${repo}/pulls/${number}`

  let merged_by = null
  let merged_by_avatar = ''
  let merged_at = null
  try {
    const detail = await fetchWithCache(base, pat)
    if (detail?.merged_by && !isBot(detail.merged_by)) {
      merged_by = detail.merged_by.login
      merged_by_avatar = detail.merged_by.avatar_url || ''
      merged_at = detail.merged_at || null
    }
  } catch {
    // leave merged_by null on failure; this PR's merge simply isn't counted
  }

  let reviewers = []
  try {
    const reviews = await fetchWithCache(`${base}/reviews?per_page=100`, pat)
    if (Array.isArray(reviews)) {
      const latest = {} // login -> most recent submitted_at
      const avatars = {}
      for (const rv of reviews) {
        const login = rv?.user?.login
        if (!login || isBot(rv.user)) continue
        const at = rv.submitted_at || null
        if (!latest[login] || (at && at > latest[login])) latest[login] = at
        avatars[login] = rv.user.avatar_url || ''
      }
      reviewers = Object.keys(latest).map(login => ({
        login, avatar: avatars[login], reviewed_at: latest[login],
      }))
    }
  } catch {
    // leave reviewers empty on failure
  }

  return { merged_by, merged_by_avatar, merged_at, reviewers }
}

// Per-repo cap: take the most-recent merged/closed PRs from EACH repo, so a busy
// repo can't crowd out quieter ones (which would drop their maintainers entirely).
export const MAINTAINER_PR_PER_REPO = 10
export const MAINTAINER_PR_TOTAL_CAP = 150
// Absolute ceiling on PRs enriched in one load, regardless of slider setting, so
// a high per-repo value can't recreate the thousands-of-calls / minutes-long load.
export const MAINTAINER_PR_HARD_MAX = 600

// Selects the most-recent merged/closed PRs per repo. Pure — no fetching. Carries
// org/repo and the merge/update date so the page can filter by org and compute
// recency-based "Active". Exported so it can be unit-tested independently.
export function selectPRsToEnrich(pullsData, perRepo = MAINTAINER_PR_PER_REPO, totalCap = MAINTAINER_PR_TOTAL_CAP) {
  // Per repo: most-recent merged/closed PRs, newest first.
  const perRepoLists = []
  for (const [key, prs] of Object.entries(pullsData || {})) {
    if (!Array.isArray(prs)) continue
    const [org, repo] = key.split('/')
    const recent = prs
      .filter(pr => pr?.merged_at || pr?.state === 'closed')
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, perRepo)
      .map(pr => ({ org, repo, number: pr.number, updated_at: pr.updated_at, merged_at: pr.merged_at }))
    if (recent.length) perRepoLists.push(recent)
  }

  // Round-robin across repos so every repo is represented before any repo fills up,
  // then stop at the total cap. Keeps the page bounded without a busy repo crowding
  // out quieter ones.
  const selected = []
  let i = 0
  while (selected.length < totalCap) {
    let took = false
    for (const list of perRepoLists) {
      if (i < list.length) {
        selected.push(list[i])
        took = true
        if (selected.length >= totalCap) break
      }
    }
    if (!took) break // all repos exhausted
    i++
  }
  return selected
}

// Enriches the selected PRs with merged_by + reviewers, then returns the enriched
// array (ready for computeMaintainerAttribution). PAT-gated: without a token this
// returns [] rather than burning the tiny unauthenticated quota. Sequential by
// design — parallel bursts trip GitHub's abuse detection. Each result carries
// org/repo (for filtering) and activity_at (for recency-based "Active").
// totalCap bounds the work; it's clamped to MAINTAINER_PR_HARD_MAX so even a high
// per-repo slider setting can't blow up load time / the user's rate limit.
export async function enrichMaintainerPRs(pullsData, pat, perRepo = MAINTAINER_PR_PER_REPO, totalCap = MAINTAINER_PR_TOTAL_CAP, signal) {
  if (!pat) return []
  const cap = Math.min(totalCap, MAINTAINER_PR_HARD_MAX)
  const selected = selectPRsToEnrich(pullsData, perRepo, cap)
  const enriched = []
  for (const { org, repo, number, merged_at, updated_at } of selected) {
    if (signal?.aborted) break          // stop the loop if this run was superseded
    if (number == null) continue
    const details = await fetchPullDetails(org, repo, number, pat)
    enriched.push({ ...details, org, repo, updated_at })
  }
  return enriched
}
export async function fetchRateLimit(pat) {
  try {
    const headers = { Accept: 'application/vnd.github.v3+json' }
    if (pat) headers.Authorization = `token ${pat}`
    const res = await fetch('https://api.github.com/rate_limit', { headers })
    const data = await res.json()
    return data.rate
  } catch { return null }
}
