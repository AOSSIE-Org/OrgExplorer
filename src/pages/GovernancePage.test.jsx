import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import GovernancePage from './GovernancePage'

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    model: {
      allRepos: [
        { id: 1, name: 'repo-1', orgLogin: 'AOSSIE-Org', license: null }
      ]
    },
    issuesData: {},
    communityData: {
      'AOSSIE-Org/repo-1': {
        files: {
          code_of_conduct: { html_url: 'https://github.com/AOSSIE-Org/repo-1/blob/main/CODE_OF_CONDUCT.md' },
          contributing: null,
          issue_template: null,
          pull_request_template: null
        }
      }
    },
    runAudit: vi.fn(),
    govLoading: false,
    auditComplete: true,
    loading: false,
    runGovernanceAnalysis: vi.fn(),
    staleRepoStats: []
  })
}))

describe('GovernancePage - Community Files tab', () => {
  it('correctly calculates non-compliant community repos count and renders checklist table', () => {
    render(<GovernancePage />)

    // Verify Community Files tab button displays with non-compliant count (1)
    const communityTabButton = screen.getByRole('button', { name: /Community Files\s+1/i })
    expect(communityTabButton).toBeInTheDocument()

    // Click the Community Files tab
    fireEvent.click(communityTabButton)

    // Verify the table headers render correctly
    expect(screen.getByText('CODE OF CONDUCT')).toBeInTheDocument()
    expect(screen.getByText('CONTRIBUTING')).toBeInTheDocument()
    expect(screen.getByText('ISSUE TEMPLATES')).toBeInTheDocument()
    expect(screen.getByText('PR TEMPLATES')).toBeInTheDocument()

    // Verify repository name is rendered
    expect(screen.getAllByText('repo-1').length).toBeGreaterThan(0)

    // Verify Code of Conduct has a green check mark linking to GitHub
    const cocLink = screen.getByRole('link', { name: /✓ Yes/i })
    expect(cocLink).toBeInTheDocument()
    expect(cocLink.getAttribute('href')).toBe('https://github.com/AOSSIE-Org/repo-1/blob/main/CODE_OF_CONDUCT.md')

    // Verify missing files show red cross marks
    const missingElements = screen.getAllByText(/✗ Missing/i)
    expect(missingElements.length).toBe(3) // Contributing, Issue, PR Templates are missing
  })
})
