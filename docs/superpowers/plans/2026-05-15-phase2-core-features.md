# Phase 2: Core Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the prayer request feed (homepage list, detail page, submit, my prayers) and account settings page so the site is usable end-to-end without admin features.

**Architecture:** Server Components fetch data from Supabase and pass it to Client Components for interactivity. Category filtering uses URL search params so it is SEO-friendly and works server-side. All mutations go through Next.js Server Actions. `useLocale()` / `getLocale()` from next-intl determine display language inside components.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL + RLS), next-intl v3, Tailwind CSS v4, Vitest

---

## File Structure

```
app/[locale]/
├── page.tsx                          # Homepage — full rewrite (Server Component)
├── prayer/
│   └── [id]/
│       └── page.tsx                  # Prayer detail page (Server Component)
├── submit/
│   └── page.tsx                      # Submit page (Server Component shell)
├── my/
│   └── page.tsx                      # My prayers page (Server Component)
└── account/
    └── page.tsx                      # Account settings page (Server Component shell)

components/
├── prayer/
│   ├── PrayerCard.tsx                # Single card, expand/collapse (Client)
│   └── CategorySidebar.tsx          # Category filter, desktop + mobile (Client)
├── submit/
│   └── SubmitForm.tsx               # Submit form (Client)
├── my/
│   └── MyPrayerList.tsx             # My prayers list with delete (Client)
└── account/
    ├── AccountForm.tsx              # Profile + password (Client)
    └── ContactAdminForm.tsx         # Contact admin message (Client)

actions/
├── prayer.ts                        # createPrayerAction, deletePrayerAction
└── account.ts                       # updateProfileAction, updatePasswordAction, sendAdminMessageAction

lib/
├── prayer-utils.ts                  # formatDaysLeft, formatRelativeDate
└── __tests__/
    └── prayer-utils.test.ts
```

---

## Task 1: Prayer Utility Functions (TDD)

**Files:**
- Create: `lib/prayer-utils.ts`
- Create: `lib/__tests__/prayer-utils.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/prayer-utils.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatDaysLeft, formatRelativeDate } from '../prayer-utils'

const FIXED_NOW = new Date('2026-05-15T12:00:00.000Z').getTime()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

const ms = (days: number) => days * 24 * 60 * 60 * 1000

describe('formatDaysLeft', () => {
  it('returns "5 天后到期" for 5 days in the future (zh)', () => {
    const expiresAt = new Date(FIXED_NOW + ms(5)).toISOString()
    expect(formatDaysLeft(expiresAt, 'zh')).toBe('5 天后到期')
  })

  it('returns "5 days left" for 5 days in the future (en)', () => {
    const expiresAt = new Date(FIXED_NOW + ms(5)).toISOString()
    expect(formatDaysLeft(expiresAt, 'en')).toBe('5 days left')
  })

  it('returns "1 day left" (singular) for 1 day in the future (en)', () => {
    const expiresAt = new Date(FIXED_NOW + ms(1)).toISOString()
    expect(formatDaysLeft(expiresAt, 'en')).toBe('1 day left')
  })

  it('returns "已归档" for a past date (zh)', () => {
    const expiresAt = new Date(FIXED_NOW - ms(1)).toISOString()
    expect(formatDaysLeft(expiresAt, 'zh')).toBe('已归档')
  })

  it('returns "Archived" for a past date (en)', () => {
    const expiresAt = new Date(FIXED_NOW - ms(1)).toISOString()
    expect(formatDaysLeft(expiresAt, 'en')).toBe('Archived')
  })
})

describe('formatRelativeDate', () => {
  it('returns "今天" for today (zh)', () => {
    expect(formatRelativeDate(new Date(FIXED_NOW).toISOString(), 'zh')).toBe('今天')
  })

  it('returns "Today" for today (en)', () => {
    expect(formatRelativeDate(new Date(FIXED_NOW).toISOString(), 'en')).toBe('Today')
  })

  it('returns "昨天" for yesterday (zh)', () => {
    expect(formatRelativeDate(new Date(FIXED_NOW - ms(1)).toISOString(), 'zh')).toBe('昨天')
  })

  it('returns "Yesterday" for yesterday (en)', () => {
    expect(formatRelativeDate(new Date(FIXED_NOW - ms(1)).toISOString(), 'en')).toBe('Yesterday')
  })

  it('returns "3 天前" for 3 days ago (zh)', () => {
    expect(formatRelativeDate(new Date(FIXED_NOW - ms(3)).toISOString(), 'zh')).toBe('3 天前')
  })

  it('returns "3 days ago" for 3 days ago (en)', () => {
    expect(formatRelativeDate(new Date(FIXED_NOW - ms(3)).toISOString(), 'en')).toBe('3 days ago')
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npm run test:run
```

