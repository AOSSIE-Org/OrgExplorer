/**
 * ISO date strings (YYYY-MM-DD) compare lexicographically as chronological order.
 * Empty either side is treated as an open-ended (valid) range.
 */
export function isInvalidReportingRange(startDate, endDate) {
  if (!startDate || !endDate) return false
  return startDate > endDate
}

export const INVALID_REPORTING_RANGE_MESSAGE =
  'Invalid date range: Start date cannot be later than end date.'
