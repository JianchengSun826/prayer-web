import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import SubmitForm from '@/components/submit/SubmitForm'

export default async function SubmitPage() {
  const supabase = await createClient()
  const t = await getTranslations('submit')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/submit')

  const [{ data: profile }, { data: categories }] = await Promise.all([
    supabase
      .from('profiles')
      .select('last_name, first_name, gender')
      .eq('id', user.id)
      .single(),
    supabase.from('categories').select('*').order('id'),
  ])

  if (!profile) redirect('/auth/login')

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-6 text-xl font-bold text-[#1a3a5c]">{t('title')}</h1>
        <SubmitForm categories={categories ?? []} profile={profile} />
      </div>
    </div>
  )
}
