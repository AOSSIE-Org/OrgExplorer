// IndexedDB Cache (L2) 
const DB_NAME = 'orgexplorer_cache'
const STORE = 'cache'
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
function hashToken(str) {
  let h1 = 0x811c9dc5 >>> 0
  let h2 = 0x9e3779b9 >>> 0
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 16777619) >>> 0
    h2 = Math.imul(h2 ^ ch, 2246822507) >>> 0
  }
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`
}

export function normalizeCacheKey(url, pat) {
  const isAuth = typeof pat === 'boolean' ? pat : Boolean(pat && String(pat).trim())
  const tokenStr = typeof pat === 'string' ? pat.trim() : ''
  const scope = isAuth
    ? (tokenStr ? `auth_${hashToken(tokenStr)}` : 'auth')
    : 'anon'

  let rawUrl = url
  if (typeof rawUrl === 'string') {
    rawUrl = rawUrl.replace(/^(auth(_[a-f0-9]+)?|anon):/, '')
  }

  try {
    const u = new URL(rawUrl)
    u.pathname = (u.pathname.replace(/\/+$/, '') || '/').toLowerCase()
    u.searchParams.sort()
    return `${scope}:${u.toString()}`
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

export async function cacheGet(key, pat) {
  try {
    const db = await openDB()
    return new Promise(res => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(normalizeCacheKey(key, pat))
      req.onsuccess = () => {
        const r = req.result
        if (!r || Date.now() - r.ts > TTL_MS) return res(null)
        res(r.v)
      }
      req.onerror = () => res(null)
    })
  } catch { return null }
}

export async function cacheSet(key, value, pat) {
  try {
    const db = await openDB()
    return new Promise(res => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ k: normalizeCacheKey(key, pat), v: value, ts: Date.now() })
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
  const cached = await cacheGet(url, pat)
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

  if (res.status === 429) throw new Error('RATE_LIMIT')
  if (res.status === 403) {
    const remaining = res.headers?.get ? res.headers.get('x-ratelimit-remaining') : null
    const retryAfter = res.headers?.get ? res.headers.get('retry-after') : null

    if (remaining === '0' || retryAfter) {
      throw new Error('RATE_LIMIT')
    }

    try {
      const cloned = typeof res.clone === 'function' ? res.clone() : res
      const body = await cloned.json()
      const msg = typeof body?.message === 'string' ? body.message.toLowerCase() : ''
      if (msg.includes('rate limit') || msg.includes('secondary rate') || msg.includes('abuse detection')) {
        throw new Error('RATE_LIMIT')
      }
    } catch (e) {
      if (e.message === 'RATE_LIMIT') throw e
    }

    throw new Error('HTTP_403')
  }
  if (res.status === 404) throw new Error('NOT_FOUND')

  if (res.status === 204 || res.status === 409) {
    // Empty repository (e.g. contributors on a repo with no commits):
    // GitHub answers with no JSON body, so res.json() below would throw
    // and the failure would never be cached — every re-search would spend
    // another token on the same URL. Cache the empty result instead.
    // All list-endpoint callers treat [] as "no data", and analytics
    // already defaults missing entries to [].
    const empty = []
    cacheSet(url, empty, pat) // write-back, non-blocking
    return empty
  }

  if (!res.ok) throw new Error(`HTTP_${res.status}`)

  const data = await res.json()
  cacheSet(url, data, pat) // write-back, non-blocking
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

export async function fetchRateLimit(pat) {
  try {
    const headers = { Accept: 'application/vnd.github.v3+json' }
    if (pat) headers.Authorization = `token ${pat}`
    const res = await fetch('https://api.github.com/rate_limit', { headers })
    const data = await res.json()
    return data.rate
  } catch { return null }
}
