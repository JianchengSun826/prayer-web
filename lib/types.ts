export type Gender = 'brother' | 'sister'
export type UserRole = 'user' | 'admin'
export type PrayerStatus = 'active' | 'expired' | 'deleted'
export type NotificationType = 'expiry_reminder' | 'new_admin_message'

export interface Profile {
  id: string
  last_name: string
  first_name: string
  gender: Gender
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Category {
  id: number
  name_zh: string
  name_en: string
  color: string
}

export interface PrayerRequest {
  id: string
  user_id: string
  category_id: number
  content: string
  status: PrayerStatus
  expires_at: string
  created_at: string
  // joined
  profiles?: Pick<Profile, 'last_name' | 'first_name' | 'gender'>
  categories?: Pick<Category, 'name_zh' | 'name_en' | 'color'>
}

export interface AdminMessage {
  id: string
  user_id: string
  content: string
  read_at: string | null
  created_at: string
  profiles?: Pick<Profile, 'last_name' | 'first_name' | 'gender'>
}
