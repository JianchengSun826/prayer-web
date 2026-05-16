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

          {stats?.dailyCounts && (() => {
            const maxCount = Math.max(...stats.dailyCounts.map((d) => d.count), 1)
            return (
              <div className="mt-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold text-gray-700">近 7 天新增代祷</h2>
                <div className="flex h-24 items-end gap-2">
                  {stats.dailyCounts.map(({ date, count }) => {
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
            )
          })()}
        </>
      )}
    </div>
  )
}
