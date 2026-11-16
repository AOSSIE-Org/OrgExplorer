import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  escapeCSVField,
  formatCSV,
  exportReposCSV,
  exportContributorsCSV,
  exportTrendsCSV,
} from './analytics'

describe('escapeCSVField', () => {
  it('returns plain text unchanged', () => {
    expect(escapeCSVField('hello')).toBe('hello')
    expect(escapeCSVField('OrgExplorer')).toBe('OrgExplorer')
  })

  it('wraps fields containing commas in quotes', () => {
    expect(escapeCSVField('AOSSIE, Inc.')).toBe('"AOSSIE, Inc."')
    expect(escapeCSVField('one,two,three')).toBe('"one,two,three"')
  })

  it('escapes quotes by doubling them and wrapping in quotes', () => {
    expect(escapeCSVField('say "hello"')).toBe('"say ""hello"""')
  })

  it('wraps fields containing newlines in quotes', () => {
    expect(escapeCSVField("line1\nline2")).toBe('"line1\nline2"')
    expect(escapeCSVField("line1\r\nline2")).toBe('"line1\r\nline2"')
  })

  it('handles null and undefined as empty strings', () => {
    expect(escapeCSVField(null)).toBe('')
    expect(escapeCSVField(undefined)).toBe('')
  })

  it('handles numbers and booleans correctly', () => {
    expect(escapeCSVField(123)).toBe('123')
    expect(escapeCSVField(0)).toBe('0')
    expect(escapeCSVField(true)).toBe('true')
    expect(escapeCSVField(false)).toBe('false')
  })
})

describe('formatCSV', () => {
  it('formats header and rows into properly escaped CSV string', () => {
    const header = ['Repo', 'Description', 'Stars']
    const rows = [
      ['OrgExplorer', 'Dashboard, analytics', 150],
      ['Special"App"', 'Normal description', 42],
    ]

    const expected = [
      'Repo,Description,Stars',
      'OrgExplorer,"Dashboard, analytics",150',
      '"Special""App""",Normal description,42',
    ].join('\n')

    expect(formatCSV(header, rows)).toBe(expected)
  })
})

describe('CSV export functions', () => {
  let createdElement
  let clicked
  let appendedUrl

  beforeEach(() => {
    clicked = false
    createdElement = {
      click: vi.fn(() => { clicked = true }),
      download: '',
      href: '',
    }

    vi.spyOn(document, 'createElement').mockReturnValue(createdElement)
    vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
      appendedUrl = 'blob:test-url'
      return appendedUrl
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exportReposCSV creates download with proper filename and escapes repo details', () => {
    const repos = [
      {
        name: 'test,repo',
        orgLogin: 'AOSSIE',
        stargazers_count: 10,
        forks_count: 5,
        open_issues_count: 2,
        healthScore: 80,
        activityClassification: 'Thriving',
        language: 'JavaScript',
        pushed_at: '2026-01-15T00:00:00Z',
      },
    ]

    exportReposCSV(repos)

    expect(createdElement.download).toBe('orgexplorer-repos.csv')
    expect(createdElement.click).toHaveBeenCalledTimes(1)
  })

  it('exportContributorsCSV creates download with proper filename', () => {
    const contributors = [
      {
        login: 'contributor,one',
        totalContribs: 100,
        repos: [{ name: 'r1' }],
        orgs: ['org1'],
        lastActive: '2026-01-15T00:00:00Z',
        isConnector: true,
        isCrossOrg: false,
      },
    ]

    exportContributorsCSV(contributors)

    expect(createdElement.download).toBe('orgexplorer-contributors.csv')
    expect(createdElement.click).toHaveBeenCalledTimes(1)
  })

  it('exportTrendsCSV creates download with proper filename', () => {
    const series = [
      {
        date: '2026-01',
        prs_created: 5,
        prs_merged: 4,
        prs_closed: 1,
        issues_created: 10,
        issues_closed: 8,
      },
    ]

    exportTrendsCSV(series)

    expect(createdElement.download).toBe('orgexplorer-trends.csv')
    expect(createdElement.click).toHaveBeenCalledTimes(1)
  })
})
