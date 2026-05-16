import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

type AdminAuthError = { error: NextResponse; supabase: null; userId: null }
type AdminAuthSuccess = { error: null; supabase: SupabaseClient; userId: string }
type AdminAuthResult = AdminAuthError | AdminAuthSuccess

export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), supabase: null, userId: null }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return { error: NextResponse.json({ error: 'Internal Server Error' }, { status: 500 }), supabase: null, userId: null }
  }

  if (!profile || profile.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), supabase: null, userId: null }
  }

  return { error: null, supabase, userId: user.id }
}
