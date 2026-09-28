// IndexedDB Cache (L2) 
const DB_NAME = 'orgexplorer_cache'
const STORE = 'cache'
// Excludes bot accounts (CodeRabbit, dependabot, etc.) from maintainer attribution.
function isBot(user) {
  return user?.type === 'Bot' || /\[bot\]$/i.test(user?.login || '')
}
const TTL_MS = 3_600_000 // 1 hour

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
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
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
      tx.objectStore(STORE).put({ k: key, v: value, ts: Date.now() })
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
  for(let page = 1; page<=maxPages ; page++) {
    const url = `https://api.github.com/repos/${org}/${repo}/contributors?per_page=100&page=${page}`
    const data = await fetchWithCache(url, pat)
    all.push(...data)
    if(data.length < 100) break
  }
  return all
}

export async function fetchIssues(org, repo, pat) {
  const all = []
  const maxPages = pat ? 10 : 1
  for(let page = 1; page<=maxPages ; page++) {
    const url = `https://api.github.com/repos/${org}/${repo}/issues?state=all&per_page=100&page=${page}`
    const data = await fetchWithCache(url, pat)
    all.push(...data)
    if(data.length < 100) break
  }
  return all
}

export async function fetchPulls(org, repo, pat) {
  const all = []
  const maxPages = pat ? 10 : 1
  for(let page = 1; page<=maxPages ; page++) {
    const url = `https://api.github.com/repos/${org}/${repo}/pulls?state=all&per_page=100&page=${page}`
    const data = await fetchWithCache(url, pat)
    all.push(...data)
    if(data.length < 100) break
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
  try {
    const detail = await fetchWithCache(base, pat)
    if (detail?.merged_by && !isBot(detail.merged_by)) {
      merged_by = detail.merged_by.login
      merged_by_avatar = detail.merged_by.avatar_url || ''
    }
  } catch {
    // leave merged_by null on failure; this PR's merge simply isn't counted
  }

  let reviewers = []
  try {
    const reviews = await fetchWithCache(`${base}/reviews?per_page=100`, pat)
    if (Array.isArray(reviews)) {
      const seen = new Set()
      for (const rv of reviews) {
        const login = rv?.user?.login
        if (login && !seen.has(login) && !isBot(rv.user)) {
          seen.add(login)
          reviewers.push({ login, avatar: rv.user.avatar_url || '' })
        }
      }
    }
  } catch {
    // leave reviewers empty on failure
  }

  return { merged_by, merged_by_avatar, reviewers }
}

// The cap on how many recent merged/closed PRs to enrich for maintainer
// attribution. Enriching each PR costs 2 API calls, so this bounds the work.
export const MAINTAINER_PR_CAP = 100

// Selects the most-recent merged/closed PRs from pullsData, capped. Pure — no
// fetching. Exported so it can be unit-tested independently of the network.
export function selectPRsToEnrich(pullsData, cap = MAINTAINER_PR_CAP) {
  const flat = []
  for (const [key, prs] of Object.entries(pullsData || {})) {
    if (!Array.isArray(prs)) continue
    const [org, repo] = key.split('/')
    for (const pr of prs) {
      // Only merged or closed PRs carry meaningful merge/review attribution
      if (pr?.merged_at || pr?.state === 'closed') {
        flat.push({ org, repo, number: pr.number, updated_at: pr.updated_at })
      }
    }
  }
  flat.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  return flat.slice(0, cap)
}

// Enriches the capped set of recent PRs with merged_by + reviewers, then returns
// the enriched array (ready for computeMaintainerAttribution). PAT-gated: without
// a token this returns [] rather than burning the tiny unauthenticated quota.
// Sequential by design — parallel bursts trip GitHub's abuse detection.
export async function enrichMaintainerPRs(pullsData, pat, cap = MAINTAINER_PR_CAP) {
  if (!pat) return []
  const selected = selectPRsToEnrich(pullsData, cap)
  const enriched = []
  for (const { org, repo, number } of selected) {
    if (number == null) continue
    const details = await fetchPullDetails(org, repo, number, pat)
    enriched.push(details)
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
