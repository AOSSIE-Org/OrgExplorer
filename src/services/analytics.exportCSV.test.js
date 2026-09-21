import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  escapeCSVCell,
  formatCSVRow,
  exportReposCSV,
  exportContributorsCSV,
  exportTrendsCSV
} from './analytics'

describe('escapeCSVCell', () => {
  it('returns empty string for null and undefined', () => {
    expect(escapeCSVCell(null)).toBe('')
    expect(escapeCSVCell(undefined)).toBe('')
  })

  it('leaves simple text and positive numbers untouched', () => {
    expect(escapeCSVCell('hello')).toBe('hello')
    expect(escapeCSVCell(123)).toBe('123')
  })

  it('leaves negative numbers (type number) untouched', () => {
    expect(escapeCSVCell(-42)).toBe('-42')
  })

  it('neutralizes formula injection characters for string values', () => {
    expect(escapeCSVCell('-1E3')).toBe("'-1E3")
    expect(escapeCSVCell('=SUM(1,2)')).toBe('"\'=SUM(1,2)"')
    expect(escapeCSVCell('+100')).toBe("'+100")
    expect(escapeCSVCell('@admin')).toBe("'@admin")
    expect(escapeCSVCell('\tTab')).toBe("'\tTab")
  })

  it('escapes cells containing commas', () => {
    expect(escapeCSVCell('JavaScript, TypeScript')).toBe('"JavaScript, TypeScript"')
  })

  it('escapes cells containing double quotes', () => {
    expect(escapeCSVCell('Repo "Awesome"')).toBe('"Repo ""Awesome"""')
  })

  it('escapes cells containing newlines', () => {
    expect(escapeCSVCell('Line 1\nLine 2')).toBe('"Line 1\nLine 2"')
  })
})

describe('formatCSVRow', () => {
  it('formats a row into a properly escaped CSV string', () => {
    const row = ['OrgExplorer', 'AOSSIE, Inc.', 42, 'Hello "World"']
    expect(formatCSVRow(row)).toBe('OrgExplorer,"AOSSIE, Inc.",42,"Hello ""World"""')
  })
})

describe('CSV Integration Exports', () => {
  let blobContents = []

  beforeEach(() => {
    blobContents = []
    class MockBlob {
      constructor(content) {
        blobContents.push(content[0])
      }
    }
    vi.stubGlobal('Blob', MockBlob)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/dummy')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  it('exportReposCSV generates valid CSV content with CRLF row separators', () => {
    const repos = [
      {
        name: '-1E3-repo',
        orgLogin: 'facebook',
        stargazers_count: 100,
        forks_count: 20,
        open_issues_count: 5,
        healthScore: 85,
        activityClassification: 'Thriving',
        language: 'C++, Rust',
        pushed_at: '2026-09-20T00:00:00Z'
      }
    ]

    exportReposCSV(repos)

    expect(blobContents.length).toBe(1)
    const csv = blobContents[0]
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Repository,Org,Stars,Forks,Open Issues,Health Score,Activity Classification,Language,Last Active')
    expect(lines[1]).toBe("'-1E3-repo,facebook,100,20,5,85,Thriving,\"C++, Rust\",2026-09-20")
  })

  it('exportContributorsCSV generates valid CSV content with CRLF row separators', () => {
    const contributors = [
      {
        login: '@contributor',
        totalContribs: 50,
        repos: ['repo1', 'repo2'],
        orgs: ['org1'],
        lastActive: '2026-09-19T00:00:00Z',
        isConnector: true,
        isCrossOrg: false
      }
    ]

    exportContributorsCSV(contributors)

    expect(blobContents.length).toBe(1)
    const csv = blobContents[0]
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Login,Total Contributions,Repos,Orgs,Last Active,Connector,Cross-Org')
    expect(lines[1]).toBe("'@contributor,50,2,1,2026-09-19,true,false")
  })

  it('exportTrendsCSV generates valid CSV content with CRLF row separators', () => {
    const series = [
      {
        date: '2026-09',
        prs_created: 10,
        prs_merged: 8,
        prs_closed: 2,
        issues_created: 5,
        issues_closed: 4
      }
    ]

    exportTrendsCSV(series)

    expect(blobContents.length).toBe(1)
    const csv = blobContents[0]
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Date,PRs Created,PRs Merged,PRs Closed,Issues Created,Issues Closed')
    expect(lines[1]).toBe('2026-09,10,8,2,5,4')
  })
})
