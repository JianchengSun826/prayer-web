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
