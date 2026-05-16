import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const { error, supabase, userId } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('profiles')
    .select('id, last_name, first_name, gender, role, email, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search) {
    query = query.or(`last_name.ilike.%${search}%,first_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data: users, count, error: dbError } = await query

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ users: users ?? [], total: count ?? 0, page, currentUserId: userId })
}
