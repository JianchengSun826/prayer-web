# Phase 1: Foundation + Database + Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap a Next.js + Supabase project with full bilingual support and a working email/password auth flow (register with first/last name + gender, login, forgot password).

**Architecture:** Next.js App Router with next-intl for i18n (Chinese default, English via `/en` prefix). Supabase handles auth and PostgreSQL. All auth mutations use Next.js Server Actions. Route protection via middleware.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, next-intl v3, @supabase/ssr, @supabase/supabase-js, Vitest + React Testing Library

---

## File Structure

```
prayer-web/
├── app/
│   ├── layout.tsx                      # Root layout (no locale, just sets up next-intl)
│   ├── [locale]/
│   │   ├── layout.tsx                  # Locale layout: fonts, Navbar
│   │   ├── page.tsx                    # Home (placeholder → Phase 2)
│   │   └── auth/
│   │       ├── login/
│   │       │   └── page.tsx
│   │       ├── register/
│   │       │   └── page.tsx
│   │       └── forgot/
│   │           └── page.tsx
├── components/
│   ├── nav/
│   │   ├── Navbar.tsx                  # Top nav bar with lang switcher
│   │   └── LangSwitcher.tsx            # 中/EN toggle button
│   └── auth/
│       ├── LoginForm.tsx               # Client component
│       └── RegisterForm.tsx            # Client component
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # Browser Supabase client (singleton)
│   │   └── server.ts                   # Server Supabase client (per-request)
│   ├── display-name.ts                 # formatDisplayName(profile, locale) util
│   └── types.ts                        # Shared TypeScript types
├── actions/
│   └── auth.ts                         # Server Actions: register, login, logout, resetPassword
├── supabase/
│   └── migrations/
│       └── 20260515000000_initial.sql  # All tables + RLS policies
├── messages/
│   ├── zh.json                         # Chinese strings
│   └── en.json                         # English strings
├── i18n/
│   ├── routing.ts                      # next-intl routing config
│   └── request.ts                      # next-intl server request config
├── middleware.ts                        # Supabase session refresh + next-intl routing
├── vitest.config.ts
└── vitest.setup.ts
```

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`

- [ ] **Step 1: Create the Next.js app**

```bash
cd /Users/jianchengsun/web-dev/prayer-web
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --no-turbopack
```

When prompted, accept all defaults.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install \
  next-intl \
  @supabase/supabase-js \
  @supabase/ssr \
  resend

npm install -D \
  vitest \
  @vitejs/plugin-react \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jsdom
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

Create `vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Verify setup**

```bash
npm run test:run
```

Expected: "No test files found" (zero tests, zero failures).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with Vitest"
```

---

## Task 2: Environment Variables

**Files:**
- Create: `.env.local`, `.env.example`

- [ ] **Step 1: Create Supabase project**

Go to https://supabase.com, create a new project named `prayer-web`. Wait for it to finish provisioning (~2 minutes). From Project Settings → API, copy:
- Project URL
- `anon` public key
- `service_role` secret key (keep this private)

- [ ] **Step 2: Create .env.local**

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=re_placeholder
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF
```

Fill in the actual values from Supabase.

- [ ] **Step 3: Create .env.example (safe to commit)**

```bash
cat > .env.example << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF
```

- [ ] **Step 4: Ensure .env.local is gitignored**

Verify `.gitignore` contains `.env.local` (create-next-app adds this automatically).

- [ ] **Step 5: Commit**

```bash
git add .env.example .gitignore next.config.ts
git commit -m "feat: add environment variable configuration"
```

---

## Task 3: TypeScript Types

**Files:**
- Create: `lib/types.ts`
- Test: `lib/__tests__/types.test.ts`

- [ ] **Step 1: Write the types**

Create `lib/types.ts`:

