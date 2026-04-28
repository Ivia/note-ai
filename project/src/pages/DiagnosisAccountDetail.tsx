import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import type { DiagnosisRecord } from '../lib/store'
import MarkdownView from '../components/MarkdownView'

function formatDate(ts: number) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

function RecordRow({ record, onDelete }: { record: DiagnosisRecord; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-start gap-2 px-4 py-3">
        {/* 左：文字信息，点击展开/收起 */}
        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          <p className="text-xs text-gray-500">
            {formatDate(record.createdAt)} · {record.noteCount} 篇 ·{' '}
            <span className="font-mono">{record.model}</span>
          </p>
          {record.summary ? (
            <p className="text-sm font-semibold text-gray-800 mt-1 leading-snug">
              {record.summary}
            </p>
          ) : (
            <p className="text-sm text-gray-400 mt-1 italic">（无摘要）</p>
          )}
        </button>

        {/* 右：删除 + 展开收起，两个独立按钮明确分开 */}
        <div className="flex items-center gap-3 shrink-0 mt-0.5">
          <button
            onClick={onDelete}
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            删除
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {expanded ? '收起 ↑' : '展开 ↓'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <MarkdownView content={record.content} />
        </div>
      )}
    </div>
  )
}

export default function DiagnosisAccountDetail() {
  const { accountId } = useParams<{ accountId: string }>()
  const navigate = useNavigate()
  const { diagnosisRecords, deleteDiagnosisRecord } = useStore()

  const decodedId = accountId ? decodeURIComponent(accountId) : ''

  const records = useMemo(() =>
    diagnosisRecords
      .filter((r) => {
        const key = r.userId || `manual-${r.id}`
        return key === decodedId
      })
      .sort((a, b) => b.createdAt - a.createdAt),
    [diagnosisRecords, decodedId]
  )

  if (records.length === 0) {
    return (
      <div className="text-center text-gray-400 py-20 text-sm">
        记录不存在，<button onClick={() => navigate('/diagnosis')} className="underline">返回列表</button>
      </div>
    )
  }

  const latest = records[0]
  const userName = latest.userName || latest.positioning || '手动粘贴'
  const isManual = decodedId.startsWith('manual-')

  function handleDelete(id: string) {
    if (!confirm('确认删除该诊断记录？')) return
    deleteDiagnosisRecord(id)
    if (records.length <= 1) navigate('/diagnosis')
  }

  return (
    <div className="space-y-5">
      <div>
        <button
          onClick={() => navigate('/diagnosis')}
          className="text-sm text-gray-500 hover:text-gray-800 mb-3 inline-block"
        >
          ← 返回列表
        </button>
        <h1 className="text-base font-semibold text-gray-800">{userName}</h1>
        {!isManual && latest.userRedId && (
          <p className="text-xs text-gray-400 mt-0.5 font-mono">小红书号: {latest.userRedId}</p>
        )}
      </div>

      <div className="space-y-2">
        {records.map((r) => (
          <RecordRow key={r.id} record={r} onDelete={() => handleDelete(r.id)} />
        ))}
      </div>
    </div>
  )
}
