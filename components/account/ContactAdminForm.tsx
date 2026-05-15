'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { sendAdminMessageAction } from '@/actions/account'

export default function ContactAdminForm() {
  const t = useTranslations('detail')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')
    setMessage('')
    const result = await sendAdminMessageAction(new FormData(e.currentTarget))
    setPending(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setMessage(t('messageSent'))
      ;(e.target as HTMLFormElement).reset()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        name="content"
        required
        rows={4}
        maxLength={2000}
        placeholder={t('contactAdminPlaceholder')}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none resize-none"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[#2d6a9f] px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? '...' : t('sendMessage')}
      </button>
    </form>
  )
}
