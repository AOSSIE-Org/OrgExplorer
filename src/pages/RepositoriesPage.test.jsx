import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RepositoriesPage from './RepositoriesPage'

const { app } = vi.hoisted(() => ({ app: {} }))

vi.mock('../context/AppContext', () => ({ useApp: () => app }))

// The banner owns the PAT gate and the "run complete analysis" flow; it is
// not what this test is about.
vi.mock('../components/AnalysisBanner', () => ({ default: () => null }))

const repo = (overrides = {}) => ({
  id: 1,
  name: 'DebateAI',
  orgLogin: 'AOSSIE-Org',
  html_url: 'https://github.com/AOSSIE-Org/DebateAI',
  description: 'A debate app',
  stargazers_count: 12,
  forks_count: 3,
  open_issues_count: 312,
  healthScore: 71,
  activityClassification: 'Active',
  language: 'TypeScript',
  pushed_at: '2026-10-01T12:00:00Z',
  ...overrides,
})

const openIssue = () => ({ state: 'open' })
const openPull = () => ({ state: 'open', pull_request: {} })

function renderPage() {
  return render(
    <MemoryRouter>
      <RepositoriesPage />
    </MemoryRouter>
  )
}

describe('RepositoriesPage open issue and pull request counts', () => {
  beforeEach(() => {
    Object.assign(app, {
      model: { totalRepos: [repo()] },
      issuesData: {},
      isComplete: true,
      loading: false,
      runFullExplore: vi.fn(),
    })
  })

  it('labels the column as open issues and pull requests', () => {
    renderPage()

    expect(
      screen.getByRole('columnheader', { name: /Open Issues & PRs/i })
    ).toBeInTheDocument()
  })

  it('shows GitHub’s combined count in the cell', () => {
    renderPage()

    expect(screen.getByText('312')).toBeInTheDocument()
  })

  it('splits the count in the tooltip once the repository has been audited', () => {
    app.issuesData = {
      'AOSSIE-Org/DebateAI': [
        ...Array.from({ length: 156 }, () => openIssue()),
        ...Array.from({ length: 156 }, () => openPull()),
      ],
    }

    renderPage()

    const tooltip = screen.getByText('312').closest('td').getAttribute('title')
    expect(tooltip).toContain('156 open issues')
    expect(tooltip).toContain('156 open pull requests')
  })

  it('shows the split next to the combined count once the repository has been audited', () => {
    app.issuesData = {
      'AOSSIE-Org/DebateAI': [
        ...Array.from({ length: 156 }, () => openIssue()),
        ...Array.from({ length: 156 }, () => openPull()),
      ],
    }

    renderPage()

    expect(screen.getByText('156 issues · 156 PRs')).toBeInTheDocument()
  })

  it('does not show a split that the audit could not confirm', () => {
    app.issuesData = {
      'AOSSIE-Org/DebateAI': [openIssue(), openPull()],
    }

    renderPage()

    expect(screen.queryByText(/issues · .*PRs/)).not.toBeInTheDocument()
  })

  it('explains that the count is combined when the repository has not been audited', () => {
    renderPage()

    const tooltip = screen.getByText('312').closest('td').getAttribute('title')
    expect(tooltip).toContain('combined')
  })

  it('does not borrow another organization’s audit data for the tooltip', () => {
    app.issuesData = {
      'Other-Org/DebateAI': [openIssue(), openPull()],
    }

    renderPage()

    const tooltip = screen.getByText('312').closest('td').getAttribute('title')
    expect(tooltip).toContain('combined')
  })

  it('flags partial audit data instead of presenting it as exact', () => {
    app.issuesData = {
      'AOSSIE-Org/DebateAI': [openIssue(), openPull()],
    }

    renderPage()

    const tooltip = screen.getByText('312').closest('td').getAttribute('title')
    expect(tooltip).toContain('partial')
  })
})
