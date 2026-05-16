# Phase 3: Admin Panel + Email Notifications — Design Spec

**Date:** 2026-05-15
**Status:** Approved

---

## Goal

Build a fully functional admin panel and email notification system so admins can manage the site and users receive timely communications.

---

## Architecture

**Pattern:** API Routes + Client-side fetch (Option 2).

All admin pages are Client Components that fetch data from `/api/admin/` API Routes. This enables smooth in-place updates for search, filter, and pagination without full-page navigations. Write operations (archive, role change, reply) are also handled through API Routes. The Vercel Cron endpoint is a standard Next.js API Route.

**Admin role protection:** Every `/api/admin/` route verifies `profile.role === 'admin'` server-side and returns 403 for non-admins. The admin layout also redirects non-admin users at the page level.

---

## File Structure

```
app/
├── [locale]/admin/
│   ├── layout.tsx               # Left sidebar shell (Server Component, auth + role guard)
│   ├── page.tsx                 # redirect → /admin/dashboard
│   ├── dashboard/page.tsx       # Stats overview (Client Component)
│   ├── prayers/page.tsx         # Prayer management table (Client Component)
│   ├── users/page.tsx           # User management table (Client Component)
│   └── messages/page.tsx        # Message center (Client Component)
│
├── api/admin/
│   ├── stats/route.ts               # GET — dashboard statistics
│   ├── prayers/route.ts             # GET list
│   ├── prayers/[id]/route.ts        # PATCH archive or delete
│   ├── users/route.ts               # GET list
│   ├── users/[id]/route.ts          # PATCH role
│   ├── messages/route.ts            # GET list
│   ├── messages/[id]/route.ts       # PATCH mark-read
│   └── messages/[id]/reply/route.ts # POST reply (sends email + marks read)
│
└── api/cron/
    └── notify/route.ts          # Vercel Cron — expiry reminder emails

lib/
└── email.ts                     # Resend client + all email templates

actions/
└── auth.ts                      # Add: send welcome email on register (existing file)
```

---

## Admin Panel Pages

### Layout (`app/[locale]/admin/layout.tsx`)

Server Component. Verifies `profile.role === 'admin'` via `getUser()` + profiles lookup; redirects non-admins to `/`. Renders a fixed left sidebar with navigation links to the four sections. Sidebar uses the brand color `#1a3a5c` as background.

Sidebar nav links: 仪表盘 / 代祷管理 / 用户管理 / 消息中心. Active link highlighted with `#2d6a9f`.

### Dashboard (`/admin/dashboard`)

Fetches `/api/admin/stats`. Displays four stat cards:
- Active prayer count
- Registered user count
- Unread message count (badge on sidebar "消息中心" link — updates on page navigation, not real-time)
- Prayers expiring today

Below cards: a simple last-7-days bar chart for new prayer requests (pure CSS/div, no chart library).

### Prayer Management (`/admin/prayers`)

Fetches `/api/admin/prayers?status=&search=&page=`. Table columns: content preview, poster name, category badge, status badge, expiry date, actions.

Filters: status dropdown (all / active / expired / deleted), keyword search (debounced 300ms). Pagination: 20 per page, client-side page state.

Actions per row:
- **Archive** — PATCH `{ status: 'expired' }` (active prayers only)
- **Delete** — PATCH `{ status: 'deleted' }` (active or expired)

### User Management (`/admin/users`)

Fetches `/api/admin/users?search=&page=`. Table columns: display name, email, gender, role badge, registration date, actions.

Actions per row:
- **Promote to admin** — PATCH `{ role: 'admin' }` (non-admin users only)
- **Revoke admin** — PATCH `{ role: 'user' }` (admin users only, cannot revoke self)

Account deactivation is out of scope (requires Supabase Service Role key).

### Message Center (`/admin/messages`)

Fetches `/api/admin/messages?read=&page=`. List view (not table): sender name, content preview, timestamp, read/unread indicator.

