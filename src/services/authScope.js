// Partition cached data by the authentication context that produced it.

export const ANONYMOUS_SCOPE = 'anon'

const scopeCache = new Map()

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('')
}

async function fingerprintPat(pat) {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) return null

  try {
    const digest = await subtle.digest('SHA-256', new TextEncoder().encode(pat))
    return `pat:${toHex(digest)}`
  } catch {
    return null
  }
}

/**
 * Return a stable cache namespace for a PAT without exposing the token itself.
 * A null result means authenticated data must not be cached.
 */
export function getAuthScope(pat) {
  const token = typeof pat === 'string' ? pat.trim() : ''
  if (!token) return Promise.resolve(ANONYMOUS_SCOPE)

  let promise = scopeCache.get(token)
  if (!promise) {
    if (scopeCache.size > 20) scopeCache.clear()
    promise = fingerprintPat(token)
    scopeCache.set(token, promise)
  }
  return promise
}

/** Reset the scope cache (useful for tests or teardown). */
export function resetScopeCache() {
  scopeCache.clear()
}
