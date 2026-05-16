import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase, userId } = await requireAdmin()
  if (error) return error

  const { id } = await params

  // Prevent admin from revoking their own admin role
  if (id === userId) {
    return NextResponse.json({ error: 'Cannot modify your own role' }, { status: 400 })
  }

  const body = await request.json()
  const { role } = body as { role: 'admin' | 'user' }

  if (role !== 'admin' && role !== 'user') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const { error: dbError } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