```typescript
export type Gender = 'brother' | 'sister'
export type UserRole = 'user' | 'admin'
export type PrayerStatus = 'active' | 'expired' | 'deleted'
export type NotificationType = 'expiry_reminder' | 'new_admin_message'

export interface Profile {
  id: string
  last_name: string
  first_name: string
  gender: Gender
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Category {
  id: number
  name_zh: string
  name_en: string
  color: string
}

export interface PrayerRequest {
  id: string
  user_id: string
  category_id: number
  content: string
  status: PrayerStatus
  expires_at: string
  created_at: string
  // joined
  profiles?: Pick<Profile, 'last_name' | 'first_name' | 'gender'>
  categories?: Pick<Category, 'name_zh' | 'name_en' | 'color'>
}

export interface AdminMessage {
  id: string
  user_id: string
  content: string
  read_at: string | null
  created_at: string
  profiles?: Pick<Profile, 'last_name' | 'first_name' | 'gender'>
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 4: Display Name Utility (TDD)

**Files:**
- Create: `lib/display-name.ts`
- Test: `lib/__tests__/display-name.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/display-name.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatDisplayName } from '../display-name'
import type { Profile } from '../types'

const brother: Pick<Profile, 'last_name' | 'first_name' | 'gender'> = {
  last_name: '王',
  first_name: 'James',
  gender: 'brother',
}

const sister: Pick<Profile, 'last_name' | 'first_name' | 'gender'> = {
  last_name: '李',
  first_name: 'Mary',
  gender: 'sister',
}

