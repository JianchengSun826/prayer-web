import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const read = searchParams.get('read') ?? 'all'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('admin_messages')
    .select('*, profiles(last_name, first_name, gender, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (read === 'unread') query = query.is('read_at', null)

  const { data: messages, count, error: dbError } = await query
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const { count: unreadCount } = await supabase
    .from('admin_messages')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null)

  return NextResponse.json({ messages: messages ?? [], total: count ?? 0, page, unreadCount: unreadCount ?? 0 })
}
