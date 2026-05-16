'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  unreadCount: number
}

export default function AdminSidebar({ unreadCount }: Props) {
  const pathname = usePathname()

  const links = [
    { href: '/admin/dashboard', label: '仪表盘', icon: '📊' },
    { href: '/admin/prayers', label: '代祷管理', icon: '🙏' },
    { href: '/admin/users', label: '用户管理', icon: '👥' },
    { href: '/admin/messages', label: '消息中心', icon: '💬', badge: unreadCount },
  ]

  return (
    <aside className="w-52 shrink-0 bg-[#1a3a5c] min-h-screen">
      <div className="p-4">
        <div className="mb-6 text-base font-bold text-white">⛪ 管理后台</div>
        <nav className="space-y-1">
          {links.map(({ href, label, icon, badge }) => {
            const active = pathname.includes(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-[#2d6a9f] font-semibold text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{icon}</span>
                  <span>{label}</span>
                </span>
                {badge != null && badge > 0 && (
                  <span className="min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs text-white">
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
