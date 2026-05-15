'use server'

import { createClient } from '@/lib/supabase/server'
import type { Gender } from '@/lib/types'

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const last_name = formData.get('last_name') as string
  const first_name = formData.get('first_name') as string
  const gender = formData.get('gender') as Gender

  const { error } = await supabase
    .from('profiles')
    .update({ last_name, first_name, gender })
    .eq('id', user.id)

  if (error) return { error: error.message }

  return { success: true }
}

export async function updatePasswordAction(formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { error: error.message }

  return { success: true }
}

export async function sendAdminMessageAction(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const content = formData.get('content') as string

  const { error } = await supabase
    .from('admin_messages')
    .insert({ user_id: user.id, content })

  if (error) return { error: error.message }

  return { success: true }
}
