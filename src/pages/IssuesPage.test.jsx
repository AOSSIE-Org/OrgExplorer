import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
        },
        {
          id: 103,
          number: 3,
          title: 'Closed issue for testing',
          state: 'closed',
          created_at: '2026-09-03T10:00:00Z',
          html_url: 'https://github.com/AOSSIE/OrgExplorer/issues/3',
          user: { login: 'tester3', avatar_url: '' },
          labels: [{ id: 2, name: 'feature', color: '00ff00' }],
          comments: 1
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

    // Open tab (default)
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('First issue for testing')).toBeInTheDocument()
    expect(screen.queryByText('Closed issue for testing')).not.toBeInTheDocument()

    // Switch to Closed tab
    fireEvent.click(screen.getByRole('button', { name: /^closed$/i }))
    expect(screen.queryByText('First issue for testing')).not.toBeInTheDocument()
    expect(screen.getByText('Closed issue for testing')).toBeInTheDocument()

    // Switch to All tab
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }))
    expect(screen.getByText('First issue for testing')).toBeInTheDocument()
    expect(screen.getByText('Closed issue for testing')).toBeInTheDocument()
  })
})
