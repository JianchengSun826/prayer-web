# Phase 3: Admin Panel + Email Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully functional admin panel (dashboard, prayer/user/message management) and email notification system (welcome, admin notifications, expiry reminders via Vercel Cron).

**Architecture:** Admin pages are Client Components fetching from `/api/admin/` route handlers for smooth in-place filtering/pagination. Every `/api/admin/` route verifies admin role server-side. Email sent via Resend — immediately for user-triggered events, and daily via Vercel Cron for expiry reminders.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL + RLS), next-intl v3, Tailwind CSS v4, Resend v6, Vercel Cron, Vitest

---

## File Structure

```
app/
├── [locale]/admin/
│   ├── layout.tsx                       # Server Component — auth+role guard, renders AdminSidebar
│   ├── page.tsx                         # redirect → /admin/dashboard
│   ├── dashboard/page.tsx               # Client Component — fetches /api/admin/stats
│   ├── prayers/page.tsx                 # Client Component — fetches /api/admin/prayers
│   ├── users/page.tsx                   # Client Component — fetches /api/admin/users
│   └── messages/page.tsx                # Client Component — fetches /api/admin/messages
│
├── api/admin/
│   ├── stats/route.ts                   # GET stats
│   ├── prayers/route.ts                 # GET list
│   ├── prayers/[id]/route.ts            # PATCH status
│   ├── users/route.ts                   # GET list
│   ├── users/[id]/route.ts              # PATCH role
│   ├── messages/route.ts                # GET list
│   ├── messages/[id]/route.ts           # PATCH mark-read
│   └── messages/[id]/reply/route.ts     # POST reply (email + mark-read)
│
└── api/cron/
    └── notify/route.ts                  # GET — Vercel Cron expiry reminders

lib/
├── admin-auth.ts                        # requireAdmin() helper for API routes
├── email.ts                             # Resend client + 4 email template functions
├── supabase/service.ts                  # Service role Supabase client (for cron)
└── __tests__/email.test.ts              # Tests for email template functions

components/admin/
└── AdminSidebar.tsx                     # Client Component — left sidebar with active link detection

actions/
├── auth.ts                              # MODIFY: add welcome email after registerAction
└── account.ts                           # MODIFY: add admin notification after sendAdminMessageAction

supabase/migrations/
└── 20260515000002_profiles_add_email.sql  # Add email column + update trigger

vercel.json                              # Add cron config
.env.local                               # Add 5 new env vars (left blank)
```

---

## Task 1: Environment Variables + Service Role Client

**Files:**
- Modify: `.env.local`
- Create: `lib/supabase/service.ts`

- [ ] **Step 1: Add env vars to .env.local**

Read the current `.env.local` first, then append these lines (leave values blank — configure before deploy):

```
RESEND_API_KEY=
RESEND_FROM_EMAIL=
ADMIN_EMAIL=
CRON_SECRET=
NEXT_PUBLIC_SITE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 2: Create `lib/supabase/service.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add lib/supabase/service.ts .env.local
git commit -m "feat: add service role Supabase client and Phase 3 env vars"
```

---

## Task 2: Database Migration — Add Email to Profiles

**Files:**
- Create: `supabase/migrations/20260515000002_profiles_add_email.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Add email column to profiles
alter table public.profiles add column if not exists email text;

-- Update trigger to capture email on new user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, last_name, first_name, gender, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'gender',
    new.email
  );
  return new;
end;
$$;
```

Note: Existing profile rows will have `email = null` until the user logs in or the admin backfills manually via Supabase dashboard SQL editor:
```sql
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;
```

- [ ] **Step 2: Update `lib/types.ts` — add optional email to Profile**

Add `email?: string | null` to the `Profile` interface:

```typescript
export interface Profile {
  id: string
  last_name: string
  first_name: string
  gender: Gender
  role: UserRole
  is_active: boolean
  created_at: string
  email?: string | null   // add this line
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add supabase/migrations/20260515000002_profiles_add_email.sql lib/types.ts
git commit -m "feat: add email column to profiles and update new-user trigger"
```

---

## Task 3: Email Templates (TDD)

**Files:**
- Create: `lib/email.ts`
- Create: `lib/__tests__/email.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/email.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  welcomeEmail,
  adminNotificationEmail,
  adminReplyEmail,
  expiryReminderEmail,
} from '../email'

