'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { updateProfileAction, updatePasswordAction } from '@/actions/account'
import type { Profile } from '@/lib/types'

interface Props {
  profile: Pick<Profile, 'last_name' | 'first_name' | 'gender'>
  email: string
}

export default function AccountForm({ profile, email }: Props) {
  const t = useTranslations('account')
  const [profileMsg, setProfileMsg] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profilePending, setProfilePending] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordPending, setPasswordPending] = useState(false)

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setProfilePending(true)
    setProfileMsg('')
    setProfileError('')
    const result = await updateProfileAction(new FormData(e.currentTarget))
    setProfilePending(false)
    if (result?.error) setProfileError(result.error)
    else setProfileMsg(t('saved'))
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPasswordPending(true)
    setPasswordMsg('')
    setPasswordError('')
    const result = await updatePasswordAction(new FormData(e.currentTarget))
    setPasswordPending(false)
    if (result?.error) setPasswordError(result.error)
    else setPasswordMsg(t('saved'))
  }

  return (
    <div className="space-y-8">
      {/* Basic info */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-gray-900">{t('basicInfo')}</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="last_name" className="mb-1 block text-sm font-semibold text-gray-700">{t('lastName')}</label>
              <input
                id="last_name"
                name="last_name"
                defaultValue={profile.last_name}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="first_name" className="mb-1 block text-sm font-semibold text-gray-700">{t('firstName')}</label>
              <input
                id="first_name"
                name="first_name"
                defaultValue={profile.first_name}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">{t('gender')}</label>
            <div className="grid grid-cols-2 gap-3">
              {(['brother', 'sister'] as const).map((g) => (
                <label
                  key={g}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
                >
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    defaultChecked={profile.gender === g}
                    className="accent-blue-600"
                  />
                  {g === 'brother' ? t('brother') : t('sister')}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-gray-700">{t('email')}</label>
            <input
              id="email"
              value={email}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
            />
          </div>

          {profileError && <p className="text-sm text-red-600">{profileError}</p>}
          {profileMsg && <p className="text-sm text-green-700">{profileMsg}</p>}

          <button
            type="submit"
            disabled={profilePending}
            className="rounded-lg bg-[#2d6a9f] px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {profilePending ? '...' : t('save')}
          </button>
        </form>
      </section>

      {/* Change password */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-gray-900">{t('changePassword')}</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold text-gray-700">{t('newPassword')}</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
          {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
          {passwordMsg && <p className="text-sm text-green-700">{passwordMsg}</p>}
          <button
            type="submit"
            disabled={passwordPending}
            className="rounded-lg bg-[#2d6a9f] px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {passwordPending ? '...' : t('updatePassword')}
          </button>
        </form>
      </section>
    </div>
  )
}
