/**
 * Persistent cache for the last analysis.
 *
 * The analytical model is expensive to rebuild — it costs dozens of GitHub API
 * calls against a 60 req/hr unauthenticated budget — but it lived only in React
 * state, so every reload discarded it. Storing it in IndexedDB lets a refresh,
 * a bookmark or a shared link restore the analysis with no API calls at all.
 *
 * IndexedDB is used rather than localStorage because a single model can run to
 * several megabytes (239 repositories for an org the size of Vercel), well past
 * the ~5MB localStorage quota.
 *
 * Every operation is best-effort: the cache is an optimisation, so a browser
 * with IndexedDB unavailable or blocked (private windows, storage disabled,
 * jsdom) degrades to the previous behaviour instead of breaking the app.
 */

const DB_NAME = 'orgexplorer'
const DB_VERSION = 1
const STORE = 'analysis'
const KEY = 'latest'

/** Matches the "1HR intelligent cache" the landing page advertises. */
export const CACHE_TTL_MS = 60 * 60 * 1000

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('IndexedDB blocked'))
  })
}

function withStore(mode, run) {
  return openDb().then(db =>
    new Promise((resolve, reject) => {
      let result
      const tx = db.transaction(STORE, mode)
      const req = run(tx.objectStore(STORE))

      if (req) req.onsuccess = () => { result = req.result }
      tx.oncomplete = () => { db.close(); resolve(result) }
      tx.onerror = () => { db.close(); reject(tx.error) }
      tx.onabort = () => { db.close(); reject(tx.error) }
    })
  )
}

/** Persist the current analysis. Never throws. */
export async function saveAnalysis(payload) {
  try {
    await withStore('readwrite', store => store.put({ ...payload, savedAt: Date.now() }, KEY))
  } catch {
    // Best effort — a full or unavailable store must not break analysis.
  }
}

/** Return the cached analysis, or null when absent, stale or unreadable. */
export async function loadAnalysis() {
  try {
    const record = await withStore('readonly', store => store.get(KEY))

    if (!record?.model) return null

    if (Date.now() - record.savedAt > CACHE_TTL_MS) {
      await clearAnalysis()
      return null
    }

    return record
  } catch {
    return null
  }
}

/** Drop the cached analysis. Never throws. */
export async function clearAnalysis() {
  try {
    await withStore('readwrite', store => store.delete(KEY))
  } catch {
    // Best effort.
  }
}
