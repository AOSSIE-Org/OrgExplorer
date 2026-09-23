import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import RepoHealthDrawer from './RepoHealthDrawer'

const sampleRepo = {
  name: 'OrgExplorer',
  orgLogin: 'AOSSIE-Org',
  healthScore: 61,
  pushed_at: new Date(Date.now() - 5 * 86_400_000).toISOString(),
  created_at: '2024-01-01T00:00:00Z',
  stargazers_count: 150,
  forks_count: 45,
  open_issues_count: 12,
  language: 'JavaScript',
  default_branch: 'main',
  html_url: 'https://github.com/AOSSIE-Org/OrgExplorer',
  license: { name: 'MIT License', spdx_id: 'MIT' },
  activityClassification: 'Thriving',
  contributors: [
    { login: 'contributor1', contributions: 20 },
    { login: 'contributor2', contributions: 15 },
    { login: 'contributor3', contributions: 10 },
  ],
  busFactor: { factor: 2, risk: 'high' },
}

describe('RepoHealthDrawer', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <RepoHealthDrawer repo={sampleRepo} isOpen={false} onClose={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders modal dialog with accessible name, receives initial focus, and displays computed score', () => {
    render(<RepoHealthDrawer repo={sampleRepo} isOpen={true} onClose={() => {}} />)

    const dialog = screen.getByRole('dialog', { name: /OrgExplorer/i })
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveFocus()

    expect(screen.getByText('OrgExplorer')).toBeInTheDocument()
    expect(screen.getByText('AOSSIE-Org')).toBeInTheDocument()
    expect(screen.getByText('61')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Score Breakdown/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('renders category breakdown cards on default tab', () => {
    render(<RepoHealthDrawer repo={sampleRepo} isOpen={true} onClose={() => {}} />)

    expect(screen.getByText('Activity Health')).toBeInTheDocument()
    expect(screen.getByText('Issue Health')).toBeInTheDocument()
    expect(screen.getByText('Contributor Diversity')).toBeInTheDocument()
    expect(screen.getByText('Scoring Formula')).toBeInTheDocument()
    expect(screen.getByRole('tabpanel', { name: /Score Breakdown/i })).toBeInTheDocument()
  })

  it('switches to Recommendations tab on click and updates selected tab state', () => {
    render(<RepoHealthDrawer repo={sampleRepo} isOpen={true} onClose={() => {}} />)

    const recTab = screen.getByRole('tab', { name: /Recommendations/i })
    fireEvent.click(recTab)

    expect(recTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: /Recommendations/i })).toBeInTheDocument()
    expect(screen.getByText(/Strong Development Momentum/i)).toBeInTheDocument()
  })

  it('supports activating tabs with user interaction', async () => {
    const user = userEvent.setup()
    render(<RepoHealthDrawer repo={sampleRepo} isOpen={true} onClose={() => {}} />)

    const recTab = screen.getByRole('tab', { name: /Recommendations/i })
    await user.click(recTab)

    expect(recTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/Strong Development Momentum/i)).toBeInTheDocument()
  })

  it('switches to Raw Metrics tab and displays repository attributes', () => {
    render(<RepoHealthDrawer repo={sampleRepo} isOpen={true} onClose={() => {}} />)

    const rawTab = screen.getByRole('tab', { name: /Raw Metrics/i })
    fireEvent.click(rawTab)

    expect(rawTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: /Raw Metrics/i })).toBeInTheDocument()
    expect(screen.getByText('Primary Language')).toBeInTheDocument()
    expect(screen.getByText('JavaScript')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
  })

  it('triggers onClose when close button or backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<RepoHealthDrawer repo={sampleRepo} isOpen={true} onClose={onClose} />)

    const closeBtn = screen.getByRole('button', { name: /Close health details/i })
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)

    const backdrop = screen.getByTestId('drawer-backdrop')
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('triggers onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<RepoHealthDrawer repo={sampleRepo} isOpen={true} onClose={onClose} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
