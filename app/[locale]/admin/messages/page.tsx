'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatDisplayName } from '@/lib/display-name'
import type { AdminMessage, Profile } from '@/lib/types'

interface MessageRow extends Omit<AdminMessage, 'profiles'> {
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
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => { setLoading(false); setData(null) })
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
                    <div className="min-w-0 flex-1">
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
