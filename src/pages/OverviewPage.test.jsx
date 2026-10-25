import React, { cloneElement } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import OverviewPage from './OverviewPage'
import RepositoryCreationTimeline, { CreationTooltip } from '../components/RepositoryCreationTimeline'

const app = vi.hoisted(() => ({ state: {} }))
vi.mock('../context/AppContext', () => ({ useApp: () => app.state }))
vi.mock('../context/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }))
vi.mock('../components/AnalysisBanner', () => ({ default: () => null }))
vi.mock('../components/SocialShareButton', () => ({ default: () => null }))
vi.mock('recharts', async importOriginal => ({
  ...await importOriginal(),
  // jsdom has no layout; keep the real chart and give it a measurable size.
  ResponsiveContainer: ({ children }) => cloneElement(children, { width: 800, height: 260 }),
}))

function readRows() {
  return within(screen.getByRole('table', { hidden: true }))
    .getAllByRole('row', { hidden: true }).slice(1)
    .map(row => [...row.children].map(cell => cell.textContent))
}

describe('Overview repository creation timeline', () => {
  beforeEach(() => {
    const totalRepos = [
      { id: 1, orgLogin: 'alpha', created_at: '2025-12-01T00:00:00Z' },
      { id: 2, orgLogin: 'alpha', created_at: '2026-02-01T00:00:00Z' },
      { id: 3, orgLogin: 'beta', created_at: '2026-02-05T00:00:00Z' },
    ].map(repo => ({
      ...repo,
      name: `repo-${repo.id}`,
      healthScore: 50,
      stargazers_count: 0,
      forks_count: 0,
    }))
    app.state = {
      orgs: [{ login: 'alpha' }, { login: 'beta' }],
      // Contributor analysis may contain fewer repositories than the loaded list.
      model: { totalRepos, allRepos: [totalRepos[0]] },
      totalRepo: 500, isComplete: false, loading: false,
    }
  })

  it('uses all loaded repositories, switches periods and follows the existing organization filter', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><OverviewPage /></MemoryRouter>)
    await user.click(screen.getByText('View timeline data'))

    expect(readRows()).toEqual([['2025', '1', '1'], ['2026', '2', '3']])
    expect(screen.getByText(/Based on 3 loaded repositories/)).toBeInTheDocument()
    expect(screen.getByText(/does not include deleted repositories/)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Group by'), 'monthly')
    expect(readRows()).toEqual([
      ['2025-12', '1', '1'], ['2026-01', '0', '1'], ['2026-02', '2', '3'],
    ])

    await user.selectOptions(screen.getByLabelText('Filter stats by organization'), 'beta')
    expect(readRows()).toEqual([['2026-02', '1', '1']])
    expect(screen.getByText(/Based on 1 loaded repository/)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Filter stats by organization'), 'All Organizations')
    expect(readRows().at(-1)).toEqual(['2026-02', '2', '3'])
  })

  it('handles loading and missing models before mounting the chart', () => {
    app.state.loading = true
    const { rerender } = render(<MemoryRouter><OverviewPage /></MemoryRouter>)
    expect(screen.queryByLabelText('Repository creation timeline')).not.toBeInTheDocument()

    app.state.loading = false
    rerender(<MemoryRouter><OverviewPage /></MemoryRouter>)
    expect(screen.getByLabelText('Repository creation timeline')).toBeInTheDocument()

    app.state.model = null
    rerender(<MemoryRouter><OverviewPage /></MemoryRouter>)
    expect(screen.queryByLabelText('Repository creation timeline')).not.toBeInTheDocument()
  })

  it('updates when a new analysis replaces the loaded repositories', async () => {
    const { rerender } = render(<MemoryRouter><OverviewPage /></MemoryRouter>)
    await userEvent.click(screen.getByText('View timeline data'))
    app.state.model = {
      totalRepos: [{ id: 4, name: 'new', orgLogin: 'alpha', created_at: '2020-01-01T00:00:00Z' }],
    }
    app.state.isComplete = true
    rerender(<MemoryRouter><OverviewPage /></MemoryRouter>)
    expect(readRows()).toEqual([['2020', '1', '1']])
  })
})

describe('Timeline edge states and tooltip', () => {
  it('supports keyboard focus and arrow-key tooltips before and after changing grouping', async () => {
    const user = userEvent.setup()
    const repos = [
      { created_at: '2025-12-01T00:00:00Z' },
      { created_at: '2026-02-01T00:00:00Z' },
      { created_at: '2026-02-05T00:00:00Z' },
    ]
    render(<RepositoryCreationTimeline repos={repos} />)
    const grouping = screen.getByRole('combobox', { name: 'Group by' })
    const chart = screen.getByRole('application')
    const wrapper = chart.parentElement
    // Recharts uses the wrapper's bounds to position keyboard-driven tooltips.
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 800, 260))
    Object.defineProperty(wrapper, 'offsetWidth', { value: 800 })

    await user.tab()
    expect(grouping).toHaveFocus()
    await user.tab()
    expect(chart).toHaveFocus()
    expect(await screen.findByText('2025', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Repositories created: 1')).toBeInTheDocument()

    await user.keyboard('{ArrowRight}')
    expect(await screen.findByText('2026', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Repositories created: 2')).toBeInTheDocument()
    expect(screen.getByText('Cumulative loaded repositories: 3')).toBeInTheDocument()

    await user.keyboard('{ArrowLeft}')
    expect(await screen.findByText('2025', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Cumulative loaded repositories: 1')).toBeInTheDocument()

    await user.tab({ shift: true })
    expect(grouping).toHaveFocus()
    // jsdom does not implement native select arrow-key defaults; selectOptions
    // supplies the selection change while focus and chart keys remain real.
    await user.selectOptions(grouping, 'monthly')
    expect(grouping).toHaveValue('monthly')
    await user.tab()
    expect(chart).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(await screen.findByText('2026-01', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Repositories created: 0')).toBeInTheDocument()
    expect(screen.getByText('Cumulative loaded repositories: 1')).toBeInTheDocument()

    await user.keyboard('{ArrowRight}')
    expect(await screen.findByText('2026-02', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Repositories created: 2')).toBeInTheDocument()
    expect(screen.getByText('Cumulative loaded repositories: 3')).toBeInTheDocument()
  })

  it('shows an empty state and explains omitted invalid dates', () => {
    const { rerender } = render(<RepositoryCreationTimeline repos={[{ created_at: null }]} />)
    expect(screen.getByRole('status')).toHaveTextContent('No repository creation dates available')
    expect(screen.getByText(/1 repository without a valid creation date is excluded/)).toBeInTheDocument()
    expect(screen.queryByText('View timeline data')).not.toBeInTheDocument()
    rerender(<RepositoryCreationTimeline repos={[]} />)
    expect(screen.getByText(/Based on 0 loaded repositories/)).toBeInTheDocument()
  })

  it('shows period count and cumulative loaded count in the tooltip, including zero-count periods', () => {
    const { rerender } = render(
      <CreationTooltip
        active
        payload={[{ payload: { period: '2026-01', created: 0, cumulative: 12 } }]}
      />
    )
    expect(screen.getByText('2026-01')).toBeInTheDocument()
    expect(screen.getByText('Repositories created: 0')).toBeInTheDocument()
    expect(screen.getByText('Cumulative loaded repositories: 12')).toBeInTheDocument()
    rerender(<CreationTooltip active={false} payload={[]} />)
    expect(screen.queryByText('2026-01')).not.toBeInTheDocument()
  })
})
