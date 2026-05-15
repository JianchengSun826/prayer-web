import { useTranslations } from 'next-intl'
import ForgotForm from '@/components/auth/ForgotForm'
import Link from 'next/link'

export default function ForgotPage() {
  const t = useTranslations('auth')
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-xl font-bold text-[#1a3a5c]">{t('forgotPassword')}</h1>
        <ForgotForm />
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/auth/login" className="text-blue-600 hover:underline">{t('goLogin')}</Link>
        </p>
      </div>
    </div>
  )
}
