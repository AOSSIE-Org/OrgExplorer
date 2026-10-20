import { describe, it, expect, vi, afterEach } from 'vitest'
import { exportReposCSV } from './analytics'

// GitHub's open_issues_count includes open pull requests, so the CSV column
// must say so rather than claiming to be issues only (#375).
describe('exportReposCSV', () => {
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL

  afterEach(() => {
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
    vi.restoreAllMocks()
  })

  it('labels the open_issues_count column as "Open Issues & PRs"', async () => {
    let blob
    URL.createObjectURL = vi.fn(b => { blob = b; return 'blob:test' })
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    exportReposCSV([{
      name: 'repo-a',
      orgLogin: 'org-a',
      stargazers_count: 1,
      forks_count: 0,
      open_issues_count: 4,
      healthScore: 50,
      activityClassification: 'Active',
      pushed_at: '2026-01-01T00:00:00Z',
    }])

    const [header, row] = (await blob.text()).split('\n')
    expect(header.split(',')[4]).toBe('Open Issues & PRs')
    expect(row.split(',')[4]).toBe('4')
  })
})
