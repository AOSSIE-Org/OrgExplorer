import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { AppProvider, useApp } from './AppContext'
import * as github from '../services/github'

vi.mock('../services/cache', () => ({
  loadAnalysis: vi.fn().mockResolvedValue(null),
  saveAnalysis: vi.fn().mockResolvedValue(true),
}))

vi.mock('../services/github', () => ({
  fetchOrg: vi.fn(),
  fetchRepos: vi.fn(),
  fetchContributors: vi.fn(),
  fetchIssues: vi.fn(),
  fetchRateLimit: vi.fn(),
  fetchPulls: vi.fn(),
  validatePat: vi.fn(),
}))

let latestSavePat

function SavePatCapture() {
  const { pat, savePat } = useApp()
  latestSavePat = savePat
  return <span data-testid="pat">{pat}</span>
}

function renderProvider() {
  render(
    <AppProvider>
      <SavePatCapture />
    </AppProvider>
  )
}

describe('AppContext savePat validation gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('persists a token only after GitHub confirms it is valid', async () => {
    github.validatePat.mockResolvedValue({
      valid: true,
      rate: { limit: 5000, remaining: 4999, reset: 1700000000 },
    })

    renderProvider()

    let result
    await act(async () => {
      result = await latestSavePat('ghp_validToken123')
    })

    expect(result.valid).toBe(true)
    expect(github.validatePat).toHaveBeenCalledWith('ghp_validToken123')
    expect(localStorage.getItem('oe_pat')).toBe('ghp_validToken123')
    expect(JSON.parse(localStorage.getItem('oe_rate_limit'))).toEqual({
      limit: 5000,
      remaining: 4999,
      reset: 1700000000,
    })
    expect(screen.getByTestId('pat').textContent).toBe('ghp_validToken123')
    // validatePat already hits /rate_limit, so no second quota request is made
    expect(github.fetchRateLimit).not.toHaveBeenCalled()
  })

  it('rejects an invalid token without touching state or storage', async () => {
    github.validatePat.mockResolvedValue({
      valid: false,
      error: 'Invalid or expired GitHub token',
    })

    renderProvider()

    let result
    await act(async () => {
      result = await latestSavePat('ghp_badToken')
    })

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invalid or expired GitHub token')
    expect(localStorage.getItem('oe_pat')).toBe(null)
    expect(localStorage.getItem('oe_rate_limit')).toBe(null)
    expect(screen.getByTestId('pat').textContent).toBe('')
  })

  it('clears a stored token immediately without validating on delete', async () => {
    localStorage.setItem('oe_pat', 'ghp_existingToken')
    localStorage.setItem('oe_rate_limit', JSON.stringify({ limit: 5000, remaining: 10, reset: 1700000000 }))

    renderProvider()

    let result
    await act(async () => {
      result = await latestSavePat('')
    })

    expect(result.valid).toBe(true)
    expect(github.validatePat).not.toHaveBeenCalled()
    expect(localStorage.getItem('oe_pat')).toBe(null)
    expect(localStorage.getItem('oe_rate_limit')).toBe(null)
    expect(screen.getByTestId('pat').textContent).toBe('')
  })

  it('does not restore the token when a delete supersedes an in-flight save', async () => {
    let resolveValidation
    github.validatePat.mockImplementation(
      () => new Promise((resolve) => { resolveValidation = resolve })
    )

    renderProvider()

    let savePromise
    act(() => {
      savePromise = latestSavePat('ghp_newToken123')
    })

    // Delete the stored token while the save is still validating
    let deletePromise
    act(() => {
      deletePromise = latestSavePat('')
    })

    expect(localStorage.getItem('oe_pat')).toBe(null)

    // Validation then succeeds, but the delete already superseded it —
    // the token must not be persisted.
    await act(async () => {
      resolveValidation({ valid: true, rate: { limit: 5000, remaining: 5000, reset: 1700000000 } })
      await Promise.all([savePromise, deletePromise])
    })

    expect(localStorage.getItem('oe_pat')).toBe(null)
    expect(localStorage.getItem('oe_rate_limit')).toBe(null)
    expect(screen.getByTestId('pat').textContent).toBe('')
  })

  it('drops an older save when a newer one supersedes it mid-validation', async () => {
    const resolvers = []
    github.validatePat.mockImplementation(
      () => new Promise((resolve) => resolvers.push(resolve))
    )

    renderProvider()

    let firstSave
    act(() => {
      firstSave = latestSavePat('ghp_firstToken')
    })

    let secondSave
    await act(async () => {
      secondSave = latestSavePat('ghp_secondToken')
    })

    // Both validations complete: only the newest save may persist
    await act(async () => {
      resolvers[0]({ valid: true, rate: { limit: 5000 } })
      resolvers[1]({ valid: true, rate: { limit: 5000 } })
      await Promise.all([firstSave, secondSave])
    })

    expect(localStorage.getItem('oe_pat')).toBe('ghp_secondToken')
    expect(screen.getByTestId('pat').textContent).toBe('ghp_secondToken')
  })
})
