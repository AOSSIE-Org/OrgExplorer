import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GovernancePage from './GovernancePage'

const app = vi.hoisted(() => ({ state: {} }))

vi.mock('../context/AppContext', () => ({ useApp: () => app.state }))

function staleRepo(org, repo) {
  return {
    id: `${org}/${repo}`,
    org,
    repo,
    ratio: 50,
    staleCount: 1,
    openCount: 2,
  }
}

function loadedStats() {
  return [
    ...Array.from({ length: 11 }, (_, i) =>
      staleRepo('org-a', `alpha-${String(i + 1).padStart(2, '0')}`)
    ),
    staleRepo('org-b', 'beta'),
  ]
}

async function openStaleIssues(user) {
  await user.click(screen.getByRole('button', { name: /^stale issues ratio/i }))
}

describe('GovernancePage stale issue results', () => {
  beforeEach(() => {
    app.state = {
      orgs: [{ login: 'org-a' }, { login: 'org-b' }, { login: 'org-empty' }],
      model: { allRepos: [] },
      issuesData: {},
      staleRepoStats: [],
      runAudit: vi.fn(),
      runGovernanceAnalysis: vi.fn(),
      govLoading: false,
      auditComplete: true,
      loading: false,
    }
  })

  it('renders the stale issues tab when audit results arrive instead of crashing', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<GovernancePage />)

    await user.click(screen.getByRole('button', { name: /^run audit$/i }))
    expect(app.state.runAudit).toHaveBeenCalledTimes(1)

    // AppContext supplies these results after the asynchronous audit finishes.
    app.state = {
      ...app.state,
      issuesData: { 'org-a/alpha': [] },
      staleRepoStats: [staleRepo('org-a', 'alpha')],
    }
    rerender(<GovernancePage />)
    await openStaleIssues(user)

    expect(screen.getByRole('heading', { name: 'Governance Audit' })).toBeInTheDocument()
    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.getByText('1 stale issues out of 2 open issues (50%)')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href', 'https://github.com/org-a/alpha/issues'
    )
  })

  it('paginates stale repositories and resets to the first page when the organization changes', async () => {
    const user = userEvent.setup()
    app.state.staleRepoStats = loadedStats()
    render(<GovernancePage />)
    await openStaleIssues(user)

    expect(screen.getAllByRole('link', { name: 'GitHub' })).toHaveLength(10)
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('alpha-11')).toBeInTheDocument()
    expect(screen.getByText('beta')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter stats by organization' }), 'org-a')
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('alpha-01')).toBeInTheDocument()
    expect(screen.queryByText('beta')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getAllByRole('link', { name: 'GitHub' })).toHaveLength(1)
    expect(screen.getByText('alpha-11')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /previous/i }))
    expect(screen.getByText('alpha-01')).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter stats by organization' }), 'org-b')
    expect(screen.getByText('beta')).toBeInTheDocument()
    expect(screen.queryByText('alpha-01')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument()
  })

  it('shows the empty state for an organization without stale repository data', async () => {
    const user = userEvent.setup()
    app.state.staleRepoStats = loadedStats()
    render(<GovernancePage />)
    await openStaleIssues(user)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter stats by organization' }), 'org-empty')

    expect(screen.getByText('No stale issues found')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'GitHub' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument()
  })

  it('resets stale repository pagination when searching and handles no matches', async () => {
    const user = userEvent.setup()
    app.state.staleRepoStats = loadedStats()
    render(<GovernancePage />)
    await openStaleIssues(user)
    await user.click(screen.getByRole('button', { name: /next/i }))

    const search = screen.getByRole('textbox', { name: 'Search repositories in governance results' })
    await user.type(search, 'org-a/alpha-01')

    expect(screen.getByText('alpha-01')).toBeInTheDocument()
    expect(screen.queryByText('alpha-11')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'missing-repo')
    expect(screen.getByRole('heading', { name: 'No matching repositories' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'GitHub' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear Search' }))
    expect(screen.getByText('alpha-01')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
  })
})
