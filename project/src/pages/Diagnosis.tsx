import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import DiagnosisModal from '../components/DiagnosisModal'

function formatDate(ts: number) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

interface AccountGroup {
  accountId: string   // userId 或 fallback key
  userName: string
  latestTime: number
  totalCount: number
  totalNotes: number
  records: ReturnType<typeof useStore>['diagnosisRecords']
}

export default function Diagnosis() {
  const { diagnosisRecords } = useStore()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)

  const groups = useMemo<AccountGroup[]>(() => {
    const map = new Map<string, AccountGroup>()
    for (const r of diagnosisRecords) {
      // 没有 userId 的旧记录用 `manual-${r.id}` 单独分组
      const key = r.userId || `manual-${r.id}`
      if (!map.has(key)) {
        map.set(key, {
          accountId: key,
          userName: r.userName || r.positioning || '手动粘贴',
          latestTime: r.createdAt,
          totalCount: 0,
          totalNotes: 0,
          records: [],
        })
      }
      const g = map.get(key)!
      g.records.push(r)
      g.totalCount += 1
      g.totalNotes += r.noteCount
      if (r.createdAt > g.latestTime) {
        g.latestTime = r.createdAt
        g.userName = r.userName || r.positioning || '手动粘贴'
      }
    }
    return Array.from(map.values()).sort((a, b) => b.latestTime - a.latestTime)
  }, [diagnosisRecords])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-800">账号诊断</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="px-3 py-1.5 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
        >
          + 新诊断
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center text-gray-400 py-20 text-sm">
          <p className="text-3xl mb-3">🔍</p>
          <p>还没有诊断记录</p>
          <p className="mt-1">点击右上角「新诊断」开始分析吧</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <div
              key={g.accountId}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-rose-200 cursor-pointer transition-colors"
              onClick={() => navigate(`/diagnosis/account/${encodeURIComponent(g.accountId)}`)}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{g.userName}</p>
                  {g.accountId.startsWith('manual-') ? (
                    <p className="text-xs text-gray-400 mt-0.5">手动粘贴</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">ID: {g.accountId}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">最近诊断：{formatDate(g.latestTime)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    诊断 {g.totalCount} 次 · 共分析 {g.totalNotes} 篇
                  </p>
                </div>
                <span className="text-gray-300 ml-4 shrink-0">→</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <DiagnosisModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => setModalOpen(false)}
      />
    </div>
  )
}
