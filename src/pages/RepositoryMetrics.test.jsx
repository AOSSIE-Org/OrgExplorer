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
    orgs: ['first-org', 'second-org', 'uncached-org'].map(login => ({ login })),
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
    const selector = screen.getByRole('combobox', { name: 'Filter activity trends by repository' })

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
    const selector = screen.getByRole('combobox', { name: 'Filter advanced metrics by repository' })

    expect(within(selector).getAllByRole('option').map(option => option.value))
      .toEqual(['All Repositories', 'first-org/docs', 'second-org/docs'])

    await user.selectOptions(selector, 'first-org/docs')
    expect(screen.getByText('Based on', { exact: false })).toHaveTextContent('1 merged pull requests')
    await user.selectOptions(selector, 'second-org/docs')
    expect(screen.getByText('Based on', { exact: false })).toHaveTextContent('0 merged pull requests')
    await user.selectOptions(selector, 'All Repositories')
    expect(screen.getByText('Based on', { exact: false })).toHaveTextContent('1 merged pull requests')
    expect(screen.getByText((_, element) => element?.textContent === '1 merged · 1 rejected'))
      .toBeInTheDocument()
  })

  it('preserves organization filtering and resets repository selections when the organization changes', async () => {
    const user = userEvent.setup()
    render(<AnalyticsPage />)
    const [activityOrganization, advancedOrganization] = screen.getAllByRole('combobox', { name: 'Filter stats by organization' })
    const activity = screen.getByRole('combobox', { name: 'Filter activity trends by repository' })
    const advanced = screen.getByRole('combobox', { name: 'Filter advanced metrics by repository' })

    await user.selectOptions(activity, 'first-org/docs')
    await user.selectOptions(advanced, 'first-org/docs')
    await user.selectOptions(activityOrganization, 'second-org')
    expect(activityOrganization).toHaveValue(advancedOrganization.value)
    expect(activity).toHaveValue('All')
    expect(advanced).toHaveValue('All Repositories')
    expect(within(activity).getAllByRole('option').map(option => option.value))
      .toEqual(['All', 'second-org/docs'])
    expect(within(advanced).getAllByRole('option').map(option => option.value))
      .toEqual(['All Repositories', 'second-org/docs'])
    expect(JSON.parse(screen.getAllByTestId('trend-series')[0].textContent))
      .toEqual([expect.objectContaining({ date: '2026-02', issues_created: 1 })])
    expect(screen.getByText('Based on', { exact: false })).toHaveTextContent('0 merged pull requests')

    await user.selectOptions(activity, 'second-org/docs')
    await user.selectOptions(advanced, 'second-org/docs')
    await user.selectOptions(advancedOrganization, 'first-org')
    expect(activityOrganization).toHaveValue(advancedOrganization.value)
    expect(activity).toHaveValue('All')
    expect(advanced).toHaveValue('All Repositories')
    expect(JSON.parse(screen.getAllByTestId('trend-series')[0].textContent))
      .toEqual([expect.objectContaining({ date: '2026-01', issues_created: 1 })])
    expect(screen.getByText('Based on', { exact: false })).toHaveTextContent('1 merged pull requests')

    await user.selectOptions(activityOrganization, 'All Organizations')
    expect(within(activity).getAllByRole('option')).toHaveLength(3)
    expect(within(advanced).getAllByRole('option')).toHaveLength(3)
    expect(JSON.parse(screen.getAllByTestId('trend-series')[0].textContent)).toHaveLength(2)
    expect(screen.getByText((_, element) => element?.textContent === '1 merged · 1 rejected'))
      .toBeInTheDocument()
  })

  it('keeps resolution rates and missing audit data scoped to their organization', () => {
    render(<GovernancePage />)

    for (const [org, rate] of [['first-org', '100%'], ['second-org', '0%'], ['uncached-org', 'No data']]) {
      const row = screen.getByText(org, { selector: 'span' }).parentElement.parentElement
      expect(within(row).getByText(rate)).toBeInTheDocument()
    }
  })
})
