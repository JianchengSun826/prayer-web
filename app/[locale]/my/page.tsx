import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import MyPrayerList from '@/components/my/MyPrayerList'

export default async function MyPage() {
  const supabase = await createClient()
  const t = await getTranslations('my')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/my')

  const { data: prayers } = await supabase
    .from('prayer_requests')
    .select('*, categories(name_zh, name_en, color)')
    .eq('user_id', user.id)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-[#1a3a5c]">{t('title')}</h1>
      <MyPrayerList prayers={prayers ?? []} />
    </div>
  )
}
