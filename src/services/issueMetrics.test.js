import { describe, it, expect } from 'vitest'
import {
  OPEN_BACKLOG_LABEL,
  computeOpenCounts,
  describeOpenCounts,
  isPullRequestItem,
  splitIssueItems,
} from './issueMetrics'

const issue = (state = 'open') => ({ number: 1, state })
const pull = (state = 'open') => ({ number: 2, state, pull_request: { url: 'https://api.github.com/pulls/2' } })

describe('isPullRequestItem', () => {
  it('detects a pull request by its pull_request key', () => {
    expect(isPullRequestItem(pull())).toBe(true)
  })

  it('treats a plain issue as not a pull request', () => {
    expect(isPullRequestItem(issue())).toBe(false)
  })

  it('returns false for missing or malformed items', () => {
    expect(isPullRequestItem(null)).toBe(false)
    expect(isPullRequestItem(undefined)).toBe(false)
    expect(isPullRequestItem({})).toBe(false)
  })
})

describe('splitIssueItems', () => {
  it('separates issues from pull requests', () => {
    const { issues, pulls } = splitIssueItems([
      issue(), pull(), issue('closed'), pull('closed'),
    ])

    expect(issues).toHaveLength(2)
    expect(pulls).toHaveLength(2)
  })

  it('returns empty lists for a missing or non-array payload', () => {
    expect(splitIssueItems(undefined)).toEqual({ issues: [], pulls: [] })
    expect(splitIssueItems(null)).toEqual({ issues: [], pulls: [] })
    expect(splitIssueItems({})).toEqual({ issues: [], pulls: [] })
  })
})

describe('computeOpenCounts', () => {
  it('reports only the combined count when the repository has not been audited', () => {
    expect(computeOpenCounts({ open_issues_count: 312 }, undefined)).toEqual({
      combined: 312,
      openIssues: null,
      openPulls: null,
      exact: false,
    })
  })

  it('splits the combined count exactly once the audit has fetched the repository', () => {
    const counts = computeOpenCounts({ open_issues_count: 4 }, [
      issue('open'), issue('open'), pull('open'), pull('open'), issue('closed'), pull('closed'),
    ])

    expect(counts).toEqual({ combined: 4, openIssues: 2, openPulls: 2, exact: true })
  })

  it('marks the split as inexact when the audit payload does not add up to the combined count', () => {
    const counts = computeOpenCounts({ open_issues_count: 10 }, [issue('open'), pull('open')])

    expect(counts.openIssues).toBe(1)
    expect(counts.openPulls).toBe(1)
    expect(counts.exact).toBe(false)
  })

  it('treats an empty audit payload for a repository with no open work as exact', () => {
    expect(computeOpenCounts({ open_issues_count: 0 }, [])).toEqual({
      combined: 0,
      openIssues: 0,
      openPulls: 0,
      exact: true,
    })
  })

  it('does not count closed issues or closed pull requests as open', () => {
    const counts = computeOpenCounts({ open_issues_count: 1 }, [
      issue('closed'), issue('closed'), pull('closed'), pull('open'),
    ])

    expect(counts.openIssues).toBe(0)
    expect(counts.openPulls).toBe(1)
    expect(counts.exact).toBe(true)
  })

  it('treats a missing open_issues_count as zero', () => {
    expect(computeOpenCounts({}, undefined).combined).toBe(0)
    expect(computeOpenCounts(undefined, undefined).combined).toBe(0)
  })
})

describe('describeOpenCounts', () => {
  it('returns an empty description when there is nothing to describe', () => {
    expect(describeOpenCounts(undefined)).toBe('')
    expect(describeOpenCounts(null)).toBe('')
  })

  it('explains that the count is combined when the repository has not been audited', () => {
    const text = describeOpenCounts(computeOpenCounts({ open_issues_count: 312 }, undefined))

    expect(text).toContain('312')
    expect(text).toContain('combined')
  })

  it('reports the exact split when it is known', () => {
    const counts = computeOpenCounts({ open_issues_count: 312 }, [
      ...Array.from({ length: 156 }, () => issue('open')),
      ...Array.from({ length: 156 }, () => pull('open')),
    ])
    const text = describeOpenCounts(counts)

    expect(text).toContain('156 open issues')
    expect(text).toContain('156 open pull requests')
  })

  it('flags partial audit data instead of presenting it as exact', () => {
    const text = describeOpenCounts(computeOpenCounts({ open_issues_count: 10 }, [issue('open')]))

    expect(text).toContain('partial')
  })
})

describe('OPEN_BACKLOG_LABEL', () => {
  it('names both kinds of open work so the combined count is never read as issues alone', () => {
    expect(OPEN_BACKLOG_LABEL).toBe('Open Issues & PRs')
  })
})
