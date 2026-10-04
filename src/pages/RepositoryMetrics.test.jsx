import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AnalyticsPage from './AnalyticsPage'
import GovernancePage from './GovernancePage'

const { app } = vi.hoisted(() => ({ app: {} }))

vi.mock('../context/AppContext', () => ({ useApp: () => app }))

// Chart layout is not needed to exercise repository selection and its metrics.
vi.mock('recharts', () => {
  const EmptyChart = () => null
  return {
    AreaChart: ({ data }) => <output data-testid="trend-series">{JSON.stringify(data)}</output>,
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    Area: EmptyChart, XAxis: EmptyChart, YAxis: EmptyChart,
    CartesianGrid: EmptyChart, Tooltip: EmptyChart, Legend: EmptyChart,
    PieChart: EmptyChart, Pie: EmptyChart, Cell: EmptyChart,
    RadialBarChart: EmptyChart, RadialBar: EmptyChart, PolarAngleAxis: EmptyChart,
  }
})

beforeEach(() => {
  Object.assign(app, {
    model: {
      allRepos: [
        { id: 1, name: 'docs', orgLogin: 'first-org', license: { key: 'mit' } },
        { id: 2, name: 'docs', orgLogin: 'second-org', license: { key: 'mit' } },
        { id: 3, name: 'docs', orgLogin: 'uncached-org', license: { key: 'mit' } },
      ],
    },
    issuesData: {
      'first-org/docs': [{ id: 1, state: 'closed', created_at: '2026-01-01T00:00:00Z' }],
      'second-org/docs': [{ id: 2, state: 'open', created_at: '2026-02-01T00:00:00Z' }],
    },
    pullsData: {
      'first-org/docs': [{ state: 'closed', created_at: '2026-01-01T00:00:00Z', merged_at: '2026-01-03T00:00:00Z' }],
      'second-org/docs': [{ state: 'closed', created_at: '2026-02-01T00:00:00Z', merged_at: null }],
    },
    staleRepoStats: [],
    loading: false,
    govLoading: false,
    advanceAnalyticsLoading: false,
    auditComplete: true,
    advanceAnalyticsComplete: true,
    pat: '',
  })
})

describe('repository metrics across organizations', () => {
  it('selects each same-name repository independently in activity trends', async () => {
    const user = userEvent.setup()
    render(<AnalyticsPage />)
    const selector = screen.getAllByRole('combobox')[0]

    expect(within(selector).getAllByRole('option').map(option => option.value))
      .toEqual(['All', 'first-org/docs', 'second-org/docs'])

    for (const [repo, month] of [['first-org/docs', '2026-01'], ['second-org/docs', '2026-02']]) {
      await user.selectOptions(selector, repo)
      const series = JSON.parse(screen.getAllByTestId('trend-series')[0].textContent)
      expect(series).toHaveLength(1)
      expect(series[0]).toMatchObject({ date: month, issues_created: 1 })
    }

    await user.selectOptions(selector, 'All')
    expect(JSON.parse(screen.getAllByTestId('trend-series')[0].textContent)).toHaveLength(2)
  })

  it('uses the selected organization for advanced pull request metrics', async () => {
    const user = userEvent.setup()
    render(<AnalyticsPage />)
    const selector = screen.getAllByRole('combobox')[1]

    expect(within(selector).getAllByRole('option').map(option => option.value))
      .toEqual(['All Repositories', 'first-org/docs', 'second-org/docs'])

    await user.selectOptions(selector, 'first-org/docs')
    expect(screen.getByText('Based on', { exact: false })).toHaveTextContent('1 merged pull requests')
    await user.selectOptions(selector, 'second-org/docs')
    expect(screen.getByText('Based on', { exact: false })).toHaveTextContent('0 merged pull requests')
    await user.selectOptions(selector, 'All Repositories')
    expect(screen.getByText('Based on', { exact: false })).toHaveTextContent('1 merged pull requests')
  })

  it('keeps resolution rates and missing audit data scoped to their organization', () => {
    render(<GovernancePage />)

    for (const [org, rate] of [['first-org', '100%'], ['second-org', '0%'], ['uncached-org', 'No data']]) {
      const row = screen.getByText(org).parentElement.parentElement
      expect(within(row).getByText(rate)).toBeInTheDocument()
    }
  })
})
