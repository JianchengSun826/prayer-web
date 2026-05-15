'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { formatDisplayName } from '@/lib/display-name'
import { formatDaysLeft, formatRelativeDate } from '@/lib/prayer-utils'
import type { PrayerRequest } from '@/lib/types'

interface Props {
  prayer: PrayerRequest
}

const COLLAPSE_THRESHOLD = 120

export default function PrayerCard({ prayer }: Props) {
  const t = useTranslations('home')
  const locale = useLocale() as 'zh' | 'en'
  const [expanded, setExpanded] = useState(false)

  const posterName = prayer.profiles
    ? formatDisplayName(prayer.profiles, locale)
    : '—'

  const categoryName = prayer.categories
    ? (locale === 'zh' ? prayer.categories.name_zh : prayer.categories.name_en)
    : ''

  const daysLeft = formatDaysLeft(prayer.expires_at, locale)
  const relativeDate = formatRelativeDate(prayer.created_at, locale)
  const isLong = prayer.content.length > COLLAPSE_THRESHOLD

  return (
    <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <p
        className={`text-sm text-gray-800 leading-relaxed whitespace-pre-wrap ${
          !expanded && isLong ? 'line-clamp-3' : ''
        }`}
      >
        {prayer.content}
      </p>

      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs text-blue-600 hover:underline"
        >
          {expanded ? t('collapseCard') : t('expandCard')}
        </button>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        <span className="font-medium text-gray-700">{posterName}</span>
        {prayer.categories && (
          <span
            className="rounded-full px-2 py-0.5 text-white"
            style={{ backgroundColor: prayer.categories.color }}
          >
            {categoryName}
          </span>
        )}
        <span>{relativeDate}</span>
        <span className="text-gray-400">{daysLeft}</span>
        <Link
          href={`/prayer/${prayer.id}`}
          className="ml-auto text-blue-500 hover:underline"
        >
          {locale === 'zh' ? '查看详情 →' : 'View →'}
        </Link>
      </div>
    </article>
  )
}
