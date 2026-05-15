import { describe, it, expect } from 'vitest'
import { formatDisplayName } from '../display-name'
import type { Profile } from '../types'

const brother: Pick<Profile, 'last_name' | 'first_name' | 'gender'> = {
  last_name: '王',
  first_name: 'James',
  gender: 'brother',
}

const sister: Pick<Profile, 'last_name' | 'first_name' | 'gender'> = {
  last_name: '李',
  first_name: 'Mary',
  gender: 'sister',
}

describe('formatDisplayName', () => {
  it('returns 姓+弟兄 in Chinese for brother', () => {
    expect(formatDisplayName(brother, 'zh')).toBe('王弟兄')
  })

  it('returns 姓+姊妹 in Chinese for sister', () => {
    expect(formatDisplayName(sister, 'zh')).toBe('李姊妹')
  })

  it('returns Bro. + first_name in English for brother', () => {
    expect(formatDisplayName(brother, 'en')).toBe('Bro. James')
  })

  it('returns Sis. + first_name in English for sister', () => {
    expect(formatDisplayName(sister, 'en')).toBe('Sis. Mary')
  })
})
