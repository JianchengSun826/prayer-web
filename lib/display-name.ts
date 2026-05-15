import type { Profile } from './types'

type ProfileSubset = Pick<Profile, 'last_name' | 'first_name' | 'gender'>

export function formatDisplayName(
  profile: ProfileSubset,
  locale: 'zh' | 'en'
): string {
  if (locale === 'zh') {
    return profile.gender === 'brother'
      ? `${profile.last_name}弟兄`
      : `${profile.last_name}姊妹`
  }
  return profile.gender === 'brother'
    ? `Bro. ${profile.first_name}`
    : `Sis. ${profile.first_name}`
}
