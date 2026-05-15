import { useTranslations } from 'next-intl'
import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  const t = useTranslations('auth')
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-xl font-bold text-[#1a3a5c]">{t('login')}</h1>
        <LoginForm />
      </div>
    </div>
  )
}
