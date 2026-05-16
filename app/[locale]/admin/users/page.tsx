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
      .catch(() => { setLoading(false); setData(null) })
  }, [debouncedSearch, page])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleRoleChange(id: string, newRole: 'admin' | 'user') {
    const label = newRole === 'admin' ? '提升为管理员' : '撤销管理员'
    if (!confirm(`确认${label}？`)) return
    setActionPending(id)
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    setActionPending(null)
    if (!res.ok) {
      alert('操作失败，请重试')
      return
    }
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