describe('welcomeEmail', () => {
  it('includes the user name', () => {
    const html = welcomeEmail('王弟兄')
    expect(html).toContain('王弟兄')
  })
  it('returns a non-empty string', () => {
    expect(welcomeEmail('Test').length).toBeGreaterThan(10)
  })
})

describe('adminNotificationEmail', () => {
  it('includes sender name and message content', () => {
    const html = adminNotificationEmail('李姊妹', '请为我的家人祷告')
    expect(html).toContain('李姊妹')
    expect(html).toContain('请为我的家人祷告')
  })
})

describe('adminReplyEmail', () => {
  it('includes user name, reply content, and site URL', () => {
    const html = adminReplyEmail('张弟兄', '我们会为你祷告', 'https://prayer.example.com')
    expect(html).toContain('张弟兄')
    expect(html).toContain('我们会为你祷告')
    expect(html).toContain('https://prayer.example.com')
  })
})

describe('expiryReminderEmail', () => {
  it('includes user name, prayer preview, expiry date, and site URL', () => {
    const html = expiryReminderEmail('赵姊妹', '为工作上的挑战祷告', '2026-05-18', 'https://prayer.example.com')
    expect(html).toContain('赵姊妹')
    expect(html).toContain('为工作上的挑战祷告')
    expect(html).toContain('2026-05-18')
    expect(html).toContain('https://prayer.example.com')
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npm run test:run
```

Expected: FAIL — "Cannot find module '../email'"

- [ ] **Step 3: Create `lib/email.ts`**

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@example.com'

// ─── Template functions (pure, testable) ─────────────────────────────────────

export function welcomeEmail(name: string): string {
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a3a5c;">
  <h1 style="color:#2d6a9f;">欢迎加入代祷同行，${name}！</h1>
  <p>感谢你的注册。你现在可以在代祷同行上分享代祷事项，与弟兄姊妹一同祷告。</p>
  <p>愿主祝福你！</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
  <p style="color:#64748b;font-size:12px;">代祷同行团队</p>
</div>`
}

export function adminNotificationEmail(senderName: string, content: string): string {
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a3a5c;">
  <h2>新联系管理员消息</h2>
  <p><strong>发件人：</strong>${senderName}</p>
  <div style="background:#f8fafc;border-left:4px solid #2d6a9f;padding:12px 16px;margin:16px 0;">
    <p style="margin:0;white-space:pre-wrap;">${content}</p>
  </div>
  <p style="color:#64748b;font-size:12px;">请登录管理后台查看详情。</p>
</div>`
}

export function adminReplyEmail(userName: string, replyContent: string, siteUrl: string): string {
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a3a5c;">
  <h2>管理员回复了你的消息</h2>
  <p>亲爱的 ${userName}，</p>
  <div style="background:#f8fafc;border-left:4px solid #2d6a9f;padding:12px 16px;margin:16px 0;">
    <p style="margin:0;white-space:pre-wrap;">${replyContent}</p>
  </div>
  <p><a href="${siteUrl}" style="color:#2d6a9f;">访问代祷同行</a></p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
  <p style="color:#64748b;font-size:12px;">代祷同行团队</p>
</div>`
}

export function expiryReminderEmail(
  userName: string,
  prayerContent: string,
  expiresAt: string,
  siteUrl: string
): string {
  const preview = prayerContent.length > 80 ? prayerContent.slice(0, 80) + '...' : prayerContent
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a3a5c;">
  <h2>你的代祷事项即将到期</h2>
  <p>亲爱的 ${userName}，</p>
  <p>你有一条代祷事项将于 <strong>${expiresAt}</strong> 到期：</p>
  <div style="background:#f8fafc;border-left:4px solid #f59e0b;padding:12px 16px;margin:16px 0;">
    <p style="margin:0;color:#64748b;">${preview}</p>
  </div>
  <p>如需继续，请登录管理你的代祷事项。</p>
  <p><a href="${siteUrl}/my" style="color:#2d6a9f;">查看我的代祷事项</a></p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
  <p style="color:#64748b;font-size:12px;">代祷同行团队</p>
</div>`
}

// ─── Send helpers (call Resend; skip silently if API key not set) ─────────────

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return
  await resend.emails.send({ from: FROM, to, subject: '欢迎加入代祷同行', html: welcomeEmail(name) })
}

export async function sendAdminNotificationEmail(senderName: string, content: string): Promise<void> {
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) return
  await resend.emails.send({
    from: FROM,
    to: process.env.ADMIN_EMAIL,
    subject: `新消息来自 ${senderName}`,
    html: adminNotificationEmail(senderName, content),
  })
}

export async function sendAdminReplyEmail(to: string, userName: string, replyContent: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  await resend.emails.send({
    from: FROM,
    to,
    subject: '管理员回复了你的消息',
    html: adminReplyEmail(userName, replyContent, siteUrl),
  })
}

export async function sendExpiryReminderEmail(
  to: string,
  userName: string,
  prayerContent: string,
  expiresAt: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  await resend.emails.send({
    from: FROM,
    to,
    subject: '你的代祷事项即将到期',
    html: expiryReminderEmail(userName, prayerContent, expiresAt, siteUrl),
  })
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npm run test:run
```

Expected: all tests pass (previous 15 + 7 new = 22 total).

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add lib/email.ts lib/__tests__/email.test.ts
git commit -m "feat: add email templates and Resend send helpers"
```

---

## Task 4: Immediate Email Integration

**Files:**
- Modify: `actions/auth.ts`
- Modify: `actions/account.ts`

- [ ] **Step 1: Update `actions/auth.ts` — welcome email after register**

The current `registerAction` ends with `return { success: true }`. Add a welcome email call before the return. The full updated function (replace only `registerAction`):

```typescript
export async function registerAction(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const last_name = formData.get('last_name') as string
  const first_name = formData.get('first_name') as string
  const gender = formData.get('gender') as Gender

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { last_name, first_name, gender },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/login`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Send welcome email (fire-and-forget — don't block registration on email failure)
  const displayName = gender === 'brother' ? `${last_name}弟兄` : `${last_name}姊妹`
  sendWelcomeEmail(email, displayName).catch(() => {})

  return { success: true }
}
```

Also add the import at the top of `actions/auth.ts`:

```typescript
import { sendWelcomeEmail } from '@/lib/email'
```

- [ ] **Step 2: Update `actions/account.ts` — admin notification after sendAdminMessageAction**

Add import at the top:

```typescript
import { sendAdminNotificationEmail } from '@/lib/email'
```

In `sendAdminMessageAction`, after the successful insert and before `return { success: true }`, add:

```typescript
  // Notify admin by email (fire-and-forget)
  const { data: profile } = await supabase
    .from('profiles')
    .select('last_name, first_name, gender')
    .eq('id', user.id)
    .single()

  if (profile) {
    const name = profile.gender === 'brother'
      ? `${profile.last_name}弟兄`
      : `${profile.last_name}姊妹`
    sendAdminNotificationEmail(name, content.trim()).catch(() => {})
  }
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Run tests**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npm run test:run
```

Expected: all 22 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add actions/auth.ts actions/account.ts
git commit -m "feat: send welcome email on register and notify admin on contact message"
```

---

## Task 5: Admin Layout + Sidebar

**Files:**
- Create: `components/admin/AdminSidebar.tsx`
- Create: `app/[locale]/admin/layout.tsx`
- Create: `app/[locale]/admin/page.tsx`

- [ ] **Step 1: Create `components/admin/AdminSidebar.tsx`**

```typescript
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
```

- [ ] **Step 2: Create `app/[locale]/admin/layout.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/')

  const { count } = await supabase
    .from('admin_messages')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null)

  return (
    <div className="flex min-h-screen">
      <AdminSidebar unreadCount={count ?? 0} />
      <main className="flex-1 bg-gray-50 p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/[locale]/admin/page.tsx`**

```typescript
import { redirect } from 'next/navigation'

export default function AdminIndexPage() {
  redirect('/admin/dashboard')
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add components/admin/AdminSidebar.tsx app/[locale]/admin/layout.tsx app/[locale]/admin/page.tsx
git commit -m "feat: add admin layout with sidebar and role guard"
```

---

## Task 6: Admin Auth Helper + Stats API

**Files:**
- Create: `lib/admin-auth.ts`
- Create: `app/api/admin/stats/route.ts`

- [ ] **Step 1: Create `lib/admin-auth.ts`**

This helper is used by every admin API route to verify the caller is an admin.

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

interface AdminAuthResult {
  error: NextResponse | null
  supabase: SupabaseClient | null
  userId: string | null
}

export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), supabase: null, userId: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), supabase: null, userId: null }
  }

  return { error: null, supabase, userId: user.id }
}
```

- [ ] **Step 2: Create `app/api/admin/stats/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const nowIso = new Date().toISOString()
  const tomorrowIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: activePrayers },
    { count: totalUsers },
    { count: unreadMessages },
    { count: expiringToday },
    { data: recentPrayers },
  ] = await Promise.all([
    supabase!.from('prayer_requests').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase!.from('profiles').select('*', { count: 'exact', head: true }),
    supabase!.from('admin_messages').select('*', { count: 'exact', head: true }).is('read_at', null),
    supabase!.from('prayer_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('expires_at', nowIso)
      .lte('expires_at', tomorrowIso),
    supabase!.from('prayer_requests').select('created_at').gte('created_at', sevenDaysAgo),
  ])

  // Build last-7-days daily counts for the dashboard bar chart
  const dailyCounts = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().slice(0, 10)
    const count = (recentPrayers ?? []).filter((p) => p.created_at.slice(0, 10) === dateStr).length
    return { date: dateStr, count }
  })

  return NextResponse.json({
    activePrayers: activePrayers ?? 0,
    totalUsers: totalUsers ?? 0,
    unreadMessages: unreadMessages ?? 0,
    expiringToday: expiringToday ?? 0,
    dailyCounts,
  })
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add lib/admin-auth.ts app/api/admin/stats/route.ts
git commit -m "feat: add admin auth helper and stats API route"
```

---

## Task 7: Admin Prayers API

**Files:**
- Create: `app/api/admin/prayers/route.ts`
- Create: `app/api/admin/prayers/[id]/route.ts`

- [ ] **Step 1: Create `app/api/admin/prayers/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? 'all'
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase!
    .from('prayer_requests')
    .select('*, profiles(last_name, first_name, gender, email), categories(name_zh, name_en, color)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status !== 'all') query = query.eq('status', status)
  if (search) query = query.ilike('content', `%${search}%`)

  const { data: prayers, count, error: dbError } = await query

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ prayers: prayers ?? [], total: count ?? 0, page })
}
```

- [ ] **Step 2: Create `app/api/admin/prayers/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { status } = body as { status: 'expired' | 'deleted' }

  if (status !== 'expired' && status !== 'deleted') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { error: dbError } = await supabase!
    .from('prayer_requests')
    .update({ status })
    .eq('id', id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add app/api/admin/prayers/route.ts "app/api/admin/prayers/[id]/route.ts"
git commit -m "feat: add admin prayers API (list + patch status)"
```

---

## Task 8: Admin Users API

**Files:**
- Create: `app/api/admin/users/route.ts`
- Create: `app/api/admin/users/[id]/route.ts`

- [ ] **Step 1: Create `app/api/admin/users/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const { error, supabase, userId } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase!
    .from('profiles')
    .select('id, last_name, first_name, gender, role, email, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search) {
    query = query.or(`last_name.ilike.%${search}%,first_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data: users, count, error: dbError } = await query

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ users: users ?? [], total: count ?? 0, page, currentUserId: userId })
}
```

- [ ] **Step 2: Create `app/api/admin/users/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase, userId } = await requireAdmin()
  if (error) return error

  const { id } = await params

  // Prevent admin from revoking their own admin role
  if (id === userId) {
    return NextResponse.json({ error: 'Cannot modify your own role' }, { status: 400 })
  }

  const body = await request.json()
  const { role } = body as { role: 'admin' | 'user' }

  if (role !== 'admin' && role !== 'user') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const { error: dbError } = await supabase!
    .from('profiles')
    .update({ role })
    .eq('id', id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add app/api/admin/users/route.ts "app/api/admin/users/[id]/route.ts"
git commit -m "feat: add admin users API (list + patch role)"
```

---

## Task 9: Admin Messages API

**Files:**
- Create: `app/api/admin/messages/route.ts`
- Create: `app/api/admin/messages/[id]/route.ts`
- Create: `app/api/admin/messages/[id]/reply/route.ts`

- [ ] **Step 1: Create `app/api/admin/messages/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const read = searchParams.get('read') ?? 'all'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase!
    .from('admin_messages')
    .select('*, profiles(last_name, first_name, gender, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (read === 'unread') query = query.is('read_at', null)

  const { data: messages, count, error: dbError } = await query
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const { count: unreadCount } = await supabase!
    .from('admin_messages')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null)

  return NextResponse.json({ messages: messages ?? [], total: count ?? 0, page, unreadCount: unreadCount ?? 0 })
}
```

- [ ] **Step 2: Create `app/api/admin/messages/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { id } = await params

  const { error: dbError } = await supabase!
    .from('admin_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Create `app/api/admin/messages/[id]/reply/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sendAdminReplyEmail } from '@/lib/email'
import { formatDisplayName } from '@/lib/display-name'
import type { Gender } from '@/lib/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { content } = body as { content: string }

  if (typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Reply content is required' }, { status: 400 })
  }

  // Fetch the message with sender profile to get email
  const { data: message, error: fetchError } = await supabase!
    .from('admin_messages')
    .select('*, profiles(last_name, first_name, gender, email)')
    .eq('id', id)
    .single()

  if (fetchError || !message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  }

  // Mark as read
  await supabase!
    .from('admin_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)

  // Send reply email if we have the user's email
  const profile = message.profiles as { last_name: string; first_name: string; gender: string; email?: string | null } | null
  if (profile?.email) {
    const displayName = formatDisplayName(profile as Parameters<typeof formatDisplayName>[0], 'zh')
    await sendAdminReplyEmail(profile.email, displayName, content.trim())
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add app/api/admin/messages/route.ts "app/api/admin/messages/[id]/route.ts" "app/api/admin/messages/[id]/reply/route.ts"
git commit -m "feat: add admin messages API (list, mark-read, reply with email)"
```

---

## Task 10: Admin Dashboard Page

**Files:**
- Create: `app/[locale]/admin/dashboard/page.tsx`

- [ ] **Step 1: Create `app/[locale]/admin/dashboard/page.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'

interface DailyCount { date: string; count: number }

interface Stats {
  activePrayers: number
  totalUsers: number
  unreadMessages: number
  expiringToday: number
  dailyCounts: DailyCount[]
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const cards = stats
    ? [
        { label: '活跃代祷', value: stats.activePrayers, color: '#2d6a9f' },
        { label: '注册用户', value: stats.totalUsers, color: '#2d6a9f' },
        { label: '未读消息', value: stats.unreadMessages, color: '#f59e0b' },
        { label: '今日到期', value: stats.expiringToday, color: '#ef4444' },
      ]
    : []

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-[#1a3a5c]">仪表盘</h1>

      {loading ? (
        <p className="text-gray-400">加载中...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cards.map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="text-3xl font-bold" style={{ color }}>{value}</div>
                <div className="mt-1 text-sm text-gray-500">{label}</div>
              </div>
            ))}
          </div>

          {stats?.dailyCounts && (
            <div className="mt-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">近 7 天新增代祷</h2>
              <div className="flex h-24 items-end gap-2">
                {stats.dailyCounts.map(({ date, count }) => {
                  const maxCount = Math.max(...stats.dailyCounts.map((d) => d.count), 1)
                  const heightPct = Math.round((count / maxCount) * 100)
                  return (
                    <div key={date} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-xs text-gray-500">{count}</span>
                      <div
                        className="w-full rounded-t bg-[#2d6a9f]"
                        style={{ height: `${heightPct}%`, minHeight: count > 0 ? '4px' : '2px' }}
                      />
                      <span className="text-xs text-gray-400">{date.slice(5)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add "app/[locale]/admin/dashboard/page.tsx"
git commit -m "feat: add admin dashboard page with stats cards"
```

---

## Task 11: Admin Prayers Page

**Files:**
- Create: `app/[locale]/admin/prayers/page.tsx`

- [ ] **Step 1: Create `app/[locale]/admin/prayers/page.tsx`**

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatDisplayName } from '@/lib/display-name'
import type { PrayerRequest, Profile, Category } from '@/lib/types'

interface PrayerRow extends PrayerRequest {
  profiles: Pick<Profile, 'last_name' | 'first_name' | 'gender'> | null
  categories: Pick<Category, 'name_zh' | 'name_en' | 'color'> | null
}

interface PrayersResponse {
  prayers: PrayerRow[]
  total: number
  page: number
}

export default function AdminPrayersPage() {
  const [data, setData] = useState<PrayersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [actionPending, setActionPending] = useState<string | null>(null)

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ status, search: debouncedSearch, page: String(page) })
    fetch(`/api/admin/prayers?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [status, debouncedSearch, page])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleAction(id: string, newStatus: 'expired' | 'deleted') {
    const label = newStatus === 'expired' ? '归档' : '删除'
    if (!confirm(`确认${label}这条代祷事项？`)) return
    setActionPending(id)
    await fetch(`/api/admin/prayers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setActionPending(null)
    fetchData()
  }

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      expired: 'bg-gray-100 text-gray-500',
      deleted: 'bg-red-100 text-red-500',
    }
    const label: Record<string, string> = { active: '进行中', expired: '已归档', deleted: '已删除' }
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs ${map[s] ?? ''}`}>{label[s] ?? s}</span>
    )
  }

  const totalPages = data ? Math.ceil(data.total / 20) : 1

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-[#1a3a5c]">代祷管理</h1>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none"
        >
          <option value="all">全部状态</option>
          <option value="active">进行中</option>
          <option value="expired">已归档</option>
          <option value="deleted">已删除</option>
        </select>
        <input
          type="text"
          placeholder="搜索内容..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none"
        />
      </div>

      {loading ? (
        <p className="text-gray-400">加载中...</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">内容</th>
                  <th className="px-4 py-3 text-left">发布者</th>
                  <th className="px-4 py-3 text-left">分类</th>
                  <th className="px-4 py-3 text-left">状态</th>
                  <th className="px-4 py-3 text-left">到期时间</th>
                  <th className="px-4 py-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data?.prayers ?? []).map((prayer) => (
                  <tr key={prayer.id} className="hover:bg-gray-50">
                    <td className="max-w-xs px-4 py-3">
                      <p className="line-clamp-2 text-gray-800">{prayer.content}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {prayer.profiles ? formatDisplayName(prayer.profiles, 'zh') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {prayer.categories && (
                        <span
                          className="rounded-full px-2 py-0.5 text-xs text-white"
                          style={{ backgroundColor: prayer.categories.color }}
                        >
                          {prayer.categories.name_zh}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{statusBadge(prayer.status)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(prayer.expires_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {prayer.status === 'active' && (
                          <button
                            onClick={() => handleAction(prayer.id, 'expired')}
                            disabled={actionPending === prayer.id}
                            className="text-xs text-yellow-600 hover:underline disabled:opacity-40"
                          >
                            归档
                          </button>
                        )}
                        {prayer.status !== 'deleted' && (
                          <button
                            onClick={() => handleAction(prayer.id, 'deleted')}
                            disabled={actionPending === prayer.id}
                            className="text-xs text-red-500 hover:underline disabled:opacity-40"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
              <span>共 {data?.total ?? 0} 条</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="disabled:opacity-40">上一页</button>
                <span>{page} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="disabled:opacity-40">下一页</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add "app/[locale]/admin/prayers/page.tsx"
git commit -m "feat: add admin prayers management page"
```

---

## Task 12: Admin Users Page

**Files:**
- Create: `app/[locale]/admin/users/page.tsx`

- [ ] **Step 1: Create `app/[locale]/admin/users/page.tsx`**

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatDisplayName } from '@/lib/display-name'
import type { Profile } from '@/lib/types'

interface UsersResponse {
  users: Profile[]
  total: number
  page: number
  currentUserId: string
}

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [actionPending, setActionPending] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ search: debouncedSearch, page: String(page) })
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [debouncedSearch, page])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleRoleChange(id: string, newRole: 'admin' | 'user') {
    const label = newRole === 'admin' ? '提升为管理员' : '撤销管理员权限'
    if (!confirm(`确认${label}？`)) return
    setActionPending(id)
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    setActionPending(null)
    fetchData()
  }

  const totalPages = data ? Math.ceil(data.total / 20) : 1

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-[#1a3a5c]">用户管理</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索姓名或邮箱..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none"
        />
      </div>

      {loading ? (
        <p className="text-gray-400">加载中...</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">姓名</th>
                  <th className="px-4 py-3 text-left">邮箱</th>
                  <th className="px-4 py-3 text-left">身份</th>
                  <th className="px-4 py-3 text-left">角色</th>
                  <th className="px-4 py-3 text-left">注册时间</th>
                  <th className="px-4 py-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data?.users ?? []).map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {formatDisplayName(user, 'zh')}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{user.email ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {user.gender === 'brother' ? '弟兄' : '姊妹'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        user.role === 'admin'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {user.role === 'admin' ? '管理员' : '普通用户'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3">
                      {user.id !== data?.currentUserId && (
                        user.role === 'admin' ? (
                          <button
                            onClick={() => handleRoleChange(user.id, 'user')}
                            disabled={actionPending === user.id}
                            className="text-xs text-red-500 hover:underline disabled:opacity-40"
                          >
                            撤销管理员
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRoleChange(user.id, 'admin')}
                            disabled={actionPending === user.id}
                            className="text-xs text-blue-600 hover:underline disabled:opacity-40"
                          >
                            提升为管理员
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
              <span>共 {data?.total ?? 0} 名用户</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="disabled:opacity-40">上一页</button>
                <span>{page} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="disabled:opacity-40">下一页</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add "app/[locale]/admin/users/page.tsx"
git commit -m "feat: add admin users management page"
```

---

## Task 13: Admin Messages Page

**Files:**
- Create: `app/[locale]/admin/messages/page.tsx`

- [ ] **Step 1: Create `app/[locale]/admin/messages/page.tsx`**

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatDisplayName } from '@/lib/display-name'
import type { AdminMessage, Profile } from '@/lib/types'

interface MessageRow extends AdminMessage {
  profiles: Pick<Profile, 'last_name' | 'first_name' | 'gender' | 'email'> | null
}

interface MessagesResponse {
  messages: MessageRow[]
  total: number
  page: number
  unreadCount: number
}

export default function AdminMessagesPage() {
  const [data, setData] = useState<MessagesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replyPending, setReplyPending] = useState(false)
  const [replyMsg, setReplyMsg] = useState('')

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ read: filter, page: String(page) })
    fetch(`/api/admin/messages?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter, page])

  useEffect(() => { fetchData() }, [fetchData])

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id)
    setReplyContent('')
    setReplyMsg('')
  }

  async function handleReply(messageId: string) {
    if (!replyContent.trim()) return
    setReplyPending(true)
    setReplyMsg('')
    const res = await fetch(`/api/admin/messages/${messageId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: replyContent }),
    })
    setReplyPending(false)
    if (res.ok) {
      setReplyMsg('邮件已发送')
      setReplyContent('')
      fetchData()
    } else {
      setReplyMsg('发送失败，请重试')
    }
  }

  const totalPages = data ? Math.ceil(data.total / 20) : 1

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#1a3a5c]">
          消息中心
          {(data?.unreadCount ?? 0) > 0 && (
            <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-sm font-normal text-white">
              {data!.unreadCount}
            </span>
          )}
        </h1>
        <div className="flex gap-2 text-sm">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1) }}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                filter === f
                  ? 'bg-[#2d6a9f] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? '全部' : '未读'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">加载中...</p>
      ) : (
        <div className="space-y-3">
          {(data?.messages ?? []).map((msg) => {
            const senderName = msg.profiles ? formatDisplayName(msg.profiles, 'zh') : '未知用户'
            const isUnread = msg.read_at === null
            const isExpanded = expandedId === msg.id

            return (
              <div
                key={msg.id}
                className={`rounded-xl border bg-white shadow-sm transition-all ${
                  isUnread ? 'border-blue-200' : 'border-gray-100'
                }`}
              >
                <button
                  onClick={() => toggleExpand(msg.id)}
                  className="w-full px-4 py-3 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                        <span className="font-medium text-gray-800">{senderName}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(msg.created_at).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-gray-500">{msg.content}</p>
                    </div>
                    <span className="shrink-0 text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                    <p className="whitespace-pre-wrap text-sm text-gray-700">{msg.content}</p>

                    <div className="mt-4 space-y-2">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={3}
                        placeholder="输入回复内容，发送邮件给用户..."
                        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      {replyMsg && (
                        <p className={`text-sm ${replyMsg.includes('失败') ? 'text-red-600' : 'text-green-600'}`}>
                          {replyMsg}
                        </p>
                      )}
                      <button
                        onClick={() => handleReply(msg.id)}
                        disabled={replyPending || !replyContent.trim()}
                        className="rounded-lg bg-[#2d6a9f] px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
                      >
                        {replyPending ? '发送中...' : '发送邮件'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>共 {data?.total ?? 0} 条消息</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="disabled:opacity-40">上一页</button>
            <span>{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="disabled:opacity-40">下一页</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add "app/[locale]/admin/messages/page.tsx"
git commit -m "feat: add admin messages center page with email reply"
```

---

## Task 14: Vercel Cron — Expiry Reminder Emails

**Files:**
- Create: `app/api/cron/notify/route.ts`
- Create (or modify): `vercel.json`

- [ ] **Step 1: Create `app/api/cron/notify/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendExpiryReminderEmail } from '@/lib/email'
import { formatDisplayName } from '@/lib/display-name'
import type { Gender } from '@/lib/types'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const auth = request.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  // Find active prayers expiring within 3 days
  const { data: prayers, error: prayerError } = await supabase
    .from('prayer_requests')
    .select('id, content, expires_at, user_id, profiles(last_name, first_name, gender, email)')
    .eq('status', 'active')
    .gte('expires_at', now.toISOString())
    .lte('expires_at', threeDaysFromNow.toISOString())

  if (prayerError) {
    return NextResponse.json({ error: prayerError.message }, { status: 500 })
  }

  if (!prayers || prayers.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // Find already-notified prayer IDs to avoid duplicates (fetch last 7 days, filter in memory)
  const { data: alreadySent } = await supabase
    .from('email_notifications')
    .select('payload')
    .eq('type', 'expiry_reminder')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  const alreadySentIds = new Set(
    (alreadySent ?? [])
      .map((n) => (n.payload as { prayer_id?: string }).prayer_id)
      .filter((id): id is string => !!id)
  )

  let sent = 0

  for (const prayer of prayers) {
    if (alreadySentIds.has(prayer.id)) continue

    const profile = prayer.profiles as {
      last_name: string
      first_name: string
      gender: string
      email?: string | null
    } | null

    if (!profile?.email) continue

    const displayName = formatDisplayName(
      { last_name: profile.last_name, first_name: profile.first_name, gender: profile.gender as Gender },
      'zh'
    )
    const expiresAt = new Date(prayer.expires_at).toLocaleDateString('zh-CN')

    await sendExpiryReminderEmail(profile.email, displayName, prayer.content, expiresAt)

    // Record that we sent this notification
    await supabase.from('email_notifications').insert({
      to_user_id: prayer.user_id,
      type: 'expiry_reminder',
      payload: { prayer_id: prayer.id },
      sent_at: new Date().toISOString(),
    })

    sent++
  }

  return NextResponse.json({ sent })
}
```

- [ ] **Step 2: Create `vercel.json`**

Check if `vercel.json` already exists. If not, create it:

```json
{
  "crons": [
    {
      "path": "/api/cron/notify",
      "schedule": "0 8 * * *"
    }
  ]
}
```

If it already exists, add the `crons` key to the existing JSON.

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add app/api/cron/notify/route.ts vercel.json
git commit -m "feat: add Vercel Cron expiry reminder email endpoint"
```

---

## Task 15: Phase 2 Deferred Fixes + Final Verification

**Files:**
- Modify: `app/[locale]/prayer/[id]/page.tsx` (locale-aware back link)
- Modify: `app/[locale]/submit/page.tsx` (locale-aware auth redirect)
- Modify: `app/[locale]/my/page.tsx` (locale-aware auth redirect)
- Modify: `app/[locale]/account/page.tsx` (locale-aware auth redirect)

- [ ] **Step 1: Fix locale-aware back link in prayer detail page**

In `app/[locale]/prayer/[id]/page.tsx`, the `params` already includes `locale`. Use it to build a locale-aware back link.

Read the current file first, then find the `Link href="/"` and update it:

```typescript
// Add to imports:
import { getLocale } from 'next-intl/server'

// In the component, before the return:
const locale = await getLocale()
const homeHref = locale === 'en' ? '/en' : '/'

// In JSX, replace href="/" with:
<Link href={homeHref} ...>
```

- [ ] **Step 2: Fix locale-aware auth redirects**

In `app/[locale]/submit/page.tsx`, `app/[locale]/my/page.tsx`, and `app/[locale]/account/page.tsx`, the redirect on unauthenticated access uses a hardcoded path without locale.

For each file, add locale-aware redirect. Pattern (read each file first to see exact code, then edit):

```typescript
// Add import:
import { getLocale } from 'next-intl/server'

// Before the auth check:
const locale = await getLocale()
const prefix = locale === 'en' ? '/en' : ''

// Update redirect calls:
// redirect('/auth/login?next=/submit')  →  redirect(`${prefix}/auth/login?next=${prefix}/submit`)
// redirect('/auth/login?next=/my')      →  redirect(`${prefix}/auth/login?next=${prefix}/my`)
// redirect('/auth/login?next=/account') →  redirect(`${prefix}/auth/login?next=${prefix}/account`)
```

- [ ] **Step 3: Run all tests**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npm run test:run
```

Expected: 22 tests pass.

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Production build**

```bash
cd /Users/jianchengsun/web-dev/prayer-web && npm run build 2>&1 | tail -30
```

Expected: build succeeds.

- [ ] **Step 6: Commit and push**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
git add app/[locale]/prayer app/[locale]/submit app/[locale]/my app/[locale]/account
git commit -m "fix: locale-aware back links and auth redirects"
git push origin main
```
