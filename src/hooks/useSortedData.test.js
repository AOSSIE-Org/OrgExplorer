import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAdvancedMetrics } from './useSortedData'

describe('useAdvancedMetrics', () => {
  it('averages over a valid PR and excludes one with an invalid merged_at from the average, but still counts it as merged', () => {
    const pulls = [
      { merged_at: '2024-01-01T10:00:00Z', created_at: '2024-01-01T00:00:00Z' }, // 10h, valid
      { merged_at: 'not-a-date', created_at: '2024-01-02T00:00:00Z' }, // invalid
    ]
    const { result } = renderHook(() => useAdvancedMetrics(pulls))

    expect(result.current.avgMergeHours).toBe(10)
    expect(result.current.merged).toBe(2)
    expect(result.current.mergeTimeSampleSize).toBe(1)
  })

  it('excludes a PR whose merged_at is earlier than its created_at from the average, but still counts it as merged', () => {
    const pulls = [
      { merged_at: '2024-01-01T20:00:00Z', created_at: '2024-01-01T00:00:00Z' }, // 20h, valid
      { merged_at: '2024-01-01T00:00:00Z', created_at: '2024-01-02T00:00:00Z' }, // negative duration
    ]
    const { result } = renderHook(() => useAdvancedMetrics(pulls))

    expect(result.current.avgMergeHours).toBe(20)
    expect(result.current.merged).toBe(2)
    expect(result.current.mergeTimeSampleSize).toBe(1)
  })

  it('returns a finite 0 when every merged PR has an invalid duration', () => {
    const pulls = [
      { merged_at: 'not-a-date', created_at: '2024-01-01T00:00:00Z' },
      { merged_at: '2024-01-01T00:00:00Z', created_at: '2024-01-02T00:00:00Z' }, // negative duration
    ]
    const { result } = renderHook(() => useAdvancedMetrics(pulls))

    expect(result.current.avgMergeHours).toBe(0)
    expect(Number.isFinite(result.current.avgMergeHours)).toBe(true)
    expect(result.current.merged).toBe(2)
    expect(result.current.mergeTimeSampleSize).toBe(0)
  })

  it('leaves the average unchanged when every merged PR has a valid duration', () => {
    const pulls = [
      { merged_at: '2024-01-01T10:00:00Z', created_at: '2024-01-01T00:00:00Z' }, // 10h
      { merged_at: '2024-01-01T20:00:00Z', created_at: '2024-01-01T00:00:00Z' }, // 20h
    ]
    const { result } = renderHook(() => useAdvancedMetrics(pulls))

    expect(result.current.avgMergeHours).toBe(15)
    expect(result.current.merged).toBe(2)
    expect(result.current.mergeTimeSampleSize).toBe(2)
  })

  it('returns avgMergeHours of 0 for empty input', () => {
    const { result } = renderHook(() => useAdvancedMetrics([]))

    expect(result.current.avgMergeHours).toBe(0)
    expect(result.current.merged).toBe(0)
    expect(result.current.mergeTimeSampleSize).toBe(0)
  })

  it('excludes a merged PR with created_at: null from the average instead of treating it as a huge epoch duration, but still counts it as merged', () => {
    const pulls = [
      { merged_at: '2024-01-01T10:00:00Z', created_at: '2024-01-01T00:00:00Z' }, // 10h, valid
      { merged_at: '2024-01-01T10:00:00Z', created_at: null },
    ]
    const { result } = renderHook(() => useAdvancedMetrics(pulls))

    expect(result.current.avgMergeHours).toBe(10)
    expect(result.current.merged).toBe(2)
    expect(result.current.mergeTimeSampleSize).toBe(1)
  })

  it('returns a finite 0 when every merged PR has created_at: null', () => {
    const pulls = [
      { merged_at: '2024-01-01T10:00:00Z', created_at: null },
      { merged_at: '2024-01-02T10:00:00Z', created_at: null },
    ]
    const { result } = renderHook(() => useAdvancedMetrics(pulls))

    expect(result.current.avgMergeHours).toBe(0)
    expect(Number.isFinite(result.current.avgMergeHours)).toBe(true)
    expect(result.current.merged).toBe(2)
    expect(result.current.mergeTimeSampleSize).toBe(0)
  })

  it('averages a 0-hour PR and a 10-hour PR, counting both in the sample size', () => {
    const pulls = [
      { merged_at: '2024-01-01T00:00:00Z', created_at: '2024-01-01T00:00:00Z' }, // 0h
      { merged_at: '2024-01-01T10:00:00Z', created_at: '2024-01-01T00:00:00Z' }, // 10h
    ]
    const { result } = renderHook(() => useAdvancedMetrics(pulls))

    expect(result.current.avgMergeHours).toBe(5)
    expect(result.current.mergeTimeSampleSize).toBe(2)
  })
})