describe('formatDisplayName', () => {
  it('returns 姓+弟兄 in Chinese for brother', () => {
    expect(formatDisplayName(brother, 'zh')).toBe('王弟兄')
  })

  it('returns 姓+姊妹 in Chinese for sister', () => {
    expect(formatDisplayName(sister, 'zh')).toBe('李姊妹')
  })

  it('returns Bro. + first_name in English for brother', () => {
    expect(formatDisplayName(brother, 'en')).toBe('Bro. James')
  })

  it('returns Sis. + first_name in English for sister', () => {
    expect(formatDisplayName(sister, 'en')).toBe('Sis. Mary')
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm run test:run
```

Expected: FAIL — "Cannot find module '../display-name'"

- [ ] **Step 3: Implement the utility**

Create `lib/display-name.ts`:

```typescript
import type { Profile } from './types'

type ProfileSubset = Pick<Profile, 'last_name' | 'first_name' | 'gender'>

export function formatDisplayName(
  profile: ProfileSubset,
  locale: 'zh' | 'en'
): string {
  if (locale === 'zh') {
    return profile.gender === 'brother'
      ? `${profile.last_name}弟兄`
      : `${profile.last_name}姊妹`
  }
  return profile.gender === 'brother'
    ? `Bro. ${profile.first_name}`
    : `Sis. ${profile.first_name}`
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm run test:run
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add lib/display-name.ts lib/__tests__/display-name.test.ts
git commit -m "feat: add formatDisplayName utility with tests"
```

---

## Task 5: Database Schema & RLS

**Files:**
- Create: `supabase/migrations/20260515000000_initial.sql`

- [ ] **Step 1: Install Supabase CLI**

```bash
npm install -D supabase
npx supabase login
npx supabase init
npx supabase link --project-ref YOUR_PROJECT_REF
```

Get `YOUR_PROJECT_REF` from your Supabase project URL: `https://[PROJECT_REF].supabase.co`

- [ ] **Step 2: Create migration file**

Create `supabase/migrations/20260515000000_initial.sql`:

```sql
-- ==========================================
-- TABLES
-- ==========================================

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  last_name  text not null,
  first_name text not null,
  gender     text not null check (gender in ('brother', 'sister')),
  role       text not null default 'user' check (role in ('user', 'admin')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  id       serial primary key,
  name_zh  text not null,
  name_en  text not null,
  color    text not null default '#4a90d9'
);

create table public.prayer_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  category_id int not null references public.categories(id),
  content     text not null,
  status      text not null default 'active' check (status in ('active', 'expired', 'deleted')),
  expires_at  timestamptz not null default now() + interval '30 days',
  created_at  timestamptz not null default now()
);

create table public.email_notifications (
  id          uuid primary key default gen_random_uuid(),
  to_user_id  uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in ('expiry_reminder', 'new_admin_message')),
  payload     jsonb not null default '{}',
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table public.admin_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ==========================================
-- SEED: default categories
-- ==========================================

insert into public.categories (name_zh, name_en, color) values
  ('健康', 'Health',   '#4a90d9'),
  ('家庭', 'Family',   '#34a853'),
  ('工作', 'Work',     '#fbbc04'),
  ('教会', 'Church',   '#ea4335'),
  ('宣教', 'Mission',  '#9c27b0'),
  ('其他', 'Other',    '#9e9e9e');

-- ==========================================
-- RLS: Enable
-- ==========================================

alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.prayer_requests   enable row level security;
alter table public.email_notifications enable row level security;
alter table public.admin_messages    enable row level security;

-- ==========================================
-- RLS: profiles
-- ==========================================

-- Anyone can read profiles (needed for display names)
create policy "profiles_select_all"
  on public.profiles for select using (true);

-- Users can update their own profile
create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id);

-- profile is created via trigger (not direct insert by user)

-- ==========================================
-- RLS: categories (public read, admin write)
-- ==========================================

create policy "categories_select_all"
  on public.categories for select using (true);

create policy "categories_admin_all"
  on public.categories for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ==========================================
-- RLS: prayer_requests
-- ==========================================

-- Anyone can read active prayers
create policy "prayers_select_active"
  on public.prayer_requests for select
  using (status = 'active');

-- Admins can read all prayers (including deleted/expired)
create policy "prayers_select_admin"
  on public.prayer_requests for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Logged-in users can insert
create policy "prayers_insert_own"
  on public.prayer_requests for insert
  with check (auth.uid() = user_id);

-- Users can delete (soft: set status=deleted) their own active prayers
create policy "prayers_update_own"
  on public.prayer_requests for update
  using (auth.uid() = user_id and status = 'active');

-- Admins can update any prayer
create policy "prayers_update_admin"
  on public.prayer_requests for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ==========================================
-- RLS: admin_messages
-- ==========================================

-- Logged-in users can insert
create policy "messages_insert_own"
  on public.admin_messages for insert
  with check (auth.uid() = user_id);

-- Only admins can read messages
create policy "messages_select_admin"
  on public.admin_messages for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Only admins can update (mark as read)
create policy "messages_update_admin"
  on public.admin_messages for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ==========================================
-- RLS: email_notifications (service role only)
-- ==========================================

-- No user-facing policies: only service role / Edge Function accesses this table

-- ==========================================
-- TRIGGER: auto-create profile on signup
-- ==========================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, last_name, first_name, gender)
  values (
    new.id,
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'gender'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

- [ ] **Step 3: Apply migration to Supabase**

```bash
npx supabase db push
```

Expected output: migration applied successfully.

- [ ] **Step 4: Verify in Supabase Studio**

Open https://supabase.com/dashboard → your project → Table Editor. You should see tables: `profiles`, `categories`, `prayer_requests`, `email_notifications`, `admin_messages`. Check that `categories` has 6 rows (the default seeds).

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema, RLS policies, and seed data"
```

---

## Task 6: Supabase Client Utilities

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Create browser client**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create server client**

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cookies can't be set, middleware handles this
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/
git commit -m "feat: add Supabase browser and server clients"
```

---

## Task 7: Middleware (Auth Session + i18n Routing)

**Files:**
- Create: `middleware.ts`
- Create: `i18n/routing.ts`
- Create: `i18n/request.ts`

- [ ] **Step 1: Create i18n routing config**

Create `i18n/routing.ts`:

```typescript
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
  localePrefix: 'as-needed', // Chinese: no prefix, English: /en/...
})
```

- [ ] **Step 2: Create i18n server request config**

Create `i18n/request.ts`:

```typescript
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  if (!locale || !routing.locales.includes(locale as 'zh' | 'en')) {
    locale = routing.defaultLocale
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
```

- [ ] **Step 3: Create middleware**

Create `middleware.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

export async function middleware(request: NextRequest) {
  // Run next-intl middleware first
  const response = intlMiddleware(request)

  // Refresh Supabase session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname.includes('/auth/')
  const isAdminPage = pathname.includes('/admin')
  const isSubmitPage = pathname.includes('/submit')
  const isMyPage = pathname.includes('/my')
  const isAccountPage = pathname.includes('/account')

  const protectedPages = [isAdminPage, isSubmitPage, isMyPage, isAccountPage]
  const isProtected = protectedPages.some(Boolean)

  // Redirect unauthenticated users away from protected pages
  if (!user && isProtected) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 4: Commit**

```bash
git add middleware.ts i18n/
git commit -m "feat: add middleware for auth session refresh and i18n routing"
```

---

## Task 8: i18n Message Files

**Files:**
- Create: `messages/zh.json`
- Create: `messages/en.json`

- [ ] **Step 1: Create Chinese messages**

Create `messages/zh.json`:

```json
{
  "nav": {
    "home": "首页",
    "submit": "发布代祷",
    "my": "我的代祷",
    "account": "账号设置",
    "admin": "管理后台",
    "login": "登录",
    "register": "注册",
    "logout": "退出登录"
  },
  "auth": {
    "login": "登录",
    "register": "注册",
    "email": "邮箱地址",
    "password": "密码",
    "newPassword": "设置密码",
    "lastName": "姓",
    "firstName": "名",
    "gender": "身份",
    "brother": "弟兄 / Brother",
    "sister": "姊妹 / Sister",
    "forgotPassword": "忘记密码？",
    "sendResetEmail": "发送重置邮件",
    "resetSent": "重置链接已发送，请检查邮箱",
    "noAccount": "还没有账号？",
    "hasAccount": "已有账号？",
    "goLogin": "去登录",
    "goRegister": "立即注册",
    "verifyEmail": "注册成功！请检查邮箱点击验证链接后即可登录。",
    "genderHint": "中文显示「王弟兄」，英文显示「Bro. James」"
  },
  "home": {
    "hero": "代祷同行",
    "heroSub": "Standing in the Gap Together",
    "submitBtn": "✍️ 发布代祷事项",
    "allCategories": "全部",
    "expandCard": "展开全文 ▾",
    "collapseCard": "收起 ▴",
    "daysLeft": "{days} 天后到期",
    "expired": "已归档"
  },
  "submit": {
    "title": "发布代祷事项",
    "contentLabel": "代祷内容",
    "contentPlaceholder": "请分享你的代祷需要……",
    "categoryLabel": "分类",
    "submit": "发布代祷事项",
    "cancel": "取消",
    "posterNote": "发布后将以「{name}」的名义显示"
  },
  "my": {
    "title": "我的代祷事项",
    "noItems": "你还没有发布过代祷事项",
    "active": "进行中",
    "expired": "已归档",
    "delete": "删除",
    "deleteConfirm": "确定要删除这条代祷事项吗？"
  },
  "detail": {
    "back": "← 返回列表",
    "contactAdmin": "✉️ 联系管理员",
    "contactAdminPlaceholder": "请描述你的问题或建议……",
    "sendMessage": "发送留言",
    "messageSent": "留言已发送，管理员将尽快处理。"
  },
  "account": {
    "title": "账号设置",
    "basicInfo": "基本信息",
    "lastName": "姓",
    "firstName": "名",
    "gender": "身份",
    "email": "邮箱地址（不可修改）",
    "save": "保存修改",
    "saved": "已保存",
    "changePassword": "修改密码",
    "currentPassword": "当前密码",
    "newPassword": "新密码",
    "updatePassword": "更新密码",
    "contactAdmin": "联系管理员"
  },
  "admin": {
    "dashboard": "管理后台",
    "activePrayers": "进行中的代祷",
    "totalUsers": "注册用户",
    "unreadMessages": "未读留言",
    "prayers": "管理代祷事项",
    "users": "管理用户",
    "categories": "管理分类",
    "messages": "用户留言",
    "delete": "删除",
    "disable": "禁用账号",
    "enable": "恢复账号",
    "setAdmin": "设为管理员",
    "markRead": "标为已读",
    "unread": "未读",
    "read": "已读",
    "active": "正常",
    "disabled": "已禁用",
    "addCategory": "+ 新增分类",
    "edit": "编辑",
    "displayAs": "公开显示"
  },
  "common": {
    "loading": "加载中…",
    "error": "出现错误，请稍后再试",
    "confirm": "确认",
    "cancel": "取消"
  }
}
```

- [ ] **Step 2: Create English messages**

Create `messages/en.json`:

```json
{
  "nav": {
    "home": "Home",
    "submit": "Submit Prayer",
    "my": "My Prayers",
    "account": "Account",
    "admin": "Admin",
    "login": "Login",
    "register": "Sign Up",
    "logout": "Logout"
  },
  "auth": {
    "login": "Login",
    "register": "Sign Up",
    "email": "Email address",
    "password": "Password",
    "newPassword": "Set password",
    "lastName": "Last name",
    "firstName": "First name",
    "gender": "I am a",
    "brother": "Brother",
    "sister": "Sister",
    "forgotPassword": "Forgot password?",
    "sendResetEmail": "Send reset email",
    "resetSent": "Reset link sent — check your inbox",
    "noAccount": "No account yet?",
    "hasAccount": "Already have an account?",
    "goLogin": "Login",
    "goRegister": "Sign Up",
    "verifyEmail": "Registered! Please check your email to verify your account before logging in.",
    "genderHint": "You'll appear as \"Bro. James\" or \"Sis. Mary\""
  },
  "home": {
    "hero": "Prayer Together",
    "heroSub": "代祷同行",
    "submitBtn": "✍️ Submit a Prayer",
    "allCategories": "All",
    "expandCard": "Read more ▾",
    "collapseCard": "Show less ▴",
    "daysLeft": "{days} days left",
    "expired": "Archived"
  },
  "submit": {
    "title": "Submit a Prayer Request",
    "contentLabel": "Prayer request",
    "contentPlaceholder": "Share your prayer need…",
    "categoryLabel": "Category",
    "submit": "Submit Prayer",
    "cancel": "Cancel",
    "posterNote": "This will be posted as \"{name}\""
  },
  "my": {
    "title": "My Prayer Requests",
    "noItems": "You haven't submitted any prayer requests yet",
    "active": "Active",
    "expired": "Archived",
    "delete": "Delete",
    "deleteConfirm": "Are you sure you want to delete this prayer request?"
  },
  "detail": {
    "back": "← Back to list",
    "contactAdmin": "✉️ Contact Admin",
    "contactAdminPlaceholder": "Describe your question or suggestion…",
    "sendMessage": "Send message",
    "messageSent": "Message sent. The admin will get back to you soon."
  },
  "account": {
    "title": "Account Settings",
    "basicInfo": "Basic Information",
    "lastName": "Last name",
    "firstName": "First name",
    "gender": "Identity",
    "email": "Email (cannot be changed)",
    "save": "Save changes",
    "saved": "Saved",
    "changePassword": "Change Password",
    "currentPassword": "Current password",
    "newPassword": "New password",
    "updatePassword": "Update password",
    "contactAdmin": "Contact Admin"
  },
  "admin": {
    "dashboard": "Admin Dashboard",
    "activePrayers": "Active Prayers",
    "totalUsers": "Registered Users",
    "unreadMessages": "Unread Messages",
    "prayers": "Manage Prayers",
    "users": "Manage Users",
    "categories": "Manage Categories",
    "messages": "User Messages",
    "delete": "Delete",
    "disable": "Disable Account",
    "enable": "Enable Account",
    "setAdmin": "Make Admin",
    "markRead": "Mark as read",
    "unread": "Unread",
    "read": "Read",
    "active": "Active",
    "disabled": "Disabled",
    "addCategory": "+ Add Category",
    "edit": "Edit",
    "displayAs": "Shown as"
  },
  "common": {
    "loading": "Loading…",
    "error": "Something went wrong, please try again",
    "confirm": "Confirm",
    "cancel": "Cancel"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add messages/
git commit -m "feat: add Chinese and English i18n message files"
```

---

## Task 9: App Layout & next.config

**Files:**
- Modify: `next.config.ts`
- Create: `app/layout.tsx`
- Create: `app/[locale]/layout.tsx`
- Create: `app/[locale]/page.tsx`

- [ ] **Step 1: Configure next.config.ts**

Replace the contents of `next.config.ts`:

```typescript
import { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const config: NextConfig = {}

export default withNextIntl(config)
```

- [ ] **Step 2: Create root layout**

Replace `app/layout.tsx`:

```typescript
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
```

- [ ] **Step 3: Create locale layout**

Create `app/[locale]/layout.tsx`:

```typescript
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '代祷同行 | Prayer Together',
  description: '教会代祷事项平台 / Church Prayer Request Platform',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!routing.locales.includes(locale as 'zh' | 'en')) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

Note: Move `app/globals.css` to `app/[locale]/globals.css`, or keep it in `app/` and import from layout. Keep whichever create-next-app created.

- [ ] **Step 4: Create placeholder home page**

Create `app/[locale]/page.tsx`:

```typescript
import { useTranslations } from 'next-intl'

export default function HomePage() {
  const t = useTranslations('home')
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-bold text-blue-700">{t('hero')}</h1>
    </main>
  )
}
```

- [ ] **Step 5: Start dev server and verify**

```bash
npm run dev
```

Open http://localhost:3000 — should show "代祷同行".
Open http://localhost:3000/en — should show "Prayer Together".

- [ ] **Step 6: Commit**

```bash
git add app/ next.config.ts
git commit -m "feat: add locale layout and next-intl integration"
```

---

## Task 10: Navbar Component

**Files:**
- Create: `components/nav/Navbar.tsx`
- Create: `components/nav/LangSwitcher.tsx`
- Modify: `app/[locale]/layout.tsx`

- [ ] **Step 1: Create LangSwitcher**

Create `components/nav/LangSwitcher.tsx`:

```typescript
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
```

- [ ] **Step 2: Create Navbar**

Create `components/nav/Navbar.tsx`:

```typescript
import { useTranslations } from 'next-intl'
import { Link } from 'next-intl/routing' // use next-intl's locale-aware Link - wait, we'll use next/link since we handle locale manually
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
```

Create `components/nav/NavLinks.tsx`:

```typescript
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
```

- [ ] **Step 3: Add Navbar to locale layout**

In `app/[locale]/layout.tsx`, add the Navbar import and usage:

```typescript
import Navbar from '@/components/nav/Navbar'

// Inside the <body>:
<body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
  <NextIntlClientProvider messages={messages}>
    <Navbar />
    <main>{children}</main>
  </NextIntlClientProvider>
</body>
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Open http://localhost:3000 — should see the blue navbar with "✟ 代祷同行" and "中 / EN" button. Clicking the lang button should switch to /en.

- [ ] **Step 5: Commit**

```bash
git add components/nav/ app/[locale]/layout.tsx
git commit -m "feat: add Navbar with lang switcher and auth-aware nav links"
```

---

## Task 11: Server Actions for Auth

**Files:**
- Create: `actions/auth.ts`

- [ ] **Step 1: Create auth server actions**

Create `actions/auth.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Gender } from '@/lib/types'

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

  return { success: true }
}

export async function loginAction(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect('/')
}

export async function forgotPasswordAction(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/auth.ts
git commit -m "feat: add auth server actions (register, login, forgot password)"
```

---

## Task 12: Auth Pages

**Files:**
- Create: `app/[locale]/auth/register/page.tsx`
- Create: `app/[locale]/auth/login/page.tsx`
- Create: `app/[locale]/auth/forgot/page.tsx`
- Create: `components/auth/RegisterForm.tsx`
- Create: `components/auth/LoginForm.tsx`
- Create: `components/auth/ForgotForm.tsx`

- [ ] **Step 1: Create RegisterForm component**

Create `components/auth/RegisterForm.tsx`:

```typescript
'use client'

import { useTranslations } from 'next-intl'
import { registerAction } from '@/actions/auth'
import { useState } from 'react'
import Link from 'next/link'

export default function RegisterForm() {
  const t = useTranslations('auth')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')
    const result = await registerAction(new FormData(e.currentTarget))
    setPending(false)
    if (result?.error) setError(result.error)
    else setSuccess(true)
  }

  if (success) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
        {t('verifyEmail')}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">{t('lastName')}</label>
          <input name="last_name" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">{t('firstName')}</label>
          <input name="first_name" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">{t('gender')}</label>
        <div className="grid grid-cols-2 gap-3">
          {(['brother', 'sister'] as const).map((g) => (
            <label key={g} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
              <input type="radio" name="gender" value={g} required className="accent-blue-600" defaultChecked={g === 'brother'} />
              {t(g)}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">{t('genderHint')}</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{t('email')}</label>
        <input name="email" type="email" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{t('newPassword')}</label>
        <input name="password" type="password" required minLength={6} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={pending} className="w-full rounded-lg bg-[#2d6a9f] py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60">
        {pending ? '...' : t('register')}
      </button>

      <p className="text-center text-sm text-gray-500">
        {t('hasAccount')}{' '}
        <Link href="/auth/login" className="text-blue-600 hover:underline">{t('goLogin')}</Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 2: Create register page**

Create `app/[locale]/auth/register/page.tsx`:

```typescript
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
```

- [ ] **Step 3: Create LoginForm component**

Create `components/auth/LoginForm.tsx`:

```typescript
'use client'

import { useTranslations } from 'next-intl'
import { loginAction } from '@/actions/auth'
import { useState } from 'react'
import Link from 'next/link'

export default function LoginForm() {
  const t = useTranslations('auth')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')
    const result = await loginAction(new FormData(e.currentTarget))
    setPending(false)
    if (result?.error) setError(result.error)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{t('email')}</label>
        <input name="email" type="email" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{t('password')}</label>
        <input name="password" type="password" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      </div>
      <div className="text-right">
        <Link href="/auth/forgot" className="text-xs text-blue-600 hover:underline">{t('forgotPassword')}</Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={pending} className="w-full rounded-lg bg-[#2d6a9f] py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60">
        {pending ? '...' : t('login')}
      </button>

      <p className="text-center text-sm text-gray-500">
        {t('noAccount')}{' '}
        <Link href="/auth/register" className="text-blue-600 hover:underline">{t('goRegister')}</Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 4: Create login page**

Create `app/[locale]/auth/login/page.tsx`:

```typescript
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
```

- [ ] **Step 5: Create ForgotForm and page**

Create `components/auth/ForgotForm.tsx`:

```typescript
'use client'

import { useTranslations } from 'next-intl'
import { forgotPasswordAction } from '@/actions/auth'
import { useState } from 'react'

export default function ForgotForm() {
  const t = useTranslations('auth')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')
    const result = await forgotPasswordAction(new FormData(e.currentTarget))
    setPending(false)
    if (result?.error) setError(result.error)
    else setMessage(t('resetSent'))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{t('email')}</label>
        <input name="email" type="email" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700 bg-green-50 rounded p-3">{message}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-[#2d6a9f] py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60">
        {pending ? '...' : t('sendResetEmail')}
      </button>
    </form>
  )
}
```

Create `app/[locale]/auth/forgot/page.tsx`:

```typescript
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
```

- [ ] **Step 6: Verify auth flow end-to-end**

```bash
npm run dev
```

1. Go to http://localhost:3000/auth/register
2. Fill in: 姓=王, 名=James, 弟兄, email=test@example.com, password=test123
3. Submit → should show "注册成功！请检查邮箱…"
4. Check Supabase Dashboard → Authentication → Users — new user should appear
5. Check Table Editor → profiles — new profile should appear with last_name=王, first_name=James, gender=brother
6. Go to http://localhost:3000/auth/login, login with the same credentials
7. Should redirect to home page, navbar should show "退出登录"
8. Go to http://localhost:3000/auth/forgot, enter email → should show success message

- [ ] **Step 7: Commit**

```bash
git add app/[locale]/auth/ components/auth/ actions/auth.ts
git commit -m "feat: add register, login, and forgot password pages"
```

---

## Task 13: Final Verification & Push

- [ ] **Step 1: Run all tests**

```bash
npm run test:run
```

Expected: PASS — 4 tests (display name utility)

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 4: Confirm Phase 1 complete**

Phase 1 delivers:
- ✅ Next.js 15 + Tailwind + TypeScript project
- ✅ Supabase database with all tables, RLS policies, and seed categories
- ✅ next-intl bilingual routing (中文 default, /en prefix)
- ✅ Supabase auth middleware + session refresh
- ✅ Register page (first/last name + gender)
- ✅ Login page
- ✅ Forgot password page
- ✅ Navbar with language switcher and auth-aware links
- ✅ `formatDisplayName` utility with tests

Proceed to Phase 2 plan: prayer request list, detail, submit, my prayers, account.
