// IndexedDB Cache (L2) 
const DB_NAME = 'orgexplorer_cache'
const STORE = 'cache'
export const TTL_MS = 3_600_000 // 1 hour

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE, { keyPath: 'k' })
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = () => reject(req.error)
  })
}

export async function cacheGetEntry(key) {
  try {
    const db = await openDB()
    return new Promise(res => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
      req.onsuccess = () => res(req.result || null)
      req.onerror = () => res(null)
    })
  } catch { return null }
}

export async function cacheGet(key) {
  const entry = await cacheGetEntry(key)
  if (!entry || Date.now() - entry.ts > TTL_MS) return null
  return entry.v
}

export async function cacheSet(key, value, etag = null) {
  try {
    const db = await openDB()
    return new Promise(res => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ k: key, v: value, ts: Date.now(), etag })
      tx.oncomplete = () => res(true)
      tx.onerror = () => res(false)
    })
  } catch { return false }
}

export async function cacheTouch(key, etag = null) {
  try {
    const db = await openDB()
    return new Promise(res => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      const getReq = store.get(key)
      getReq.onsuccess = () => {
        const record = getReq.result
        if (record) {
          record.ts = Date.now()
          if (etag) record.etag = etag
          store.put(record)
        }
      }
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

// Request Throttling / Concurrency Limiter
const MAX_CONCURRENT_REQUESTS = 6
let activeRequests = 0
const requestQueue = []

function enqueueRequest(task) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ task, resolve, reject })
    dequeue()
  })
}

function dequeue() {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) {
    return
  }
  const { task, resolve, reject } = requestQueue.shift()
  activeRequests++
  task()
    .then(resolve, reject)
    .finally(() => {
      activeRequests--
      dequeue()
    })
}

function dispatchRateLimit(headers) {
  if (typeof window === 'undefined' || !headers) return
  const limit = headers.get('x-ratelimit-limit')
  if (limit !== null) {
    window.dispatchEvent(
      new CustomEvent('rate-limit-update', {
        detail: {
          limit: Number(headers.get('x-ratelimit-limit')),
          remaining: Number(headers.get('x-ratelimit-remaining')),
          used: Number(headers.get('x-ratelimit-used')),
          reset: Number(headers.get('x-ratelimit-reset'))
        }
      })
    )
  }
}

// Core fetchWithCache 
export async function fetchWithCache(url, pat) {
  // L2 check
  const entry = await cacheGetEntry(url)
  if (entry && (Date.now() - entry.ts <= TTL_MS)) {
    return entry.v
  }

  return enqueueRequest(async () => {
    const headers = { Accept: 'application/vnd.github.v3+json' }
    if (pat) headers.Authorization = `token ${pat}`
    if (entry?.etag) headers['If-None-Match'] = entry.etag

    const res = await fetch(url, { headers })
    dispatchRateLimit(res.headers)

    if (res.status === 304 && entry) {
      const newEtag = res.headers.get('etag') || entry.etag
      cacheTouch(url, newEtag)
      return entry.v
    }

    if (res.status === 403) throw new Error('RATE_LIMIT')
    if (res.status === 404) throw new Error('NOT_FOUND')
    if (!res.ok) throw new Error(`HTTP_${res.status}`)

    const data = await res.json()
    const etag = res.headers.get('etag')
    cacheSet(url, data, etag) // write-back, non-blocking
    return data
  })
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
    dispatchRateLimit(res.headers)
    const data = await res.json()
    return data.rate
  } catch { return null }
}
