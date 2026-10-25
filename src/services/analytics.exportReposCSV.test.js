import { describe, it, expect } from 'vitest'
import { buildReposCSV } from './analytics'

const repo = (overrides = {}) => ({
  name: 'DebateAI',
  orgLogin: 'AOSSIE-Org',
  stargazers_count: 12,
  forks_count: 3,
  open_issues_count: 312,
  healthScore: 71,
  activityClassification: 'Active',
  language: 'TypeScript',
  pushed_at: '2026-10-01T12:00:00Z',
  ...overrides,
})

const openIssue = () => ({ state: 'open' })
const openPull = () => ({ state: 'open', pull_request: {} })

describe('buildReposCSV', () => {
  it('labels the combined column as open issues and pull requests', () => {
    const [header] = buildReposCSV([repo()]).split('\n')

    expect(header).toContain('Open Issues & PRs')
  })

  it('keeps GitHub’s combined count in the combined column', () => {
    const [, row] = buildReposCSV([repo()]).split('\n')

    expect(row.split(',')[4]).toBe('312')
  })

  it('fills the issue and pull request columns from audit data', () => {
    const csv = buildReposCSV([repo()], {
      'AOSSIE-Org/DebateAI': [
        ...Array.from({ length: 156 }, () => openIssue()),
        ...Array.from({ length: 156 }, () => openPull()),
      ],
    })
    const [, row] = csv.split('\n')

    expect(row.split(',')[5]).toBe('156')
    expect(row.split(',')[6]).toBe('156')
  })

  it('leaves the split columns empty when the repository has not been audited', () => {
    const [, row] = buildReposCSV([repo()]).split('\n')

    expect(row.split(',')[5]).toBe('')
    expect(row.split(',')[6]).toBe('')
  })

  it('does not borrow another organization’s audit data for a repository', () => {
    const csv = buildReposCSV([repo()], {
      'Other-Org/DebateAI': [openIssue(), openPull()],
    })
    const [, row] = csv.split('\n')

    expect(row.split(',')[5]).toBe('')
    expect(row.split(',')[6]).toBe('')
  })

  it('exports one row per repository', () => {
    const csv = buildReposCSV([repo(), repo({ name: 'PictoPy', open_issues_count: 7 })])

    expect(csv.split('\n')).toHaveLength(3)
  })
})
