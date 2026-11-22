import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsPage from './SettingsPage'

const { savePat, mockState } = vi.hoisted(() => ({
  savePat: vi.fn(),
  mockState: { pat: '' },
}))

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    pat: mockState.pat,
    savePat,
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
    savePat.mockReset()
    mockState.pat = ''
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

  it('shows the validation error returned by savePat for an invalid token', async () => {
    savePat.mockResolvedValue({ valid: false, error: 'Invalid or expired GitHub token' })

    render(<SettingsPage />)

    await userEvent.type(screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxx'), 'ghp_badToken')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(savePat).toHaveBeenCalledWith('ghp_badToken')
    expect(await screen.findByText('Invalid or expired GitHub token')).toBeInTheDocument()
  })

  it('shows no error and stops validating when savePat accepts the token', async () => {
    savePat.mockResolvedValue({ valid: true })

    render(<SettingsPage />)

    await userEvent.type(screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxx'), 'ghp_goodToken')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.queryByText(/invalid or expired/i)).not.toBeInTheDocument()
    })

    expect(savePat).toHaveBeenCalledWith('ghp_goodToken')
    expect(screen.getByRole('button', { name: /save/i })).toBeEnabled()
  })

  it('delete clears the token through savePat without confirming twice', async () => {
    mockState.pat = 'ghp_existingToken'
    savePat.mockResolvedValue({ valid: true })

    render(<SettingsPage />)

    await userEvent.type(screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxx'), 'ghp_someToken')
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))

    expect(savePat).toHaveBeenCalledWith('')
    expect(screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxx')).toHaveValue('')
  })
})
