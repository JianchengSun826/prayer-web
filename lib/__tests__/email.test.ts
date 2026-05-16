import { describe, it, expect } from 'vitest'
import {
  welcomeEmail,
  adminNotificationEmail,
  adminReplyEmail,
  expiryReminderEmail,
} from '../email'

describe('welcomeEmail', () => {
  it('includes the user name', () => {
    const html = welcomeEmail('王弟兄')
    expect(html).toContain('王弟兄')
  })
  it('returns a non-empty string', () => {
    expect(welcomeEmail('Test').length).toBeGreaterThan(10)
  })
})

describe('adminNotificationEmail', () => {
  it('includes sender name and message content', () => {
    const html = adminNotificationEmail('李姊妹', '请为我的家人祷告')
    expect(html).toContain('李姊妹')
    expect(html).toContain('请为我的家人祷告')
  })
})

describe('adminReplyEmail', () => {
  it('includes user name, reply content, and site URL', () => {
    const html = adminReplyEmail('张弟兄', '我们会为你祷告', 'https://prayer.example.com')
    expect(html).toContain('张弟兄')
    expect(html).toContain('我们会为你祷告')
    expect(html).toContain('https://prayer.example.com')
  })
})

describe('expiryReminderEmail', () => {
  it('includes user name, prayer preview, expiry date, and site URL', () => {
    const html = expiryReminderEmail('赵姊妹', '为工作上的挑战祷告', '2026-05-18', 'https://prayer.example.com')
    expect(html).toContain('赵姊妹')
    expect(html).toContain('为工作上的挑战祷告')
    expect(html).toContain('2026-05-18')
    expect(html).toContain('https://prayer.example.com')
  })
})
