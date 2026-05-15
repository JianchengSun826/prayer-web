'use client'

import { useTranslations } from 'next-intl'
import { forgotPasswordAction } from '@/actions/auth'
import { useState } from 'react'

export default function ForgotForm() {
  const t = useTranslations('auth')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')
    const result = await forgotPasswordAction(new FormData(e.currentTarget))
    setPending(false)
    if (result?.error) setError(result.error)
    else setMessage(t('resetSent'))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{t('email')}</label>
        <input name="email" type="email" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700 bg-green-50 rounded p-3">{message}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-[#2d6a9f] py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60">
        {pending ? '...' : t('sendResetEmail')}
      </button>
    </form>
  )
}
