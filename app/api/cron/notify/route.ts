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

    const profile = prayer.profiles as unknown as {
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
