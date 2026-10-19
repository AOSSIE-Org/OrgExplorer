/**
 * Regression tests for GovernancePage -- issue #353
 *
 * Before PR #262 merged into upstream/main, selecting the Stale Issues Ratio
 * tab caused a ReferenceError (paginatedStaleReposOfOrg was not defined),
 * which blanked the entire page.  PR #262 replaced the broken inline function
 * call with a proper useMemo pipeline:
 *   staleRepoStats -> staleReposForOrg (org filter) -> filteredStale (search)
 *   -> paginatedStaleRepos (slice).
 *
 * These tests confirm:
 *  1.  Tab renders without crashing when audit results arrive.
 *  2.  Statistics and external links are displayed correctly.
 *  3.  Pagination works (10 items/page, Prev/Next, disabled at boundaries).
 *  4.  Changing the org filter resets to page 1 and scopes results correctly.
 *  5.  Organisations without stale data show the empty state.
 *  6.  Search scopes results, resets pagination, shows no-match UI.
 *  7.  Clear Search restores the full list at page 1.
 *  8.  runAudit is called when the Run Audit button is clicked.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GovernancePage from './GovernancePage'

// Mutable holder so each test can override app state without module-level resets.
const app = vi.hoisted(() => ({ state: {} }))

vi.mock('../context/AppContext', () => ({
  useApp: () => app.state,
}))

// ---- helpers ----------------------------------------------------------------

function staleRepo(org, repo, opts) {
  const { ratio = 50, staleCount = 1, openCount = 2 } = opts || {}
  return { id: org + '/' + repo, org, repo, ratio, staleCount, openCount }
}

// 12 repos: 11 in org-a (alpha-01 .. alpha-11) + 1 in org-b (beta)
// => two pages when "All Organizations" is selected (ITEMS_PER_PAGE = 10)
function loadedStats() {
  var items = []
  for (var i = 1; i <= 11; i++) {
    var n = String(i).padStart(2, '0')
    items.push(staleRepo('org-a', 'alpha-' + n))
  }
  items.push(staleRepo('org-b', 'beta'))
  return items
}

function baseState(overrides) {
  return Object.assign(
    {
      orgs: [{ login: 'org-a' }, { login: 'org-b' }, { login: 'org-empty' }],
      model: { allRepos: [] },
      issuesData: {},
      staleRepoStats: [],
      runAudit: vi.fn(),
      runGovernanceAnalysis: vi.fn(),
      govLoading: false,
      auditComplete: true,
      loading: false,
    },
    overrides || {}
  )
}

async function openStaleTab(user) {
  await user.click(screen.getByRole('button', { name: /^stale issues ratio/i }))
}

// ---- tests ------------------------------------------------------------------

describe('GovernancePage - Stale Issues Ratio tab (issue #353 regression)', () => {
  beforeEach(() => {
    app.state = baseState()
  })

  it('renders the page heading without crashing when staleRepoStats is empty', () => {
    render(<GovernancePage />)
    expect(screen.getByRole('heading', { name: 'Governance Audit' })).toBeInTheDocument()
  })

  it('renders the stale tab without crashing once audit results arrive', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<GovernancePage />)
    app.state = baseState({
      issuesData: { 'org-a/alpha': [] },
      staleRepoStats: [staleRepo('org-a', 'alpha')],
    })
    rerender(<GovernancePage />)
    await openStaleTab(user)
    expect(screen.getByRole('heading', { name: 'Governance Audit' })).toBeInTheDocument()
    expect(screen.getByText('alpha')).toBeInTheDocument()
  })

  it('displays stale-count statistics and a GitHub link with the correct href', async () => {
    const user = userEvent.setup()
    app.state = baseState({
      staleRepoStats: [staleRepo('org-a', 'alpha-01', { staleCount: 3, openCount: 6, ratio: 50 })],
    })
    render(<GovernancePage />)
    await openStaleTab(user)
    expect(screen.getByText('3 stale issues out of 6 open issues (50%)')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /github/i })
    expect(link).toHaveAttribute('href', 'https://github.com/org-a/alpha-01/issues')
  })

  it('paginates stale repos: 10 on page 1, remainder on page 2', async () => {
    const user = userEvent.setup()
    app.state = baseState({ staleRepoStats: loadedStats() })
    render(<GovernancePage />)
    await openStaleTab(user)

    expect(screen.getAllByRole('link', { name: /github/i })).toHaveLength(10)
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(screen.getAllByRole('link', { name: /github/i })).toHaveLength(2)
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('navigates back to page 1 via the Previous button', async () => {
    const user = userEvent.setup()
    app.state = baseState({ staleRepoStats: loadedStats() })
    render(<GovernancePage />)
    await openStaleTab(user)

    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /previous/i }))

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('alpha-01')).toBeInTheDocument()
  })

  it('resets to page 1 and scopes to org-a when the org filter changes', async () => {
    const user = userEvent.setup()
    app.state = baseState({ staleRepoStats: loadedStats() })
    render(<GovernancePage />)
    await openStaleTab(user)

    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()

    await user.selectOptions(
      screen.getByRole('combobox', { name: /filter stats by organization/i }),
      'org-a'
    )

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('alpha-01')).toBeInTheDocument()
    expect(screen.queryByText('beta')).not.toBeInTheDocument()
  })

  it('hides pagination controls when an org has 10 or fewer repos', async () => {
    const user = userEvent.setup()
    app.state = baseState({ staleRepoStats: loadedStats() })
    render(<GovernancePage />)
    await openStaleTab(user)

    await user.selectOptions(
      screen.getByRole('combobox', { name: /filter stats by organization/i }),
      'org-b'
    )

    expect(screen.getByText('beta')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument()
  })

  it('shows the empty state for an org with no stale repositories', async () => {
    const user = userEvent.setup()
    app.state = baseState({ staleRepoStats: loadedStats() })
    render(<GovernancePage />)
    await openStaleTab(user)

    await user.selectOptions(
      screen.getByRole('combobox', { name: /filter stats by organization/i }),
      'org-empty'
    )

    expect(screen.getByText('No stale issues found')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /github/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument()
  })

  it('shows the empty state when staleRepoStats is completely empty', async () => {
    const user = userEvent.setup()
    render(<GovernancePage />)
    await openStaleTab(user)
    expect(screen.getByText('No stale issues found')).toBeInTheDocument()
  })

  it('resets to page 1 and filters repos when a search term is entered', async () => {
    const user = userEvent.setup()
    app.state = baseState({ staleRepoStats: loadedStats() })
    render(<GovernancePage />)
    await openStaleTab(user)

    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()

    const searchBox = screen.getByRole('textbox', {
      name: /search repositories in governance results/i,
    })
    await user.type(searchBox, 'alpha-01')

    expect(screen.getByText('alpha-01')).toBeInTheDocument()
    expect(screen.queryByText('alpha-11')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument()
  })

  it('shows the no-match heading when the search has no results', async () => {
    const user = userEvent.setup()
    app.state = baseState({ staleRepoStats: loadedStats() })
    render(<GovernancePage />)
    await openStaleTab(user)

    const searchBox = screen.getByRole('textbox', {
      name: /search repositories in governance results/i,
    })
    await user.type(searchBox, 'xyzzy-does-not-exist')

    expect(
      screen.getByRole('heading', { name: /no matching repositories/i })
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /github/i })).not.toBeInTheDocument()
  })

  it('restores results at page 1 after clicking Clear Search', async () => {
    const user = userEvent.setup()
    app.state = baseState({ staleRepoStats: loadedStats() })
    render(<GovernancePage />)
    await openStaleTab(user)

    const searchBox = screen.getByRole('textbox', {
      name: /search repositories in governance results/i,
    })
    await user.type(searchBox, 'xyzzy-does-not-exist')
    await user.click(screen.getByRole('button', { name: /clear search/i }))

    expect(
      screen.queryByRole('heading', { name: /no matching repositories/i })
    ).not.toBeInTheDocument()
    expect(screen.getByText('alpha-01')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
  })

  it('calls runAudit when the Run Audit button is clicked', async () => {
    const user = userEvent.setup()
    app.state = baseState({ auditComplete: false, issuesData: {} })
    render(<GovernancePage />)
    await user.click(screen.getByRole('button', { name: /^run audit$/i }))
    expect(app.state.runAudit).toHaveBeenCalledTimes(1)
  })
})
