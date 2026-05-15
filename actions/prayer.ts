'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createPrayerAction(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const content = formData.get('content') as string
  const category_id = parseInt(formData.get('category_id') as string)

  const { error } = await supabase
    .from('prayer_requests')
    .insert({ user_id: user.id, content, category_id })

  if (error) return { error: error.message }

  redirect('/my')
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
