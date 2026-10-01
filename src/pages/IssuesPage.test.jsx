import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import IssuesPage from './IssuesPage'

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    model: {
      totalRepos: [
        { orgLogin: 'AOSSIE', name: 'OrgExplorer' }
      ]
    },
    issuesData: {
      'AOSSIE/OrgExplorer': [
        {
          id: 101,
          number: 1,
          title: 'First issue for testing',
          state: 'open',
          created_at: '2026-09-01T10:00:00Z',
          html_url: 'https://github.com/AOSSIE/OrgExplorer/issues/1',
          user: { login: 'tester1', avatar_url: '' },
          assignee: { login: 'maintainer1', avatar_url: '' },
          labels: [{ id: 1, name: 'bug', color: 'ff0000' }],
          comments: 3
        },
        {
          id: 102,
          number: 2,
          title: 'Pull request item that should be excluded',
          state: 'open',
          created_at: '2026-09-02T10:00:00Z',
          html_url: 'https://github.com/AOSSIE/OrgExplorer/pull/2',
          pull_request: { url: 'https://api.github.com/repos/AOSSIE/OrgExplorer/pulls/2' },
          user: { login: 'tester2' }
        }
      ]
    },
    loading: false
  })
}))

describe('IssuesPage', () => {
  it('renders issues page title and metrics correctly', () => {
    render(
      <MemoryRouter>
        <IssuesPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Issues Explorer')).toBeInTheDocument()
    expect(screen.getByText('First issue for testing')).toBeInTheDocument()
    expect(screen.queryByText('Pull request item that should be excluded')).not.toBeInTheDocument()
  })

  it('filters issues by state correctly', () => {
    render(
      <MemoryRouter>
        <IssuesPage />
      </MemoryRouter>
    )

    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('tester1')).toBeInTheDocument()
    expect(screen.getByText('bug')).toBeInTheDocument()
  })
})
