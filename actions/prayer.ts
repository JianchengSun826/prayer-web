'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'

export async function createPrayerAction(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const content = formData.get('content')
  const category_id_raw = formData.get('category_id')

  if (typeof content !== 'string' || content.trim().length === 0) {
    return { error: 'Content is required' }
  }
  if (typeof category_id_raw !== 'string' || isNaN(parseInt(category_id_raw))) {
    return { error: 'Category is required' }
  }

  const category_id = parseInt(category_id_raw)

  const { error } = await supabase
    .from('prayer_requests')
    .insert({ user_id: user.id, content: content.trim(), category_id })

  if (error) return { error: error.message }

  const locale = await getLocale()
  redirect(locale === 'en' ? '/en/my' : '/my')
}

export async function deletePrayerAction(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('prayer_requests')
    .update({ status: 'deleted' })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  return { success: true }
}
