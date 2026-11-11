import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import React from 'react'
import { AppProvider, useApp } from './AppContext'
import { loadAnalysis } from '../services/cache'
import { fetchIssues, fetchPulls } from '../services/github'

vi.mock('../services/cache', () => ({
  loadAnalysis: vi.fn(),
  saveAnalysis: vi.fn().mockResolvedValue(true),
}))

vi.mock('../services/github', () => ({
  fetchOrg: vi.fn(),
  fetchRepos: vi.fn(),
  fetchContributors: vi.fn(),
  fetchIssues: vi.fn(),
  fetchRateLimit: vi.fn(),
  fetchPulls: vi.fn(),
}))

const repos = [
  { orgLogin: 'sample-org', name: 'working' },
  { orgLogin: 'sample-org', name: 'broken' },
]

function AuditHarness() {
  const { model, runAudit, runGovernanceAnalysis, runFullAnalytics, issuesData, auditComplete, auditFailures, govLoading } = useApp()
  if (!model) return <span>Loading model</span>

  return (
    <div>
      <button onClick={runAudit}>Run audit</button>
      <button onClick={runGovernanceAnalysis}>Run governance analysis</button>
      <button onClick={runFullAnalytics}>Run full analytics</button>
      <span data-testid="audit-loading">{String(govLoading)}</span>
      <span data-testid="audit-complete">{String(auditComplete)}</span>
      <span data-testid="audit-failures">{auditFailures.join(',')}</span>
      <span data-testid="audited-repos">{Object.keys(issuesData).join(',')}</span>
    </div>
  )
}

describe('governance audit failures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('oe_pat', 'test-pat')
    loadAnalysis.mockResolvedValue({
      model: { allRepos: repos, totalRepos: repos },
      isComplete: true,
      auditComplete: true,
    })
    fetchPulls.mockResolvedValue([])
    fetchIssues.mockImplementation((_org, repo) =>
      repo === 'broken' ? Promise.reject(new Error('HTTP_500')) : Promise.resolve([])
    )
  })

  it.each(['Run audit', 'Run governance analysis', 'Run full analytics'])(
    '%s keeps successful issue data but reports a failed repository as incomplete', async action => {
      render(<AppProvider><AuditHarness /></AppProvider>)
      await screen.findByRole('button', { name: action })

      await act(async () => { screen.getByRole('button', { name: action }).click() })

      expect(fetchIssues).toHaveBeenCalledTimes(2)
      expect(screen.getByTestId('audited-repos')).toHaveTextContent('sample-org/working')
      expect(screen.getByTestId('audited-repos')).not.toHaveTextContent('sample-org/broken')
      expect(screen.getByTestId('audit-failures')).toHaveTextContent('sample-org/broken')
      expect(screen.getByTestId('audit-complete')).toHaveTextContent('false')
      expect(screen.getByTestId('audit-loading')).toHaveTextContent('false')
    }
  )

  it('clears the failure and marks the audit complete after a successful retry', async () => {
    render(<AppProvider><AuditHarness /></AppProvider>)
    await screen.findByRole('button', { name: 'Run audit' })

    await act(async () => { screen.getByRole('button', { name: 'Run audit' }).click() })
    expect(screen.getByTestId('audit-failures')).toHaveTextContent('sample-org/broken')

    fetchIssues.mockResolvedValue([])
    await act(async () => { screen.getByRole('button', { name: 'Run audit' }).click() })

    expect(screen.getByTestId('audited-repos')).toHaveTextContent('sample-org/broken')
    expect(screen.getByTestId('audit-failures')).toBeEmptyDOMElement()
    expect(screen.getByTestId('audit-complete')).toHaveTextContent('true')
  })
})
