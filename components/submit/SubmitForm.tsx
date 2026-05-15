'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createPrayerAction } from '@/actions/prayer'
import { formatDisplayName } from '@/lib/display-name'
import type { Category, Profile } from '@/lib/types'

interface Props {
  categories: Category[]
  profile: Pick<Profile, 'last_name' | 'first_name' | 'gender'>
}

export default function SubmitForm({ categories, profile }: Props) {
  const t = useTranslations('submit')
  const locale = useLocale() as 'zh' | 'en'
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const displayName = formatDisplayName(profile, locale)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')
    const result = await createPrayerAction(new FormData(e.currentTarget))
    setPending(false)
    if (result?.error) setError(result.error)
    // On success, createPrayerAction calls redirect('/my') — browser navigates automatically
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">
          {t('contentLabel')}
        </label>
        <textarea
          name="content"
          required
          rows={6}
          placeholder={t('contentPlaceholder')}
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">
          {t('categoryLabel')}
        </label>
        <select
          name="category_id"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {locale === 'zh' ? cat.name_zh : cat.name_en}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-gray-500">{t('posterNote', { name: displayName })}</p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#2d6a9f] py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? '...' : t('submit')}
      </button>
    </form>
  )
}
