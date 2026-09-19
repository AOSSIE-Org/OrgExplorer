import { describe, it, expect } from 'vitest'
import { escapeCSVCell, formatCSVRow } from './analytics'

describe('escapeCSVCell', () => {
  it('returns empty string for null and undefined', () => {
    expect(escapeCSVCell(null)).toBe('')
    expect(escapeCSVCell(undefined)).toBe('')
  })

  it('leaves simple text and numbers untouched', () => {
    expect(escapeCSVCell('hello')).toBe('hello')
    expect(escapeCSVCell(123)).toBe('123')
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
