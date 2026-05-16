import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

interface AdminAuthResult {
  error: NextResponse | null
  supabase: SupabaseClient | null
  userId: string | null
}

export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), supabase: null, userId: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), supabase: null, userId: null }
  }

  return { error: null, supabase, userId: user.id }
}
