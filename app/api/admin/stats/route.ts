import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const nowIso = new Date().toISOString()
  const tomorrowIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: activePrayers },
    { count: totalUsers },
    { count: unreadMessages },
    { count: expiringToday },
    { data: recentPrayers },
  ] = await Promise.all([
    supabase!.from('prayer_requests').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase!.from('profiles').select('*', { count: 'exact', head: true }),
    supabase!.from('admin_messages').select('*', { count: 'exact', head: true }).is('read_at', null),
    supabase!.from('prayer_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('expires_at', nowIso)
      .lte('expires_at', tomorrowIso),
    supabase!.from('prayer_requests').select('created_at').gte('created_at', sevenDaysAgo),
  ])

  // Build last-7-days daily counts for the dashboard bar chart
  const dailyCounts = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().slice(0, 10)
    const count = (recentPrayers ?? []).filter((p) => p.created_at.slice(0, 10) === dateStr).length
    return { date: dateStr, count }
  })

  return NextResponse.json({
    activePrayers: activePrayers ?? 0,
    totalUsers: totalUsers ?? 0,
    unreadMessages: unreadMessages ?? 0,
    expiringToday: expiringToday ?? 0,
    dailyCounts,
  })
}
