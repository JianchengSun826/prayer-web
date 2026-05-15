import { createClient } from '@/lib/supabase/server'
import { getTranslations, getLocale } from 'next-intl/server'
import Link from 'next/link'
import PrayerCard from '@/components/prayer/PrayerCard'
import CategorySidebar from '@/components/prayer/CategorySidebar'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const activeCategoryId = category ? parseInt(category) : null
  const locale = await getLocale() as 'zh' | 'en'
  const t = await getTranslations('home')

  const supabase = await createClient()

  // Fetch all active prayers for category counts
  const { data: allActive } = await supabase
    .from('prayer_requests')
    .select('category_id')
    .eq('status', 'active')

  const countMap: Record<number, number> = {}
  for (const p of allActive ?? []) {
    countMap[p.category_id] = (countMap[p.category_id] ?? 0) + 1
  }
  const totalCount = allActive?.length ?? 0

  // Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('id')

  const categoriesWithCount = (categories ?? []).map((cat) => ({
    ...cat,
    count: countMap[cat.id] ?? 0,
  }))

  // Fetch prayers (filtered if category selected)
  let query = supabase
    .from('prayer_requests')
    .select('*, profiles(last_name, first_name, gender), categories(name_zh, name_en, color)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (activeCategoryId) {
    query = query.eq('category_id', activeCategoryId)
  }

  const { data: prayers } = await query

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Hero */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#2d6a9f] to-[#4a90d9] px-6 py-8 text-center text-white">
        <h1 className="text-2xl font-bold">{t('hero')}</h1>
        <p className="mt-1 text-sm text-white/80">{t('heroSub')}</p>
        <Link
          href="/submit"
          className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#2d6a9f] hover:bg-blue-50 transition-colors"
        >
          {t('submitBtn')}
        </Link>
      </div>

      {/* Content */}
      <div className="flex gap-6">
        <CategorySidebar
          categories={categoriesWithCount}
          totalCount={totalCount}
          activeCategoryId={activeCategoryId}
        />

        <div className="flex-1 min-w-0 space-y-4">
          {(prayers ?? []).length === 0 ? (
            <p className="py-16 text-center text-gray-400">
              {locale === 'zh' ? '暂无代祷事项' : 'No prayer requests yet'}
            </p>
          ) : (
            (prayers ?? []).map((prayer) => (
              <PrayerCard key={prayer.id} prayer={prayer} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
