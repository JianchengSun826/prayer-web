import { useTranslations } from 'next-intl'
import LangSwitcher from './LangSwitcher'
import NavLinks from './NavLinks'

export default function Navbar() {
  const t = useTranslations('nav')

  return (
    <header className="bg-[#2d6a9f] shadow">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a href="/" className="text-base font-bold text-white">
          ✟ 代祷同行
        </a>
        <div className="flex items-center gap-4">
          <NavLinks />
          <LangSwitcher />
        </div>
      </div>
    </header>
  )
}
