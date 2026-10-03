// IndexedDB Cache (L2) 
const DB_NAME = 'orgexplorer_cache'
const STORE = 'cache'
const TTL_MS = 3_600_000 // 1 hour

// PAT generation: bumped every time the saved PAT changes (even A -> B -> A).
// Requests capture it at start and drop their quota event if it changed,
// so a late response from an old identity never overwrites current state.
let patGeneration = 0
export function bumpPatGeneration() { patGeneration += 1 }
export function getPatGeneration() { return patGeneration }

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
  const generationAtStart = patGeneration
  // L2 check
  const cached = await cacheGet(url)
  if (cached) return cached

  const headers = { Accept: 'application/vnd.github.v3+json' }
  if (pat) headers.Authorization = `token ${pat}`

  const res = await fetch(url, { headers })

  const live = readRateLimitHeaders(res.headers)
  if (live) {
    // Drop quota events from a superseded PAT: if the user saved a new
    // token while this request was in flight, its counters belong to the
    // old identity and must not overwrite the cleared/current state.
    // Generation catches even A -> B -> A (same value, new save).
    let superseded = generationAtStart !== patGeneration
    if (!superseded) {
      try {
        const currentPat = typeof localStorage !== 'undefined' ? localStorage.getItem('oe_pat') || '' : null
        if (currentPat !== null) superseded = (pat || '') !== currentPat
      } catch { /* keep generation-check result on storage failure */ }
    }
    if (!superseded) {
      window.dispatchEvent(
        new CustomEvent('rate-limit-update', { detail: live })
      )
    }
  }

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

/** Shared numeric validation, nonnegative checks and reset fallback. */
export function normalizeRateLimit(limitRaw, remainingRaw, usedRaw, resetRaw) {
  if (limitRaw == null || remainingRaw == null) return null
  const limit = Number(limitRaw)
  const remaining = Number(remainingRaw)
  if (!Number.isFinite(limit) || !Number.isFinite(remaining)) return null
  if (limit < 0 || remaining < 0) return null
  const used = Number(usedRaw)
  const reset = Number(resetRaw)
  return {
    limit,
    remaining,
    used: Number.isFinite(used) ? used : limit - remaining,
    reset: Number.isFinite(reset) ? reset : 0,
  }
}

/** Read live counters from response headers (authoritative per GitHub docs).
 *  Returns null when the headers are absent so callers can fall back. */
function readRateLimitHeaders(h) {
  if (!h || typeof h.get !== 'function') return null
  const rawLimit = h.get('x-ratelimit-limit')
  const rawRemaining = h.get('x-ratelimit-remaining')
  if (rawLimit == null || rawRemaining == null) return null
  const rawUsed = Number(h.get('x-ratelimit-used'))
  const rawReset = h.get('x-ratelimit-reset')
  // `x-ratelimit-used` is not in Access-Control-Expose-Headers, so browsers
  // always read it as null -> 0. Derive it instead of showing a false 0.
  const usedRaw = Number.isFinite(rawUsed) && rawUsed > 0 ? rawUsed : undefined
  return normalizeRateLimit(rawLimit, rawRemaining, usedRaw, rawReset)
}

/** Validate a rate-limit object from the `/rate_limit` body. */
export function asValidRateLimit(obj) {
  if (!obj) return null
  return normalizeRateLimit(obj.limit, obj.remaining, obj.used, obj.reset)
}

export async function fetchRateLimit(pat) {
  try {
    const headers = { Accept: 'application/vnd.github.v3+json' }
    if (pat) headers.Authorization = `token ${pat}`
    const res = await fetch('https://api.github.com/rate_limit', { headers })
    const data = await res.json().catch(() => null)
    // Headers are the authoritative source; the body (`rate` is closing
    // down, and the body can disagree with the live counters) is fallback.
    return readRateLimitHeaders(res.headers)
      ?? asValidRateLimit(data?.resources?.core)
      ?? asValidRateLimit(data?.rate)
      ?? null
  } catch { return null }
}
