import { describe, expect, it } from 'vitest'
import { formatBytes, formatRelativeDate, pluralize } from './format'

describe('formatBytes', () => {
  it('picks a readable unit', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(9_000)).toBe('9 KB')
    expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB')
  })
})

describe('formatRelativeDate', () => {
  const now = new Date(2026, 10, 22, 18, 0) // 22 Nov 2026, 18:00 local time

  it('says Today and Yesterday for recent dates', () => {
    expect(formatRelativeDate(new Date(2026, 10, 22, 9, 30).toISOString(), now)).toBe('Today')
    expect(formatRelativeDate(new Date(2026, 10, 21, 23, 59).toISOString(), now)).toBe('Yesterday')
  })

  it('shows the full date for older ones', () => {
    expect(formatRelativeDate(new Date(2026, 10, 20, 12, 0).toISOString(), now)).toBe('20 Nov 2026')
  })
})

describe('pluralize', () => {
  it('adds an s except for one', () => {
    expect(pluralize(1, 'chunk')).toBe('1 chunk')
    expect(pluralize(0, 'chunk')).toBe('0 chunks')
    expect(pluralize(4, 'chunk')).toBe('4 chunks')
  })
})
