import { describe, it, expect } from 'vitest'
import {
  isInvalidReportingRange,
  INVALID_REPORTING_RANGE_MESSAGE,
} from './reportingDateRange'

describe('isInvalidReportingRange', () => {
  it('returns false when either bound is empty (open-ended range)', () => {
    expect(isInvalidReportingRange('', '2026-08-10')).toBe(false)
    expect(isInvalidReportingRange('2026-08-20', '')).toBe(false)
    expect(isInvalidReportingRange('', '')).toBe(false)
  })

  it('returns false when start is on or before end', () => {
    expect(isInvalidReportingRange('2026-08-10', '2026-08-20')).toBe(false)
    expect(isInvalidReportingRange('2026-08-10', '2026-08-10')).toBe(false)
  })

  it('returns true when start is later than end', () => {
    expect(isInvalidReportingRange('2026-08-20', '2026-08-10')).toBe(true)
  })
})

describe('INVALID_REPORTING_RANGE_MESSAGE', () => {
  it('matches the expected contributor-profile copy', () => {
    expect(INVALID_REPORTING_RANGE_MESSAGE).toBe(
      'Invalid date range: Start date cannot be later than end date.'
    )
  })
})
