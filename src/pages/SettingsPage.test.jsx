import { describe, it, expect, vi } from 'vitest'
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
  it('clears both the raw-response cache and the persisted analysis cache on Clear All', async () => {
    render(<SettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: /clear all/i }))

    expect(cacheClear).toHaveBeenCalledTimes(1)
    expect(clearAnalysis).toHaveBeenCalledTimes(1)
  })
})
