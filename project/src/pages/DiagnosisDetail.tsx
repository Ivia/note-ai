import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function DiagnosisDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { diagnosisRecords } = useStore()
  const record = diagnosisRecords.find((r) => r.id === id)

  if (!record) {
    return (
      <div className="text-center text-gray-400 py-20 text-sm">
        记录不存在，<button onClick={() => navigate('/diagnosis')} className="underline">返回列表</button>
      </div>
    )
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
        <h1 className="text-base font-semibold text-gray-800">
          {record.positioning || '未填写定位'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">分析了 {record.noteCount} 篇笔记</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">{formatDate(record.createdAt)}</span>
          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
            {record.model}
          </span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {record.content}
        </div>
      </div>
    </div>
  )
}
