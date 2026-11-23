import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import AnalyticsPage from './AnalyticsPage'

const app = vi.hoisted(() => ({ state: {} }))
vi.mock('../context/AppContext', () => ({ useApp: () => app.state }))
vi.mock('../components/AnalysisBanner', () => ({ default: () => null }))
vi.mock('recharts', async importOriginal => ({
  ...await importOriginal(),
  ResponsiveContainer: () => null,
}))

describe('AnalyticsPage organization filters', () => {
  it('includes organizations from pull data when issue data is empty', () => {
    app.state = {
      model: {},
      issuesData: {},
      pullsData: { 'pulls-only-org/repo': [] },
      loading: false,
      auditComplete: false,
      advanceAnalyticsComplete: false,
      govLoading: false,
      advanceAnalyticsLoading: false,
      runAudit: vi.fn(),
      runAdvanceAnalytics: vi.fn(),
      runFullAnalytics: vi.fn(),
      runGovernanceAnalysis: vi.fn(),
      pat: null,
    }

    render(<AnalyticsPage />)

    const orgFilters = screen.getAllByLabelText('Filter stats by organization')
    expect(orgFilters).toHaveLength(2)
    orgFilters.forEach(filter => {
      expect(within(filter).getByRole('option', { name: 'pulls-only-org' })).toBeInTheDocument()
    })
  })
})
