import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import AccountForm from '@/components/account/AccountForm'
import ContactAdminForm from '@/components/account/ContactAdminForm'

export default async function AccountPage() {
  const supabase = await createClient()
  const t = await getTranslations('account')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/account')

  const { data: profile } = await supabase
    .from('profiles')
    .select('last_name, first_name, gender')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-[#1a3a5c]">{t('title')}</h1>
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <AccountForm profile={profile} email={user.email ?? ''} />
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <h2 className="mb-4 text-base font-semibold text-gray-900">{t('contactAdmin')}</h2>
          <ContactAdminForm />
        </div>
      </div>
    </div>
  )
}
