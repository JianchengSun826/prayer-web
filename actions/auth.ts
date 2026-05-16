'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Gender } from '@/lib/types'
import { sendWelcomeEmail } from '@/lib/email'

export async function registerAction(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const last_name = formData.get('last_name') as string
  const first_name = formData.get('first_name') as string
  const gender = formData.get('gender') as Gender

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { last_name, first_name, gender },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/login`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Send welcome email (fire-and-forget — don't block registration on email failure)
  const displayName = gender === 'brother' ? `${last_name}弟兄` : `${last_name}姊妹`
  sendWelcomeEmail(email, displayName).catch(() => {})

  return { success: true }
}

export async function loginAction(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect('/')
}

export async function forgotPasswordAction(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
