import { computeHealthScore } from './analytics'

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

  if (res.status === 403) {
    const remaining = res.headers.get('x-ratelimit-remaining')
    const retryAfter = res.headers.get('retry-after')
    if ((remaining !== null && Number(remaining) === 0) || retryAfter) {
      throw new Error('RATE_LIMIT')
    }
    throw new Error('FORBIDDEN')
  }
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

export async function fetchRateLimit(pat) {
  try {
    const headers = { Accept: 'application/vnd.github.v3+json' }
    if (pat) headers.Authorization = `token ${pat}`
    const res = await fetch('https://api.github.com/rate_limit', { headers })
    const data = await res.json()
    return data.rate
  } catch { return null }
}

export async function cacheDelete(key) {
  try {
    const db = await openDB()
    return new Promise(res => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(key)
      tx.oncomplete = () => res(true)
      tx.onerror = () => res(false)
    })
  } catch { return false }
}

function getPatHash(pat) {
  if (!pat) return 'unauthenticated'
  let hash = 0
  for (let i = 0; i < pat.length; i++) {
    hash = (hash << 5) - hash + pat.charCodeAt(i)
    hash |= 0
  }
  return String(hash)
}

async function fetchAuthenticatedWithCache(url, pat) {
  const cacheKey = `${url}|${getPatHash(pat)}`
  const cached = await cacheGet(cacheKey)
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

  if (res.status === 403) {
    const remaining = res.headers.get('x-ratelimit-remaining')
    const retryAfter = res.headers.get('retry-after')
    if ((remaining !== null && Number(remaining) === 0) || retryAfter) {
      throw new Error('RATE_LIMIT')
    }
    throw new Error('FORBIDDEN')
  }
  if (res.status === 404) throw new Error('NOT_FOUND')
  if (!res.ok) throw new Error(`HTTP_${res.status}`)

  const data = await res.json()
  cacheSet(cacheKey, data)
  return data
}

async function fetchAuthenticatedPaginated(baseUrl, pat) {
  const all = []
  let page = 1
  while (true) {
    const separator = baseUrl.includes('?') ? '&' : '?'
    const url = `${baseUrl}${separator}per_page=100&page=${page}`
    const data = await fetchAuthenticatedWithCache(url, pat)
    if (!Array.isArray(data)) {
      return data
    }
    all.push(...data)
    if (data.length < 100) break
    page++
  }
  return all
}

export const fetchOrgTeams = (org, pat) =>
  fetchAuthenticatedPaginated(`https://api.github.com/orgs/${org}/teams`, pat)

export const fetchTeamMembers = (org, teamSlug, pat) =>
  fetchAuthenticatedPaginated(`https://api.github.com/orgs/${org}/teams/${teamSlug}/members`, pat)

export async function fetchTeamRepos(org, teamSlug, pat) {
  const data = await fetchAuthenticatedPaginated(`https://api.github.com/orgs/${org}/teams/${teamSlug}/repos`, pat)
  if (Array.isArray(data)) {
    return data.map(repo => ({
      ...repo,
      healthScore: computeHealthScore(repo, 0)
    }))
  }
  return data
}

export async function updateTeamMembership(org, teamSlug, username, pat, role = 'member') {
  if (!pat) throw new Error('Authentication (PAT) required to manage team memberships.')
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `token ${pat}`,
    'Content-Type': 'application/json'
  }
  const res = await fetch(`https://api.github.com/orgs/${org}/teams/${teamSlug}/memberships/${username}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ role })
  })
  if (res.status === 403) throw new Error('Permission denied. Admin/Write access required.')
  if (!res.ok) throw new Error(`Failed to update membership (HTTP ${res.status})`)

  const cacheKey = `https://api.github.com/orgs/${org}/teams/${teamSlug}/members|${getPatHash(pat)}`
  await cacheDelete(cacheKey)

  return true
}
