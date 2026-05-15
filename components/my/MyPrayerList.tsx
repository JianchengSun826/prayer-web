'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { deletePrayerAction } from '@/actions/prayer'
import { formatRelativeDate } from '@/lib/prayer-utils'
import type { PrayerRequest } from '@/lib/types'

interface Props {
  prayers: PrayerRequest[]
}

export default function MyPrayerList({ prayers }: Props) {
  const t = useTranslations('my')
  const locale = useLocale() as 'zh' | 'en'
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [items, setItems] = useState(prayers)

  async function handleDelete(id: string) {
    if (!confirm(t('deleteConfirm'))) return
    setDeletingId(id)
    const result = await deletePrayerAction(id)
    setDeletingId(null)
    if (!result?.error) {
      setItems((prev) => prev.filter((p) => p.id !== id))
    }
  }

  if (items.length === 0) {
    return (
      <p className="py-16 text-center text-gray-400">{t('noItems')}</p>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((prayer) => (
        <div
          key={prayer.id}
          className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
            {prayer.content}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <div className="flex flex-wrap items-center gap-2">
              {prayer.categories && (
                <span
                  className="rounded-full px-2 py-0.5 text-white"
                  style={{ backgroundColor: prayer.categories.color }}
                >
                  {locale === 'zh' ? prayer.categories.name_zh : prayer.categories.name_en}
                </span>
              )}
              <span>{formatRelativeDate(prayer.created_at, locale)}</span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  prayer.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {prayer.status === 'active' ? t('active') : t('expired')}
              </span>
            </div>

            {prayer.status === 'active' && (
              <button
                onClick={() => handleDelete(prayer.id)}
                disabled={deletingId === prayer.id}
                className="text-red-500 hover:text-red-700 disabled:opacity-40"
              >
                {t('delete')}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
