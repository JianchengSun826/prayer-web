import { useTranslations } from 'next-intl'
import RegisterForm from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  const t = useTranslations('auth')
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-1 text-center text-xl font-bold text-[#1a3a5c]">{t('register')}</h1>
        <p className="mb-6 text-center text-sm text-gray-500">欢迎加入 · Welcome</p>
        <RegisterForm />
      </div>
    </div>
  )
}
