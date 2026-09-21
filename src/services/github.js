// IndexedDB Cache (L2) 
const DB_NAME = 'orgexplorer_cache'
const STORE = 'cache'
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

  // GitHub answers 204 No Content for some endpoints (e.g. /contributors on a
  // repo with no commits). res.json() throws on an empty body, so read the text
  // first and let callers deal with a null payload.
  const text = await res.text()
  if (!text) return null

  let data
  try {
    data = JSON.parse(text)
  } catch {
    // A truncated or non-JSON body (a proxy error page, a cut-off response)
    // should not reject and discard pages already collected.
    return null
  }

  cacheSet(url, data) // write-back, non-blocking
  return data
}

/**
 * Walks GitHub's page-based pagination, collecting every item until a short
 * page arrives or maxPages is reached.
 *
 * A page that is not an array (204 No Content, an error envelope such as
 * `{ message: 'Moved Permanently' }`, or a malformed body) ends the walk and
 * whatever was collected so far is returned, rather than throwing and losing
 * the earlier pages.
 */
async function fetchPaginated(buildUrl, maxPages, pat) {
  const all = []

  for (let page = 1; page <= maxPages; page++) {
    const data = await fetchWithCache(buildUrl(page), pat)
    if (!Array.isArray(data)) break

    all.push(...data)
    if (data.length < 100) break
  }

  return all
}

// Public service functions
export const fetchOrg = (org, pat) =>
  fetchWithCache(`https://api.github.com/orgs/${org}`, pat)

export async function fetchRepos(org, repoCount, pat) {
  return fetchPaginated(
    page => `https://api.github.com/orgs/${org}/repos?per_page=100&page=${page}&sort=updated`,
    pat ? Math.ceil(repoCount / 100) : 5,
    pat
  )
}

export async function fetchContributors(org, repo, pat) {
  return fetchPaginated(
    page => `https://api.github.com/repos/${org}/${repo}/contributors?per_page=100&page=${page}`,
    pat ? 10 : 1,
    pat
  )
}

export async function fetchIssues(org, repo, pat) {
  return fetchPaginated(
    page => `https://api.github.com/repos/${org}/${repo}/issues?state=all&per_page=100&page=${page}`,
    pat ? 10 : 1,
    pat
  )
}

export async function fetchPulls(org, repo, pat) {
  return fetchPaginated(
    page => `https://api.github.com/repos/${org}/${repo}/pulls?state=all&per_page=100&page=${page}`,
    pat ? 10 : 1,
    pat
  )
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
