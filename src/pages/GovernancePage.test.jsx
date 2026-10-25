
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import GovernancePage from './GovernancePage'

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    orgs: [{ login: 'test-org' }],
    model: {
      allRepos: [
        {
          id: 1,
          name: 'test-repo',
          orgLogin: 'test-org',
          license: { name: 'MIT' },
          archived: false,
          fork: false
        }
      ]
    },
    issuesData: {
      'test-org/test-repo': [
        { id: 1, state: 'closed' },
        { id: 2, state: 'open' },
        { id: 3, state: 'closed', pull_request: { url: 'pr/3' } },
        { id: 4, state: 'closed', pull_request: { url: 'pr/4' } }
      ]
    },
    runAudit: vi.fn(),
    govLoading: false,
    auditComplete: true,
    loading: false,
    runGovernanceAnalysis: vi.fn(),
    staleRepoStats: []
  })
}))

describe('GovernancePage - Issue Resolution Rate', () => {
  it('excludes pull requests when calculating the issue resolution rate', () => {
    render(<GovernancePage />)

    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.queryByText('75%')).not.toBeInTheDocument()
  })
})
