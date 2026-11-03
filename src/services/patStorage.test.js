import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  PAT_STORAGE_KEY,
  savePat,
  loadPat,
  clearPat
} from './patStorage'

const DB_NAME = 'orgexplorer_secure'
const TOKEN = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789'

function deleteDb() {
  return new Promise(resolve => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}

function tamper(envelope) {
  const [version, iv, data] = envelope.split(':')
  const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0))
  bytes[0] ^= 0xff
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `${version}:${iv}:${btoa(binary)}`
}

beforeEach(async () => {
  localStorage.clear()
  await deleteDb()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('encrypted PAT storage', () => {
  it('round-trips a token through encryption', async () => {
    const result = await savePat(TOKEN)
    expect(result.persisted).toBe(true)

    const stored = localStorage.getItem(PAT_STORAGE_KEY)
    expect(stored).toMatch(/^v1:/)
    expect(stored).not.toContain(TOKEN)
    expect(stored).not.toContain('ghp_')

    await expect(loadPat()).resolves.toEqual({ token: TOKEN, status: 'ok' })
  })

  it('uses a fresh IV on every save', async () => {
    await savePat(TOKEN)
    const first = localStorage.getItem(PAT_STORAGE_KEY)

    await savePat(TOKEN)
    const second = localStorage.getItem(PAT_STORAGE_KEY)

    expect(second).not.toBe(first)
    await expect(loadPat()).resolves.toEqual({ token: TOKEN, status: 'ok' })
  })

  it('does not leave a stale token when storing a replacement fails', async () => {
    await savePat(TOKEN)

    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => { throw new Error('quota exceeded') })

    try {
      await expect(savePat('ghp_replacement')).resolves.toEqual({
        persisted: false,
        reason: 'unavailable'
      })
      expect(localStorage.getItem(PAT_STORAGE_KEY)).toBeNull()
    } finally {
      setItem.mockRestore()
    }
  })

  it('removes both ciphertext and key on clear', async () => {
    await savePat(TOKEN)
    const ciphertext = localStorage.getItem(PAT_STORAGE_KEY)

    await clearPat()
    expect(localStorage.getItem(PAT_STORAGE_KEY)).toBeNull()
    await expect(loadPat()).resolves.toEqual({ token: '', status: 'empty' })

    // Restoring the old ciphertext without the key must fail closed: the
    // encryption key is gone, so the value is unrecoverable.
    localStorage.setItem(PAT_STORAGE_KEY, ciphertext)
    await expect(loadPat()).resolves.toEqual({ token: '', status: 'corrupt' })
    expect(localStorage.getItem(PAT_STORAGE_KEY)).toBeNull()
  })

  it('rejects tampered ciphertext and wipes it', async () => {
    await savePat(TOKEN)
    const stored = localStorage.getItem(PAT_STORAGE_KEY)
    localStorage.setItem(PAT_STORAGE_KEY, tamper(stored))

    await expect(loadPat()).resolves.toEqual({ token: '', status: 'corrupt' })
    expect(localStorage.getItem(PAT_STORAGE_KEY)).toBeNull()
  })

  it('migrates legacy plaintext and removes the plaintext value', async () => {
    localStorage.setItem(PAT_STORAGE_KEY, TOKEN)

    await expect(loadPat()).resolves.toEqual({ token: TOKEN, status: 'ok' })

    const stored = localStorage.getItem(PAT_STORAGE_KEY)
    expect(stored).toMatch(/^v1:/)
    expect(stored).not.toContain(TOKEN)
  })

  it('does not persist anything when WebCrypto is unavailable', async () => {
    vi.stubGlobal('crypto', { getRandomValues: () => new Uint8Array(12) })

    await expect(savePat(TOKEN)).resolves.toEqual({
      persisted: false,
      reason: 'unavailable'
    })
    expect(localStorage.getItem(PAT_STORAGE_KEY)).toBeNull()
  })

  it('drops legacy plaintext when it cannot be encrypted', async () => {
    vi.stubGlobal('crypto', { getRandomValues: () => new Uint8Array(12) })
    localStorage.setItem(PAT_STORAGE_KEY, TOKEN)

    await expect(loadPat()).resolves.toEqual({
      token: TOKEN,
      status: 'unavailable'
    })
    expect(localStorage.getItem(PAT_STORAGE_KEY)).toBeNull()
  })

  it('keeps ciphertext when IndexedDB is temporarily unavailable', async () => {
    await savePat(TOKEN)
    const stored = localStorage.getItem(PAT_STORAGE_KEY)

    vi.stubGlobal('indexedDB', undefined)

    await expect(loadPat()).resolves.toEqual({
      token: '',
      status: 'unavailable'
    })
    expect(localStorage.getItem(PAT_STORAGE_KEY)).toBe(stored)
  })

  it('treats malformed envelopes as corrupt', async () => {
    localStorage.setItem(PAT_STORAGE_KEY, 'v1:only-two-parts')

    await expect(loadPat()).resolves.toEqual({ token: '', status: 'corrupt' })
    expect(localStorage.getItem(PAT_STORAGE_KEY)).toBeNull()
  })
})
