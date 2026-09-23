import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsPage from './SettingsPage'

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    pat: '',
    savePat: vi.fn(),
    rateLimit: null,
    refreshRateLimit: vi.fn(),
  }),
}))

const { cacheClear } = vi.hoisted(() => ({ cacheClear: vi.fn() }))
vi.mock('../services/github', () => ({ cacheClear }))

const { clearAnalysis } = vi.hoisted(() => ({ clearAnalysis: vi.fn() }))
vi.mock('../services/cache', () => ({ clearAnalysis }))

describe('SettingsPage', () => {
  beforeEach(() => {
    cacheClear.mockReset()
    clearAnalysis.mockReset()
  })

  it('clears both the raw-response cache and the persisted analysis cache on Clear All', async () => {
    cacheClear.mockResolvedValue(true)
    clearAnalysis.mockResolvedValue(true)

    render(<SettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: /clear all/i }))

    expect(cacheClear).toHaveBeenCalledTimes(1)
    expect(clearAnalysis).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('button', { name: /cleared/i })).toBeInTheDocument()
  })

  it('does not report success when the analysis cache fails to clear', async () => {
    cacheClear.mockResolvedValue(true)
    clearAnalysis.mockResolvedValue(false)

    render(<SettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: /clear all/i }))

    expect(screen.queryByRole('button', { name: /cleared/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
  })
})
