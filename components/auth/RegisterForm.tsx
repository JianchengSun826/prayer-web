'use client'

import { useTranslations } from 'next-intl'
import { registerAction } from '@/actions/auth'
import { useState } from 'react'
import Link from 'next/link'

export default function RegisterForm() {
  const t = useTranslations('auth')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')
    const result = await registerAction(new FormData(e.currentTarget))
    setPending(false)
    if (result?.error) setError(result.error)
    else setSuccess(true)
  }

  if (success) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
        {t('verifyEmail')}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">{t('lastName')}</label>
          <input name="last_name" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">{t('firstName')}</label>
          <input name="first_name" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">{t('gender')}</label>
        <div className="grid grid-cols-2 gap-3">
          {(['brother', 'sister'] as const).map((g) => (
            <label key={g} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
              <input type="radio" name="gender" value={g} required className="accent-blue-600" defaultChecked={g === 'brother'} />
              {t(g)}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">{t('genderHint')}</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{t('email')}</label>
        <input name="email" type="email" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{t('newPassword')}</label>
        <input name="password" type="password" required minLength={6} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={pending} className="w-full rounded-lg bg-[#2d6a9f] py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60">
        {pending ? '...' : t('register')}
      </button>

      <p className="text-center text-sm text-gray-500">
        {t('hasAccount')}{' '}
        <Link href="/auth/login" className="text-blue-600 hover:underline">{t('goLogin')}</Link>
      </p>
    </form>
  )
}
