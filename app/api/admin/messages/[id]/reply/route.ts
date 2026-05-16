import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sendAdminReplyEmail } from '@/lib/email'
import { formatDisplayName } from '@/lib/display-name'
import type { Gender } from '@/lib/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { content } = body as { content: string }

  if (typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Reply content is required' }, { status: 400 })
  }

  // Fetch the message with sender profile to get email
  const { data: message, error: fetchError } = await supabase
    .from('admin_messages')
    .select('*, profiles(last_name, first_name, gender, email)')
    .eq('id', id)
    .single()

  if (fetchError || !message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  }

  // Mark as read
  await supabase
    .from('admin_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)

  // Send reply email if we have the user's email
  const profile = message.profiles as { last_name: string; first_name: string; gender: string; email?: string | null } | null
  if (profile?.email) {
    const displayName = formatDisplayName(
      { last_name: profile.last_name, first_name: profile.first_name, gender: profile.gender as Gender },
      'zh'
    )
    await sendAdminReplyEmail(profile.email, displayName, content.trim())
  }

  return NextResponse.json({ success: true })
}
