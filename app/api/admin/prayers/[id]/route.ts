import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { status } = body as { status: 'expired' | 'deleted' }

  if (status !== 'expired' && status !== 'deleted') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { error: dbError } = await supabase
    .from('prayer_requests')
    .update({ status })
    .eq('id', id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
