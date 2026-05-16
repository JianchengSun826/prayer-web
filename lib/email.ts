import { Resend } from 'resend'

// Lazily instantiated so that importing this module in tests (without an API
// key set) does not throw at module-evaluation time.
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

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

// ─── Send helpers (skip silently if API key not set) ──────────────────────────

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return
  await getResend().emails.send({ from: FROM, to, subject: '欢迎加入代祷同行', html: welcomeEmail(name) })
}

export async function sendAdminNotificationEmail(senderName: string, content: string): Promise<void> {
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) return
  await getResend().emails.send({
    from: FROM,
    to: process.env.ADMIN_EMAIL,
    subject: `新消息来自 ${senderName}`,
    html: adminNotificationEmail(senderName, content),
  })
}

export async function sendAdminReplyEmail(to: string, userName: string, replyContent: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  await getResend().emails.send({
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
  await getResend().emails.send({
    from: FROM,
    to,
    subject: '你的代祷事项即将到期',
    html: expiryReminderEmail(userName, prayerContent, expiresAt, siteUrl),
  })
}
