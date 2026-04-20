import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import DiagnosisModal from '../components/DiagnosisModal'

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function Diagnosis() {
  const { diagnosisRecords, deleteDiagnosisRecord } = useStore()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)

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

      {diagnosisRecords.length === 0 ? (
        <div className="text-center text-gray-400 py-20 text-sm">
          <p className="text-3xl mb-3">🔍</p>
          <p>还没有诊断记录</p>
          <p className="mt-1">点击右上角「新诊断」开始分析吧</p>
        </div>
      ) : (
        <div className="space-y-2">
          {diagnosisRecords.map((record) => (
            <div
              key={record.id}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between hover:border-rose-200 cursor-pointer transition-colors"
              onClick={() => navigate(`/diagnosis/${record.id}`)}
            >
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {record.positioning || '未填写定位'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  分析了 {record.noteCount} 篇
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">{formatDate(record.createdAt)}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                    {record.model}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('确认删除该诊断记录？')) deleteDiagnosisRecord(record.id)
                  }}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded border border-transparent hover:border-red-200"
                >
                  删除
                </button>
                <span className="text-gray-300">→</span>
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
