// IndexedDB Cache (L2)
const DB_NAME = 'orgexplorer_cache'
const STORE = 'cache'
const TTL_MS = 3_600_000 // 1 hour

const GITHUB_API_VERSION = '2022-11-28'

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise

  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('INDEXEDDB_UNAVAILABLE'))
  }

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)

    req.onupgradeneeded = e => {
      const db = e.target.result

      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'k' })
      }
    }

    req.onsuccess = e => {
      const db = e.target.result

      // Close old connection if a newer DB version is opened elsewhere.
      db.onversionchange = () => db.close()

      resolve(db)
    }

    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }

    req.onblocked = () => {
      dbPromise = null
      reject(new Error('INDEXEDDB_BLOCKED'))
    }
  })

  return dbPromise
}

async function cacheDelete(key) {
  try {
    const db = await openDB()

    return new Promise(res => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(key)

      tx.oncomplete = () => res(true)
      tx.onerror = () => res(false)
    })
  } catch {
    return false
  }
}

export async function cacheGet(key) {
  try {
    const db = await openDB()

    return new Promise(res => {
      const req = db.transaction(STORE, 'readonly')
        .objectStore(STORE)
        .get(key)

      req.onsuccess = () => {
        const record = req.result

        if (!record) return res(null)

        const expired = Date.now() - record.ts > TTL_MS

        if (expired) {
          // Non-blocking cleanup of expired cache record.
          void cacheDelete(key)
          return res(null)
        }

        res(record.v)
      }

      req.onerror = () => res(null)
    })
  } catch {
    return null
  }
}

export async function cacheSet(key, value) {
  try {
    const db = await openDB()

    return new Promise(res => {
      const tx = db.transaction(STORE, 'readwrite')

      tx.objectStore(STORE).put({
        k: key,
        v: value,
        ts: Date.now()
      })

      tx.oncomplete = () => res(true)
      tx.onerror = () => res(false)
    })
  } catch {
    return false
  }
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
  } catch {
    return false
  }
}

// Small non-crypto fallback hash.
// Used only when crypto.subtle is unavailable.
function fallbackHash(value) {
  let hash = 2166136261

  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}

async function tokenFingerprint(pat) {
  if (!pat) return 'anon'

  try {
    if (globalThis.crypto?.subtle) {
      const encoded = new TextEncoder().encode(pat)
      const buffer = await crypto.subtle.digest('SHA-256', encoded)

      return [...new Uint8Array(buffer)]
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 16)
    }
  } catch {
    // Fall through to fallback hash.
  }

  return fallbackHash(pat)
}

async function makeCacheKey(url, pat) {
  const authKey = pat ? `auth:${await tokenFingerprint(pat)}` : 'anon'
  return `${authKey}:${url}`
}

function githubHeaders(pat) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': GITHUB_API_VERSION
  }

  if (pat) {
    headers.Authorization = `Bearer ${pat}`
  }

  return headers
}

function numberHeader(headers, name) {
  const value = headers.get(name)
  return value === null ? null : Number(value)
}

function emitRateLimitUpdate(res) {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent('rate-limit-update', {
      detail: {
        limit: numberHeader(res.headers, 'x-ratelimit-limit'),
        remaining: numberHeader(res.headers, 'x-ratelimit-remaining'),
        used: numberHeader(res.headers, 'x-ratelimit-used'),
        reset: numberHeader(res.headers, 'x-ratelimit-reset')
      }
    })
  )
}

async function readJsonSafe(res) {
  try {
    const text = await res.text()
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}

function createGithubError(message, res, body = null) {
  const error = new Error(message)

  error.status = res.status
  error.body = body
  error.rateLimit = {
    limit: numberHeader(res.headers, 'x-ratelimit-limit'),
    remaining: numberHeader(res.headers, 'x-ratelimit-remaining'),
    used: numberHeader(res.headers, 'x-ratelimit-used'),
    reset: numberHeader(res.headers, 'x-ratelimit-reset')
  }

  return error
}

// Core fetchWithCache
async function fetchWithCache(url, pat, options = {}) {
  const cacheKey = await makeCacheKey(url, pat)

  // L2 cache check
  const cached = await cacheGet(cacheKey)
  if (cached !== null) return cached

  const res = await fetch(url, {
    headers: githubHeaders(pat),
    signal: options.signal
  })

  emitRateLimitUpdate(res)

  const data = await readJsonSafe(res)

  if (res.status === 401) {
    throw createGithubError('UNAUTHORIZED', res, data)
  }

  if (res.status === 404) {
    throw createGithubError('NOT_FOUND', res, data)
  }

  if (res.status === 403 || res.status === 429) {
    const remaining = numberHeader(res.headers, 'x-ratelimit-remaining')
    const message = String(data?.message || '').toLowerCase()

    if (
      remaining === 0 ||
      message.includes('rate limit') ||
      message.includes('secondary rate limit') ||
      message.includes('abuse detection')
    ) {
      throw createGithubError('RATE_LIMIT', res, data)
    }

    throw createGithubError('FORBIDDEN', res, data)
  }

  if (!res.ok) {
    throw createGithubError(data?.message || `HTTP_${res.status}`, res, data)
  }

  // Write-back cache, non-blocking
  void cacheSet(cacheKey, data)

  return data
}

// Public service functions
export const fetchOrg = (org, pat, options = {}) =>
  fetchWithCache(`https://api.github.com/orgs/${org}`, pat, options)

export async function fetchRepos(org, repoCount, pat, options = {}) {
  const all = []

  const hasRepoCount = Number.isFinite(repoCount)
  const maxPages = pat
    ? hasRepoCount
      ? Math.ceil(repoCount / 100)
      : Infinity
    : 5

  for (let page = 1; page <= maxPages; page++) {
    const url = `https://api.github.com/orgs/${org}/repos?per_page=100&page=${page}&sort=updated`
    const data = await fetchWithCache(url, pat, options)

    if (!Array.isArray(data)) break

    all.push(...data)

    if (data.length < 100) break
  }

  return all
}

export async function fetchContributors(org, repo, pat, options = {}) {
  const all = []

  for (let page = 1; ; page++) {
    const url = `https://api.github.com/repos/${org}/${repo}/contributors?per_page=100&page=${page}`
    const data = await fetchWithCache(url, pat, options)

    if (!Array.isArray(data)) break

    all.push(...data)

    if (data.length < 100) break
  }

  return all
}

export async function fetchIssues(org, repo, pat, options = {}) {
  const {
    includePullRequests = false,
    signal
  } = options

  const all = []

  for (let page = 1; ; page++) {
    const url = `https://api.github.com/repos/${org}/${repo}/issues?state=all&per_page=100&page=${page}`
    const data = await fetchWithCache(url, pat, { signal })

    if (!Array.isArray(data)) break

    all.push(...data)

    if (data.length < 100) break
  }

  // GitHub's issues endpoint also returns pull requests.
  // By default, keep only real issues.
  return includePullRequests
    ? all
    : all.filter(issue => !issue.pull_request)
}

export async function fetchRateLimit(pat, options = {}) {
  try {
    const res = await fetch('https://api.github.com/rate_limit', {
      headers: githubHeaders(pat),
      signal: options.signal
    })

    emitRateLimitUpdate(res)

    if (!res.ok) return null

    const data = await readJsonSafe(res)

    return data?.rate || null
  } catch {
    return null
  }
}
