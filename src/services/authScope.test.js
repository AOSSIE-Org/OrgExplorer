import { describe, it, expect, vi, afterEach } from 'vitest'
import { ANONYMOUS_SCOPE, getAuthScope, resetScopeCache } from './authScope'

describe('getAuthScope', () => {
  afterEach(() => {
    resetScopeCache()
  })

  it('uses a shared anonymous namespace when no PAT is present', async () => {
    await expect(getAuthScope('')).resolves.toBe(ANONYMOUS_SCOPE)
    await expect(getAuthScope(undefined)).resolves.toBe(ANONYMOUS_SCOPE)
    await expect(getAuthScope('   ')).resolves.toBe(ANONYMOUS_SCOPE)
    await expect(getAuthScope(null)).resolves.toBe(ANONYMOUS_SCOPE)
  })

  it('returns a stable fingerprint without exposing the PAT', async () => {
    const token = 'ghp_very_secret_token'
    const first = await getAuthScope(token)
    const second = await getAuthScope(token)

    expect(first).toMatch(/^pat:[a-f0-9]{64}$/)
    expect(second).toBe(first)
    expect(first).not.toContain(token)
  })

  it('normalizes tokens with surrounding whitespace', async () => {
    const token = 'ghp_trimmed_token'
    const trimmed = await getAuthScope(token)
    const withWhitespace = await getAuthScope(`  ${token}  `)

    expect(withWhitespace).toBe(trimmed)
  })

  it('separates different PATs', async () => {
    const first = await getAuthScope('ghp_token_a')
    const second = await getAuthScope('ghp_token_b')

    expect(first).not.toBe(second)
  })

  it('returns null when Web Crypto subtle is unavailable', async () => {
    const originalCrypto = globalThis.crypto
    try {
      Object.defineProperty(globalThis, 'crypto', {
        value: { ...originalCrypto, subtle: undefined },
        configurable: true,
      })
      resetScopeCache()
      await expect(getAuthScope('ghp_token_no_crypto')).resolves.toBeNull()
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        configurable: true,
      })
      resetScopeCache()
    }
  })
})
