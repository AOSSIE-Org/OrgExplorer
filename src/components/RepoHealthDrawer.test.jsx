import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import RepoHealthDrawer from './RepoHealthDrawer'

const sampleRepo = {
  name: 'OrgExplorer',
  orgLogin: 'AOSSIE-Org',
  healthScore: 78,
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

  it('renders header, repo name, and overall score when open', () => {
    render(<RepoHealthDrawer repo={sampleRepo} isOpen={true} onClose={() => {}} />)

    expect(screen.getByText('OrgExplorer')).toBeInTheDocument()
    expect(screen.getByText('AOSSIE-Org')).toBeInTheDocument()
    expect(screen.getByText('Repository Health Inspector')).toBeInTheDocument()
    expect(screen.getByText('Score Breakdown')).toBeInTheDocument()
  })

  it('renders category breakdown cards on default tab', () => {
    render(<RepoHealthDrawer repo={sampleRepo} isOpen={true} onClose={() => {}} />)

    expect(screen.getByText('Activity Health')).toBeInTheDocument()
    expect(screen.getByText('Issue Health')).toBeInTheDocument()
    expect(screen.getByText('Contributor Diversity')).toBeInTheDocument()
    expect(screen.getByText('Scoring Formula')).toBeInTheDocument()
  })

  it('switches to Recommendations tab on click', () => {
    render(<RepoHealthDrawer repo={sampleRepo} isOpen={true} onClose={() => {}} />)

    const recTab = screen.getByRole('button', { name: /Recommendations/i })
    fireEvent.click(recTab)

    expect(screen.getByText(/Strong Development Momentum/i)).toBeInTheDocument()
  })

  it('switches to Raw Metrics tab and displays repository attributes', () => {
    render(<RepoHealthDrawer repo={sampleRepo} isOpen={true} onClose={() => {}} />)

    const rawTab = screen.getByRole('button', { name: /Raw Metrics/i })
    fireEvent.click(rawTab)

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
