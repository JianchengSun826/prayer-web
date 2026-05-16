'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Gender } from '@/lib/types'
import { sendAdminNotificationEmail } from '@/lib/email'

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const last_name = formData.get('last_name')
  const first_name = formData.get('first_name')
  const gender = formData.get('gender')

  if (typeof last_name !== 'string' || last_name.trim().length === 0) {
    return { error: 'Last name is required' }
  }
  if (typeof first_name !== 'string' || first_name.trim().length === 0) {
    return { error: 'First name is required' }
  }
  if (gender !== 'brother' && gender !== 'sister') {
    return { error: 'Invalid gender' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ last_name: last_name.trim(), first_name: first_name.trim(), gender: gender as Gender })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/account')
  revalidatePath('/en/account')

  return { success: true }
}

export async function updatePasswordAction(formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password')
  if (typeof password !== 'string' || password.length < 6) {
    return { error: 'Password must be at least 6 characters' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { error: error.message }

  return { success: true }
}

export async function sendAdminMessageAction(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const content = formData.get('content')
  if (typeof content !== 'string' || content.trim().length === 0) {
    return { error: 'Message cannot be empty' }
  }
  if (content.length > 2000) {
    return { error: 'Message is too long (max 2000 characters)' }
  }

  const { error } = await supabase
    .from('admin_messages')
    .insert({ user_id: user.id, content: content.trim() })

  if (error) return { error: error.message }

  // Notify admin by email (fire-and-forget)
  const { data: profile } = await supabase
    .from('profiles')
    .select('last_name, first_name, gender')
    .eq('id', user.id)
    .single()

  if (profile) {
    const name = profile.gender === 'brother'
      ? `${profile.last_name}弟兄`
      : `${profile.last_name}姊妹`
    sendAdminNotificationEmail(name, content.trim()).catch(() => {})
  }

  return { success: true }
}
