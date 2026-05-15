'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import type { Category } from '@/lib/types'

interface CategoryWithCount extends Category {
  count: number
}

interface Props {
  categories: CategoryWithCount[]
  totalCount: number
  activeCategoryId: number | null
}

export default function CategorySidebar({ categories, totalCount, activeCategoryId }: Props) {
  const t = useTranslations('home')
  const locale = useLocale() as 'zh' | 'en'
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function select(id: number | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (id === null) {
      params.delete('category')
    } else {
      params.set('category', String(id))
    }
    const query = params.toString()
    router.replace(`${pathname}${query ? `?${query}` : ''}`)
  }

  const btnClass = (active: boolean) =>
    `w-full text-left rounded-lg px-3 py-2 text-sm flex justify-between items-center gap-2 transition-colors ${
      active
        ? 'bg-blue-50 text-blue-700 font-semibold'
        : 'text-gray-700 hover:bg-gray-100'
    }`

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-44 shrink-0">
        <nav className="space-y-1 sticky top-4">
          <button onClick={() => select(null)} className={btnClass(activeCategoryId === null)}>
            <span>{t('allCategories')}</span>
            <span className="text-xs text-gray-400 shrink-0">{totalCount}</span>
          </button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => select(cat.id)} className={btnClass(activeCategoryId === cat.id)}>
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="truncate">{locale === 'zh' ? cat.name_zh : cat.name_en}</span>
              </span>
              <span className="text-xs text-gray-400 shrink-0">{cat.count}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile horizontal tabs */}
      <div className="md:hidden flex overflow-x-auto gap-2 pb-2 mb-2 -mx-4 px-4">
        <button
          onClick={() => select(null)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${
            activeCategoryId === null
              ? 'bg-[#2d6a9f] text-white font-semibold'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {t('allCategories')}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => select(cat.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${
              activeCategoryId === cat.id
                ? 'text-white font-semibold'
                : 'bg-gray-100 text-gray-700'
            }`}
            style={activeCategoryId === cat.id ? { backgroundColor: cat.color } : {}}
          >
            {locale === 'zh' ? cat.name_zh : cat.name_en}
          </button>
        ))}
      </div>
    </>
  )
}
