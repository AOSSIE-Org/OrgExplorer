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
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    let isBlocked = false
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = e => {
      const db = e.target.result
      if (db.objectStoreNames) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'k' })
        }
      } else if (db.createObjectStore) {
        db.createObjectStore(STORE, { keyPath: 'k' })
      }
    }
    req.onsuccess = e => {
      if (isBlocked) {
        e.target.result.close()
        return
      }
      resolve(e.target.result)
    }
    req.onerror = () => reject(req.error)
    req.onblocked = () => {
      isBlocked = true
      reject(new Error('IndexedDB blocked'))
    }
  })
}

export async function cacheGet(key) {
  let db
  let closed = false
  const closeDb = () => {
    if (!closed && db) {
      closed = true
      db.close()
    }
  }
  try {
    db = await openDB()
    return await new Promise((resolve, reject) => {
      let val = null
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(normalizeCacheKey(key))
      req.onsuccess = () => {
        const r = req.result
        if (r && Date.now() - r.ts <= TTL_MS) {
          val = r.v
        }
      }
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => {
        closeDb()
        resolve(val)
      }
      tx.onerror = () => {
        closeDb()
        reject(tx.error)
      }
      tx.onabort = () => {
        closeDb()
        reject(tx.error)
      }
    })
  } catch {
    closeDb()
    return null
  }
}

export async function cacheSet(key, value) {
  let db
  let closed = false
  const closeDb = () => {
    if (!closed && db) {
      closed = true
      db.close()
    }
  }
  try {
    db = await openDB()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ k: normalizeCacheKey(key), v: value, ts: Date.now() })
      tx.oncomplete = () => {
        closeDb()
        resolve(true)
      }
      tx.onerror = () => {
        closeDb()
        reject(tx.error)
      }
      tx.onabort = () => {
        closeDb()
        reject(tx.error)
      }
    })
  } catch {
    closeDb()
    return false
  }
}

export async function cacheClear() {
  let db
  let closed = false
  const closeDb = () => {
    if (!closed && db) {
      closed = true
      db.close()
    }
  }
  try {
    db = await openDB()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).clear()
      tx.oncomplete = () => {
        closeDb()
        resolve(true)
      }
      tx.onerror = () => {
        closeDb()
        reject(tx.error)
      }
      tx.onabort = () => {
        closeDb()
        reject(tx.error)
      }
    })
  } catch {
    closeDb()
    return false
  }
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