Expected: FAIL — "Cannot find module '../prayer-utils'"

- [ ] **Step 3: Implement the utilities**

Create `lib/prayer-utils.ts`:

```typescript
export function formatDaysLeft(expiresAt: string, locale: 'zh' | 'en'): string {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return locale === 'zh' ? '已归档' : 'Archived'
  if (locale === 'zh') return `${days} 天后到期`
  return days === 1 ? '1 day left' : `${days} days left`
}

export function formatRelativeDate(createdAt: string, locale: 'zh' | 'en'): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return locale === 'zh' ? '今天' : 'Today'
  if (days === 1) return locale === 'zh' ? '昨天' : 'Yesterday'
  return locale === 'zh' ? `${days} 天前` : `${days} days ago`
}
```

- [ ] **Step 4: Run tests — expect 11 passing**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npm run test:run
```

Expected: PASS — 11 tests (4 existing display-name tests + 7 new prayer-utils tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add lib/prayer-utils.ts lib/__tests__/prayer-utils.test.ts
git commit -m "feat: add prayer utility functions with tests"
```

---

## Task 2: Prayer Server Actions

**Files:**
- Create: `actions/prayer.ts`

- [ ] **Step 1: Create `actions/prayer.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createPrayerAction(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const content = formData.get('content') as string
  const category_id = parseInt(formData.get('category_id') as string)

  const { error } = await supabase
    .from('prayer_requests')
    .insert({ user_id: user.id, content, category_id })

  if (error) return { error: error.message }

  redirect('/my')
}

export async function deletePrayerAction(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('prayer_requests')
    .update({ status: 'deleted' })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  return { success: true }
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add actions/prayer.ts
git commit -m "feat: add prayer server actions (create, delete)"
```

---

## Task 3: Account Server Actions

**Files:**
- Create: `actions/account.ts`

- [ ] **Step 1: Create `actions/account.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { Gender } from '@/lib/types'

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const last_name = formData.get('last_name') as string
  const first_name = formData.get('first_name') as string
  const gender = formData.get('gender') as Gender

  const { error } = await supabase
    .from('profiles')
    .update({ last_name, first_name, gender })
    .eq('id', user.id)

  if (error) return { error: error.message }

  return { success: true }
}

export async function updatePasswordAction(formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { error: error.message }

  return { success: true }
}

export async function sendAdminMessageAction(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const content = formData.get('content') as string

  const { error } = await supabase
    .from('admin_messages')
    .insert({ user_id: user.id, content })

  if (error) return { error: error.message }

  return { success: true }
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add actions/account.ts
git commit -m "feat: add account server actions (profile, password, contact admin)"
```

---

## Task 4: PrayerCard Component

**Files:**
- Create: `components/prayer/PrayerCard.tsx`

- [ ] **Step 1: Create `components/prayer/PrayerCard.tsx`**

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { formatDisplayName } from '@/lib/display-name'
import { formatDaysLeft, formatRelativeDate } from '@/lib/prayer-utils'
import type { PrayerRequest } from '@/lib/types'

interface Props {
  prayer: PrayerRequest
}

const COLLAPSE_THRESHOLD = 120