Click to expand full message. Expanded view shows a reply textarea + "发送邮件" button. On submit:
- POST `/api/admin/messages/:id/reply` with reply content
- Server sends email to user via Resend
- Marks message as read
- Collapses the item and updates unread count

Filter: all / unread only.

---

## Email System

### Immediate emails (called directly from server code)

| Trigger | Recipient | Content |
|---------|-----------|---------|
| User registers | New user | Welcome message, site intro |
| User sends contact message | Admin (`ADMIN_EMAIL`) | Sender name + full message content |
| Admin replies to message | Message sender | Admin's reply text + link to site |

Welcome email is sent inside `registerAction` in `actions/auth.ts` after successful Supabase sign-up.

Admin notification email is sent inside `sendAdminMessageAction` in `actions/account.ts` after inserting into `admin_messages`.

Reply email is sent inside `POST /api/admin/messages/[id]/reply`.

### Scheduled emails (Vercel Cron)

**Endpoint:** `GET /api/cron/notify`

**Schedule:** Daily at UTC 08:00 (`0 8 * * *` in `vercel.json`)

**Logic:**
1. Verify `Authorization: Bearer $CRON_SECRET` header
2. Query `prayer_requests` where `status = 'active'` AND `expires_at` is between now and now+3 days
3. Cross-reference `email_notifications` table to skip already-notified prayers (`type = 'expiry_reminder'`)
4. For each new match: send expiry reminder email via Resend, insert row into `email_notifications`

**Email content:** Prayer content preview + expiry date + link to `/my` page to manage prayers.

### Email templates (`lib/email.ts`)

All templates are plain HTML strings. Language defaults to Chinese (no per-user language preference stored yet). Templates:
- `welcomeEmail(name: string)`
- `adminNotificationEmail(senderName: string, content: string)`
- `adminReplyEmail(userName: string, replyContent: string, siteUrl: string)`
- `expiryReminderEmail(userName: string, prayerContent: string, expiresAt: string, siteUrl: string)`

### Environment variables

Add to `.env.local` (leave blank now, configure before deploy):

```
RESEND_API_KEY=
ADMIN_EMAIL=
CRON_SECRET=
NEXT_PUBLIC_SITE_URL=
```

Add to `vercel.json` cron config after deploy.

---

## API Route Contracts

### `GET /api/admin/stats`
Returns: `{ activePrayers, totalUsers, unreadMessages, expiringToday }`

### `GET /api/admin/prayers`
Query params: `status` (all|active|expired|deleted), `search` (string), `page` (number, default 1)
Returns: `{ prayers: PrayerRequest[], total: number, page: number }`

### `PATCH /api/admin/prayers/[id]`
Body: `{ status: 'expired' | 'deleted' }`
Returns: `{ success: true }`

### `GET /api/admin/users`
Query params: `search` (string), `page` (number)
Returns: `{ users: Profile[], total: number, page: number }`

### `PATCH /api/admin/users/[id]`
Body: `{ role: 'admin' | 'user' }`
Returns: `{ success: true }`

### `GET /api/admin/messages`
Query params: `read` (all|unread), `page` (number)
Returns: `{ messages: AdminMessage[], total: number, unreadCount: number }`

### `PATCH /api/admin/messages/[id]`
Body: `{ read: true }`
Returns: `{ success: true }`

### `POST /api/admin/messages/[id]/reply`
Body: `{ content: string }`
Returns: `{ success: true }` (sends email + marks read)

### `GET /api/cron/notify`
Header: `Authorization: Bearer <CRON_SECRET>`
Returns: `{ sent: number }` — count of emails sent

---

## Known Issues Deferred from Phase 2

These existing issues will be addressed in Phase 3 Task 11 (final verification):
- Back links and auth redirects missing locale prefix (e.g., `href="/"` should be locale-aware)
- DB error fields ignored on homepage queries

---

## Out of Scope for Phase 3

- Account deactivation (requires Supabase Service Role key)
- Per-user email language preference
- Real-time unread message badge (polling or WebSocket)
- Prayer renewal flow (user extends expiry — Phase 4)
