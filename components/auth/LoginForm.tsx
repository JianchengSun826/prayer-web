'use client'

import { useTranslations } from 'next-intl'
import { loginAction } from '@/actions/auth'
import { useState } from 'react'
import Link from 'next/link'

export default function LoginForm() {
  const t = useTranslations('auth')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')
    const result = await loginAction(new FormData(e.currentTarget))
    setPending(false)
    if (result?.error) setError(result.error)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{t('email')}</label>
        <input name="email" type="email" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{t('password')}</label>
        <input name="password" type="password" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      </div>
      <div className="text-right">
        <Link href="/auth/forgot" className="text-xs text-blue-600 hover:underline">{t('forgotPassword')}</Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={pending} className="w-full rounded-lg bg-[#2d6a9f] py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60">
        {pending ? '...' : t('login')}
      </button>

      <p className="text-center text-sm text-gray-500">
        {t('noAccount')}{' '}
        <Link href="/auth/register" className="text-blue-600 hover:underline">{t('goRegister')}</Link>
      </p>
    </form>
  )
}