export default function PrayerCard({ prayer }: Props) {
  const t = useTranslations('home')
  const locale = useLocale() as 'zh' | 'en'
  const [expanded, setExpanded] = useState(false)

  const posterName = prayer.profiles
    ? formatDisplayName(prayer.profiles, locale)
    : '—'

  const categoryName = prayer.categories
    ? (locale === 'zh' ? prayer.categories.name_zh : prayer.categories.name_en)
    : ''

  const daysLeft = formatDaysLeft(prayer.expires_at, locale)
  const relativeDate = formatRelativeDate(prayer.created_at, locale)
  const isLong = prayer.content.length > COLLAPSE_THRESHOLD

  return (
    <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <p
        className={`text-sm text-gray-800 leading-relaxed whitespace-pre-wrap ${
          !expanded && isLong ? 'line-clamp-3' : ''
        }`}
      >
        {prayer.content}
      </p>

      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs text-blue-600 hover:underline"
        >
          {expanded ? t('collapseCard') : t('expandCard')}
        </button>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        <span className="font-medium text-gray-700">{posterName}</span>
        {prayer.categories && (
          <span
            className="rounded-full px-2 py-0.5 text-white"
            style={{ backgroundColor: prayer.categories.color }}
          >
            {categoryName}
          </span>
        )}
        <span>{relativeDate}</span>
        <span className="text-gray-400">{daysLeft}</span>
        <Link
          href={`/prayer/${prayer.id}`}
          className="ml-auto text-blue-500 hover:underline"
        >
          {locale === 'zh' ? '查看详情 →' : 'View →'}
        </Link>
      </div>
    </article>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add components/prayer/PrayerCard.tsx
git commit -m "feat: add PrayerCard component with expand/collapse"
```

---

## Task 5: CategorySidebar Component

**Files:**
- Create: `components/prayer/CategorySidebar.tsx`

- [ ] **Step 1: Create `components/prayer/CategorySidebar.tsx`**

```typescript
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import type { Category } from '@/lib/types'

interface CategoryWithCount extends Category {
  count: number
}

interface Props {
  categories: CategoryWithCount[]
  totalCount: number
  activeCategoryId: number | null
}

export default function CategorySidebar({ categories, totalCount, activeCategoryId }: Props) {
  const t = useTranslations('home')
  const locale = useLocale() as 'zh' | 'en'
  const router = useRouter()
  const pathname = usePathname()

  function select(id: number | null) {
    router.push(id === null ? pathname : `${pathname}?category=${id}`)
  }

  const btnClass = (active: boolean) =>
    `w-full text-left rounded-lg px-3 py-2 text-sm flex justify-between items-center gap-2 transition-colors ${
      active
        ? 'bg-blue-50 text-blue-700 font-semibold'
        : 'text-gray-700 hover:bg-gray-100'
    }`

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-44 shrink-0">
        <nav className="space-y-1 sticky top-4">
          <button onClick={() => select(null)} className={btnClass(activeCategoryId === null)}>
            <span>{t('allCategories')}</span>
            <span className="text-xs text-gray-400 shrink-0">{totalCount}</span>
          </button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => select(cat.id)} className={btnClass(activeCategoryId === cat.id)}>
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="truncate">{locale === 'zh' ? cat.name_zh : cat.name_en}</span>
              </span>
              <span className="text-xs text-gray-400 shrink-0">{cat.count}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile horizontal tabs */}
      <div className="md:hidden flex overflow-x-auto gap-2 pb-2 mb-2 -mx-4 px-4">
        <button
          onClick={() => select(null)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${
            activeCategoryId === null
              ? 'bg-[#2d6a9f] text-white font-semibold'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {t('allCategories')}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => select(cat.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${
              activeCategoryId === cat.id
                ? 'text-white font-semibold'
                : 'bg-gray-100 text-gray-700'
            }`}
            style={activeCategoryId === cat.id ? { backgroundColor: cat.color } : {}}
          >
            {locale === 'zh' ? cat.name_zh : cat.name_en}
          </button>
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add components/prayer/CategorySidebar.tsx
git commit -m "feat: add CategorySidebar with desktop sidebar and mobile tabs"
```

---

## Task 6: Homepage

**Files:**
- Modify: `app/[locale]/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite `app/[locale]/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getTranslations, getLocale } from 'next-intl/server'
import Link from 'next/link'
import PrayerCard from '@/components/prayer/PrayerCard'
import CategorySidebar from '@/components/prayer/CategorySidebar'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const activeCategoryId = category ? parseInt(category) : null
  const locale = await getLocale() as 'zh' | 'en'
  const t = await getTranslations('home')

  const supabase = await createClient()

  // Fetch all active prayers for category counts
  const { data: allActive } = await supabase
    .from('prayer_requests')
    .select('category_id')
    .eq('status', 'active')

  const countMap: Record<number, number> = {}
  for (const p of allActive ?? []) {
    countMap[p.category_id] = (countMap[p.category_id] ?? 0) + 1
  }
  const totalCount = allActive?.length ?? 0

  // Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('id')

  const categoriesWithCount = (categories ?? []).map((cat) => ({
    ...cat,
    count: countMap[cat.id] ?? 0,
  }))

  // Fetch prayers (filtered if category selected)
  let query = supabase
    .from('prayer_requests')
    .select('*, profiles(last_name, first_name, gender), categories(name_zh, name_en, color)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (activeCategoryId) {
    query = query.eq('category_id', activeCategoryId)
  }

  const { data: prayers } = await query

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Hero */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#2d6a9f] to-[#4a90d9] px-6 py-8 text-center text-white">
        <h1 className="text-2xl font-bold">{t('hero')}</h1>
        <p className="mt-1 text-sm text-white/80">{t('heroSub')}</p>
        <Link
          href="/submit"
          className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#2d6a9f] hover:bg-blue-50 transition-colors"
        >
          {t('submitBtn')}
        </Link>
      </div>

      {/* Content */}
      <div className="flex gap-6">
        <CategorySidebar
          categories={categoriesWithCount}
          totalCount={totalCount}
          activeCategoryId={activeCategoryId}
        />

        <div className="flex-1 min-w-0 space-y-4">
          {(prayers ?? []).length === 0 ? (
            <p className="py-16 text-center text-gray-400">
              {locale === 'zh' ? '暂无代祷事项' : 'No prayer requests yet'}
            </p>
          ) : (
            (prayers ?? []).map((prayer) => (
              <PrayerCard key={prayer.id} prayer={prayer} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -30
```

Fix any errors before continuing.

- [ ] **Step 3: Start dev server and verify**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npm run dev
```

Open http://localhost:3000. You should see:
- Blue hero section with "代祷同行" title and "✍️ 发布代祷事项" button
- Left sidebar with categories (all showing count 0 if no data yet)
- Empty state message if no prayers

Open http://localhost:3000/en. Hero should show "Prayer Together" and "✍️ Submit a Prayer".

Click a category — URL should update to `?category=N` and sidebar item highlights.

- [ ] **Step 4: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add app/[locale]/page.tsx
git commit -m "feat: build homepage with category filter and prayer list"
```

---

## Task 7: ContactAdminForm + Prayer Detail Page

**Files:**
- Create: `components/account/ContactAdminForm.tsx`
- Create: `app/[locale]/prayer/[id]/page.tsx`

- [ ] **Step 1: Create `components/account/ContactAdminForm.tsx`**

```typescript
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
```

- [ ] **Step 2: Create `app/[locale]/prayer/[id]/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getTranslations, getLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDisplayName } from '@/lib/display-name'
import { formatDaysLeft, formatRelativeDate } from '@/lib/prayer-utils'
import ContactAdminForm from '@/components/account/ContactAdminForm'

export default async function PrayerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { id } = await params
  const locale = await getLocale() as 'zh' | 'en'
  const t = await getTranslations('detail')

  const supabase = await createClient()

  const { data: prayer } = await supabase
    .from('prayer_requests')
    .select('*, profiles(last_name, first_name, gender), categories(name_zh, name_en, color)')
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (!prayer) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  const posterName = prayer.profiles
    ? formatDisplayName(prayer.profiles, locale)
    : '—'

  const categoryName = prayer.categories
    ? (locale === 'zh' ? prayer.categories.name_zh : prayer.categories.name_en)
    : ''

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="mb-6 block text-sm text-blue-600 hover:underline">
        {t('back')}
      </Link>

      <article className="rounded-2xl bg-white p-6 shadow-md">
        <p className="leading-relaxed text-gray-800 whitespace-pre-wrap">{prayer.content}</p>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span className="font-medium text-gray-700">{posterName}</span>
          {prayer.categories && (
            <span
              className="rounded-full px-2 py-0.5 text-white text-xs"
              style={{ backgroundColor: prayer.categories.color }}
            >
              {categoryName}
            </span>
          )}
          <span>{formatRelativeDate(prayer.created_at, locale)}</span>
          <span className="text-gray-400">{formatDaysLeft(prayer.expires_at, locale)}</span>
        </div>
      </article>

      {user && (
        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">{t('contactAdmin')}</h2>
          <ContactAdminForm />
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 4: Verify in browser**

With dev server running, click "查看详情 →" on any prayer card on the homepage. Should navigate to `/prayer/[id]` showing full content and metadata.

If logged in, a "联系管理员" form should appear below the prayer.

- [ ] **Step 5: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add components/account/ContactAdminForm.tsx app/[locale]/prayer/
git commit -m "feat: add prayer detail page and contact admin form"
```

---

## Task 8: Submit Prayer Page

**Files:**
- Create: `components/submit/SubmitForm.tsx`
- Create: `app/[locale]/submit/page.tsx`

- [ ] **Step 1: Create `components/submit/SubmitForm.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createPrayerAction } from '@/actions/prayer'
import { formatDisplayName } from '@/lib/display-name'
import type { Category, Profile } from '@/lib/types'

interface Props {
  categories: Category[]
  profile: Pick<Profile, 'last_name' | 'first_name' | 'gender'>
}

export default function SubmitForm({ categories, profile }: Props) {
  const t = useTranslations('submit')
  const locale = useLocale() as 'zh' | 'en'
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const displayName = formatDisplayName(profile, locale)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')
    const result = await createPrayerAction(new FormData(e.currentTarget))
    setPending(false)
    if (result?.error) setError(result.error)
    // On success, createPrayerAction calls redirect('/my') — browser navigates automatically
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">
          {t('contentLabel')}
        </label>
        <textarea
          name="content"
          required
          rows={6}
          placeholder={t('contentPlaceholder')}
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">
          {t('categoryLabel')}
        </label>
        <select
          name="category_id"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {locale === 'zh' ? cat.name_zh : cat.name_en}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-gray-500">{t('posterNote', { name: displayName })}</p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#2d6a9f] py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? '...' : t('submit')}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Create `app/[locale]/submit/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import SubmitForm from '@/components/submit/SubmitForm'

export default async function SubmitPage() {
  const supabase = await createClient()
  const t = await getTranslations('submit')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/submit')

  const [{ data: profile }, { data: categories }] = await Promise.all([
    supabase
      .from('profiles')
      .select('last_name, first_name, gender')
      .eq('id', user.id)
      .single(),
    supabase.from('categories').select('*').order('id'),
  ])

  if (!profile) redirect('/auth/login')

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-6 text-xl font-bold text-[#1a3a5c]">{t('title')}</h1>
        <SubmitForm categories={categories ?? []} profile={profile} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Verify in browser**

Go to http://localhost:3000/submit (must be logged in).
- Should see a form with content textarea and category dropdown
- Footer note should show "发布后将以「王弟兄」的名义显示" (or your registered name)
- Submitting should redirect to /my

- [ ] **Step 5: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add components/submit/SubmitForm.tsx app/[locale]/submit/page.tsx
git commit -m "feat: add submit prayer page"
```

---

## Task 9: My Prayers Page

**Files:**
- Create: `components/my/MyPrayerList.tsx`
- Create: `app/[locale]/my/page.tsx`

- [ ] **Step 1: Create `components/my/MyPrayerList.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { deletePrayerAction } from '@/actions/prayer'
import { formatRelativeDate } from '@/lib/prayer-utils'
import type { PrayerRequest } from '@/lib/types'

interface Props {
  prayers: PrayerRequest[]
}

export default function MyPrayerList({ prayers }: Props) {
  const t = useTranslations('my')
  const locale = useLocale() as 'zh' | 'en'
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [items, setItems] = useState(prayers)

  async function handleDelete(id: string) {
    if (!confirm(t('deleteConfirm'))) return
    setDeletingId(id)
    const result = await deletePrayerAction(id)
    setDeletingId(null)
    if (!result?.error) {
      setItems((prev) => prev.filter((p) => p.id !== id))
    }
  }

  if (items.length === 0) {
    return (
      <p className="py-16 text-center text-gray-400">{t('noItems')}</p>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((prayer) => (
        <div
          key={prayer.id}
          className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
            {prayer.content}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <div className="flex flex-wrap items-center gap-2">
              {prayer.categories && (
                <span
                  className="rounded-full px-2 py-0.5 text-white"
                  style={{ backgroundColor: prayer.categories.color }}
                >
                  {locale === 'zh' ? prayer.categories.name_zh : prayer.categories.name_en}
                </span>
              )}
              <span>{formatRelativeDate(prayer.created_at, locale)}</span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  prayer.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {prayer.status === 'active' ? t('active') : t('expired')}
              </span>
            </div>

            {prayer.status === 'active' && (
              <button
                onClick={() => handleDelete(prayer.id)}
                disabled={deletingId === prayer.id}
                className="text-red-500 hover:text-red-700 disabled:opacity-40"
              >
                {t('delete')}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create `app/[locale]/my/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import MyPrayerList from '@/components/my/MyPrayerList'

export default async function MyPage() {
  const supabase = await createClient()
  const t = await getTranslations('my')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/my')

  const { data: prayers } = await supabase
    .from('prayer_requests')
    .select('*, categories(name_zh, name_en, color)')
    .eq('user_id', user.id)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-[#1a3a5c]">{t('title')}</h1>
      <MyPrayerList prayers={prayers ?? []} />
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Verify end-to-end**

1. Submit a prayer at http://localhost:3000/submit
2. Should redirect to http://localhost:3000/my
3. Your prayer should appear with an "active" badge and "删除" button
4. Delete it — should disappear from the list immediately
5. The prayer should also appear on the homepage list

- [ ] **Step 5: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add components/my/MyPrayerList.tsx app/[locale]/my/page.tsx
git commit -m "feat: add my prayers page with delete"
```

---

## Task 10: Account Settings Page

**Files:**
- Create: `components/account/AccountForm.tsx`
- Create: `app/[locale]/account/page.tsx`

- [ ] **Step 1: Create `components/account/AccountForm.tsx`**

```typescript
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
              <label className="mb-1 block text-sm font-semibold text-gray-700">{t('lastName')}</label>
              <input
                name="last_name"
                defaultValue={profile.last_name}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">{t('firstName')}</label>
              <input
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
                  {g === 'brother' ? '弟兄 / Brother' : '姊妹 / Sister'}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">{t('email')}</label>
            <input
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
            <label className="mb-1 block text-sm font-semibold text-gray-700">{t('newPassword')}</label>
            <input
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
```

- [ ] **Step 2: Create `app/[locale]/account/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import AccountForm from '@/components/account/AccountForm'
import ContactAdminForm from '@/components/account/ContactAdminForm'

export default async function AccountPage() {
  const supabase = await createClient()
  const t = await getTranslations('account')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/account')

  const { data: profile } = await supabase
    .from('profiles')
    .select('last_name, first_name, gender')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-[#1a3a5c]">{t('title')}</h1>
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <AccountForm profile={profile} email={user.email ?? ''} />
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <h2 className="mb-4 text-base font-semibold text-gray-900">{t('contactAdmin')}</h2>
          <ContactAdminForm />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Verify in browser**

Go to http://localhost:3000/account (logged in).
- Profile form should show current last name, first name, gender
- Save changes → success message
- Password form → set new password → success
- Contact admin form → submit message → success message, form clears

- [ ] **Step 5: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add components/account/AccountForm.tsx app/[locale]/account/page.tsx
git commit -m "feat: add account settings page with profile edit, password change, and contact admin"
```

---

## Task 11: Final Verification & Push

- [ ] **Step 1: Run all tests**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npm run test:run
```

Expected: PASS — 11 tests (4 display-name + 7 prayer-utils)

- [ ] **Step 2: Build check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npm run build 2>&1
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: End-to-end smoke test**

With `npm run dev` running, walk through the full flow:

1. **Homepage** http://localhost:3000 — hero + empty list visible
2. **Register** http://localhost:3000/auth/register — register a new user
3. **Submit** http://localhost:3000/submit — post a prayer with a category
4. **Homepage** — prayer card appears in list, correct poster name shown
5. **Detail page** — click "查看详情 →", full content visible, contact admin form shows
6. **My prayers** http://localhost:3000/my — prayer listed, can delete
7. **Account** http://localhost:3000/account — edit name, save
8. **Language switch** — click "中 / EN", all pages switch to English
9. **Category filter** — click a category on homepage, list filters correctly
10. **Logout** — nav shows login/register again

- [ ] **Step 4: Push to GitHub**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && git push origin main
```

- [ ] **Step 5: Confirm Phase 2 complete**

Phase 2 delivers:
- ✅ Homepage with category sidebar (desktop) + tabs (mobile) + prayer list
- ✅ Prayer card with expand/collapse, poster name, category badge, time
- ✅ Prayer detail page with full content and contact admin form
- ✅ Submit prayer page (requires login)
- ✅ My prayers page with soft delete
- ✅ Account settings: edit profile, change password, contact admin
- ✅ Full bilingual support across all pages
- ✅ 11 tests passing

Proceed to Phase 3: Admin panel + email notifications.
