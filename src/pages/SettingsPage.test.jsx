import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsPage from './SettingsPage'

const { cacheClear, mockSavePat, mockRefreshRateLimit, appState } = vi.hoisted(() => ({
  cacheClear: vi.fn(),
  mockSavePat: vi.fn(),
  mockRefreshRateLimit: vi.fn(),
  appState: {
    pat: '',
    rateLimit: null,
  },
}))

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    pat: appState.pat,
    savePat: mockSavePat,
    rateLimit: appState.rateLimit,
    refreshRateLimit: mockRefreshRateLimit,
  }),
}))

vi.mock('../services/github', () => ({ cacheClear }))

const { clearAnalysis } = vi.hoisted(() => ({ clearAnalysis: vi.fn() }))
vi.mock('../services/cache', () => ({ clearAnalysis }))

describe('SettingsPage', () => {
  beforeEach(() => {
    cacheClear.mockReset()
    clearAnalysis.mockReset()
    mockRefreshRateLimit.mockReset()
    mockSavePat.mockReset()
    appState.rateLimit = null
    // #267 added a window.confirm guard to handleClear; auto-confirm it in tests
    // so the clear flow proceeds. (jsdom's window.confirm returns false by default.)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
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

  it('does not keep showing "Cleared" from a prior success once a later clear fails', async () => {
    cacheClear.mockResolvedValue(true)
    clearAnalysis.mockResolvedValue(true)

    render(<SettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: /clear all/i }))
    expect(await screen.findByRole('button', { name: /cleared/i })).toBeInTheDocument()

    clearAnalysis.mockResolvedValue(false)

    await userEvent.click(screen.getByRole('button', { name: /cleared/i }))

    expect(screen.queryByRole('button', { name: /cleared/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
  })

  it('does not clear anything when the user cancels the confirmation', async () => {
    cacheClear.mockResolvedValue(true)
    clearAnalysis.mockResolvedValue(true)
    window.confirm.mockReturnValue(false) // user declines

    render(<SettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: /clear all/i }))

    expect(cacheClear).not.toHaveBeenCalled()
    expect(clearAnalysis).not.toHaveBeenCalled()
  })

  it('calls refreshRateLimit when the API Quota refresh button is clicked', async () => {
    mockRefreshRateLimit.mockResolvedValue(true)

    render(<SettingsPage />)

    const refreshBtn = screen.getByRole('button', { name: /refresh api quota/i })
    await userEvent.click(refreshBtn)

    expect(mockRefreshRateLimit).toHaveBeenCalledTimes(1)
  })

  it('displays rateLimit info when available and allows refreshing quota', async () => {
    appState.rateLimit = {
      limit: 5000,
      remaining: 4850,
      used: 150,
      reset: Math.floor(Date.now() / 1000) + 3600,
    }
    mockRefreshRateLimit.mockResolvedValue(true)

    render(<SettingsPage />)

    expect(screen.getByText('4,850')).toBeInTheDocument()
    expect(screen.getByText('/ 5,000')).toBeInTheDocument()

    const refreshBtn = screen.getByRole('button', { name: /refresh api quota/i })
    await userEvent.click(refreshBtn)

    expect(mockRefreshRateLimit).toHaveBeenCalledTimes(1)
    appState.rateLimit = null
  })

  it('triggers refreshRateLimit when a valid PAT is saved', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    })

    render(<SettingsPage />)

    const input = screen.getByPlaceholderText(/ghp_/i)
    await userEvent.type(input, 'ghp_newtoken123')

    const saveBtn = screen.getByRole('button', { name: /save/i })
    await userEvent.click(saveBtn)

    expect(mockSavePat).toHaveBeenCalledWith('ghp_newtoken123')
    expect(mockRefreshRateLimit).toHaveBeenCalledWith('ghp_newtoken123')
  })

  it('triggers refreshRateLimit("") when PAT is deleted', async () => {
    appState.pat = 'ghp_existingtoken'

    render(<SettingsPage />)

    const deleteBtn = screen.getByRole('button', { name: /delete/i })
    await userEvent.click(deleteBtn)

    expect(mockSavePat).toHaveBeenCalledWith('')
    expect(mockRefreshRateLimit).toHaveBeenCalledWith('')
    appState.pat = ''
  })
})
