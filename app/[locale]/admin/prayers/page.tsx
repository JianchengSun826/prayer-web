'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatDisplayName } from '@/lib/display-name'
import type { PrayerRequest } from '@/lib/types'

interface PrayersResponse {
  prayers: PrayerRequest[]
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
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => { setLoading(false); setData(null) })
  }, [status, debouncedSearch, page])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleAction(id: string, newStatus: 'expired' | 'deleted') {
    const label = newStatus === 'expired' ? '归档' : '删除'
    if (!confirm(`确认${label}这条代祷事项？`)) return
    setActionPending(id)
    const res = await fetch(`/api/admin/prayers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setActionPending(null)
    if (!res.ok) {
      alert(`操作失败，请重试`)
      return
    }
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
