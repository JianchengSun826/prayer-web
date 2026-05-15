import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatDaysLeft, formatRelativeDate } from '../prayer-utils'

const FIXED_NOW = new Date('2026-05-15T12:00:00.000Z').getTime()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

const ms = (days: number) => days * 24 * 60 * 60 * 1000

describe('formatDaysLeft', () => {
  it('returns "5 天后到期" for 5 days in the future (zh)', () => {
    const expiresAt = new Date(FIXED_NOW + ms(5)).toISOString()
    expect(formatDaysLeft(expiresAt, 'zh')).toBe('5 天后到期')
  })

  it('returns "5 days left" for 5 days in the future (en)', () => {
    const expiresAt = new Date(FIXED_NOW + ms(5)).toISOString()
    expect(formatDaysLeft(expiresAt, 'en')).toBe('5 days left')
  })

  it('returns "1 day left" (singular) for 1 day in the future (en)', () => {
    const expiresAt = new Date(FIXED_NOW + ms(1)).toISOString()
    expect(formatDaysLeft(expiresAt, 'en')).toBe('1 day left')
  })

  it('returns "已归档" for a past date (zh)', () => {
    const expiresAt = new Date(FIXED_NOW - ms(1)).toISOString()
    expect(formatDaysLeft(expiresAt, 'zh')).toBe('已归档')
  })

  it('returns "Archived" for a past date (en)', () => {
    const expiresAt = new Date(FIXED_NOW - ms(1)).toISOString()
    expect(formatDaysLeft(expiresAt, 'en')).toBe('Archived')
  })
})

describe('formatRelativeDate', () => {
  it('returns "今天" for today (zh)', () => {
    expect(formatRelativeDate(new Date(FIXED_NOW).toISOString(), 'zh')).toBe('今天')
  })

  it('returns "Today" for today (en)', () => {
    expect(formatRelativeDate(new Date(FIXED_NOW).toISOString(), 'en')).toBe('Today')
  })

  it('returns "昨天" for yesterday (zh)', () => {
    expect(formatRelativeDate(new Date(FIXED_NOW - ms(1)).toISOString(), 'zh')).toBe('昨天')
  })

  it('returns "Yesterday" for yesterday (en)', () => {
    expect(formatRelativeDate(new Date(FIXED_NOW - ms(1)).toISOString(), 'en')).toBe('Yesterday')
  })

  it('returns "3 天前" for 3 days ago (zh)', () => {
    expect(formatRelativeDate(new Date(FIXED_NOW - ms(3)).toISOString(), 'zh')).toBe('3 天前')
  })

  it('returns "3 days ago" for 3 days ago (en)', () => {
    expect(formatRelativeDate(new Date(FIXED_NOW - ms(3)).toISOString(), 'en')).toBe('3 days ago')
  })
})
