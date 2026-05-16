import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/')

  const { count } = await supabase
    .from('admin_messages')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null)

  return (
    <div className="flex min-h-screen">
      <AdminSidebar unreadCount={count ?? 0} />
      <main className="flex-1 bg-gray-50 p-6">{children}</main>
    </div>
  )
}
