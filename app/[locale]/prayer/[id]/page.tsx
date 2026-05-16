import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDisplayName } from '@/lib/display-name'
import { formatDaysLeft, formatRelativeDate } from '@/lib/prayer-utils'
import ContactAdminForm from '@/components/account/ContactAdminForm'

export default async function PrayerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale: localeParam, id } = await params
  const locale = localeParam as 'zh' | 'en'
  const homeHref = locale === 'en' ? '/en' : '/'
  const t = await getTranslations('detail')

  const supabase = await createClient()

  const { data: prayer } = await supabase
    .from('prayer_requests')
    .select('*, profiles(last_name, first_name, gender), categories(name_zh, name_en, color)')
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (!prayer) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  const posterName = prayer.profiles
    ? formatDisplayName(prayer.profiles, locale)
    : '—'

  const categoryName = prayer.categories
    ? (locale === 'zh' ? prayer.categories.name_zh : prayer.categories.name_en)
    : ''

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={homeHref} className="mb-6 block text-sm text-blue-600 hover:underline">
        {t('back')}
      </Link>

      <article className="rounded-2xl bg-white p-6 shadow-md">
        <p className="leading-relaxed text-gray-800 whitespace-pre-wrap">{prayer.content}</p>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span className="font-medium text-gray-700">{posterName}</span>
          {prayer.categories && (
            <span
              className="rounded-full px-2 py-0.5 text-white text-xs"
              style={{ backgroundColor: prayer.categories.color }}
            >
              {categoryName}
            </span>
          )}
          <span>{formatRelativeDate(prayer.created_at, locale)}</span>
          <span className="text-gray-400">{formatDaysLeft(prayer.expires_at, locale)}</span>
        </div>
      </article>

      {user && (
        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">{t('contactAdmin')}</h2>
          <ContactAdminForm />
        </section>
      )}
    </div>
  )
}
