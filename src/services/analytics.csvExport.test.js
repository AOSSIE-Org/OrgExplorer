import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  exportReposCSV,
  exportContributorsCSV,
  exportTrendsCSV,
} from './analytics'

let downloadedContent

beforeEach(() => {
  downloadedContent = ''

  vi.stubGlobal('Blob', class MockBlob {
    constructor(parts, options) {
      this.content = parts.join('')
      this.type = options?.type
    }
  })

  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(blob => {
      downloadedContent = blob.content
      return 'blob:mock'
    }),
    revokeObjectURL: vi.fn(),
  })

  vi.spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => { })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('CSV exports', () => {
  it('neutralizes formula-like repository names', () => {
    exportReposCSV([{
      name: '=1+1',
      orgLogin: 'example-org',
      stargazers_count: 10,
      forks_count: 2,
      open_issues_count: 1,
      healthScore: 80,
      activityClassification: 'Active',
      language: 'JavaScript',
      pushed_at: '2026-10-22T00:00:00Z',
    }])

    expect(downloadedContent).toContain("'=1+1,example-org")
  })

  it('neutralizes formula-like contributor logins', () => {
    exportContributorsCSV([{
      login: '@SUM(1,2)',
      totalContribs: 10,
      repos: [],
      orgs: [],
      lastActive: null,
      isConnector: false,
      isCrossOrg: false,
    }])

    expect(downloadedContent).toContain('"\'@SUM(1,2)"')
  })

  it('neutralizes formula-like trend dates', () => {
    exportTrendsCSV([{
      date: '=1+1',
      prs_created: 1,
      prs_merged: 0,
      prs_closed: 0,
      issues_created: 2,
      issues_closed: 1,
    }])

    expect(downloadedContent).toContain("'=1+1,1,0,0,2,1")
  })

  it('escapes commas, quotes and newlines in CSV fields', () => {
    exportReposCSV([{
      name: 'repo, "example"\nsecond line',
      orgLogin: 'example-org',
      stargazers_count: 10,
      forks_count: 2,
      open_issues_count: 1,
      healthScore: 80,
      activityClassification: 'Active',
      language: 'JavaScript',
      pushed_at: '2026-10-22T00:00:00Z',
    }])

    expect(downloadedContent).toContain('"repo, ""example""\nsecond line"')
  })

  it('preserves ordinary text and numeric metrics', () => {
    exportReposCSV([{
      name: 'orgexplorer',
      orgLogin: 'AOSSIE-Org',
      stargazers_count: 42,
      forks_count: 5,
      open_issues_count: 3,
      healthScore: 90,
      activityClassification: 'Active',
      language: 'JavaScript',
      pushed_at: '2026-10-22T00:00:00Z',
    }])

    expect(downloadedContent).toContain(
      'orgexplorer,AOSSIE-Org,42,5,3,90,Active,JavaScript,2026-10-22',
    )
  })

  it.each(['=1+1', '+1+1', '-1+1', '@SUM(1,2)'])(
    'neutralizes formula prefix %s',
    prefix => {
      exportReposCSV([{
        name: prefix,
        orgLogin: 'example-org',
        stargazers_count: 10,
        forks_count: 2,
        open_issues_count: 1,
        healthScore: 80,
        activityClassification: 'Active',
        language: 'JavaScript',
        pushed_at: '2026-10-22T00:00:00Z',
      }])

      expect(downloadedContent).toContain(`'${prefix}`)
    },
  )

  it('neutralizes formulas preceded by whitespace or control characters', () => {
    for (const name of ['  =1+1', '\t=1+1', '\n=1+1']) {
      exportReposCSV([{
        name,
        orgLogin: 'example-org',
        stargazers_count: 10,
        forks_count: 2,
        open_issues_count: 1,
        healthScore: 80,
        activityClassification: 'Active',
        language: 'JavaScript',
        pushed_at: '2026-10-22T00:00:00Z',
      }])

      expect(downloadedContent).toContain(`'${name}`)
    }
  })

  it('neutralizes formula-like organization names as well as repository names', () => {
    exportReposCSV([{
      name: 'normal-repo',
      orgLogin: '=1+1',
      stargazers_count: 10,
      forks_count: 2,
      open_issues_count: 1,
      healthScore: 80,
      activityClassification: 'Active',
      language: 'JavaScript',
      pushed_at: '2026-10-22T00:00:00Z',
    }])

    expect(downloadedContent).toContain("normal-repo,'=1+1")
  })

})
