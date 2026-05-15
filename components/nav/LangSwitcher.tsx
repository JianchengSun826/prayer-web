'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'

export default function LangSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  function toggle() {
    const nextLocale = locale === 'zh' ? 'en' : 'zh'
    // Strip current locale prefix if present, then add new one
    const stripped = pathname.startsWith('/en/')
      ? pathname.slice(3)
      : pathname.startsWith('/en')
      ? '/'
      : pathname

    const newPath = nextLocale === 'en' ? `/en${stripped}` : stripped
    router.push(newPath || '/')
  }

  return (
    <button
      onClick={toggle}
      className="rounded-full border border-white/40 px-3 py-1 text-xs text-white/85 hover:bg-white/10 transition-colors"
    >
      {locale === 'zh' ? '中 / EN' : 'EN / 中'}
    </button>
  )
}
