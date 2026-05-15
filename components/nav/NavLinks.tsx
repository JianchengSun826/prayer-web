'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

export default function NavLinks() {
  const t = useTranslations('nav')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          .then(({ data }) => setProfile(data))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (!session) setProfile(null)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="hidden md:flex items-center gap-4 text-sm">
      <Link href="/" className="text-white/85 hover:text-white">{t('home')}</Link>
      {user ? (
        <>
          <Link href="/submit" className="text-white/85 hover:text-white">{t('submit')}</Link>
          <Link href="/my" className="text-white/85 hover:text-white">{t('my')}</Link>
          {profile?.role === 'admin' && (
            <Link href="/admin" className="text-white/85 hover:text-white">{t('admin')}</Link>
          )}
          <button
            onClick={handleLogout}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2d6a9f] hover:bg-blue-50"
          >
            {t('logout')}
          </button>
        </>
      ) : (
        <>
          <Link href="/auth/login" className="text-white/85 hover:text-white">{t('login')}</Link>
          <Link href="/auth/register" className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2d6a9f] hover:bg-blue-50">{t('register')}</Link>
        </>
      )}
    </nav>
  )
}
