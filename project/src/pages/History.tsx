import { useState } from 'react'
import { useStore } from '../lib/store'
import type { HistoryItem } from '../lib/store'

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function History() {
  const { history, deleteHistory, clearHistory } = useStore()
  const [selected, setSelected] = useState<HistoryItem | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleCopy(content: string) {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleExport(item: HistoryItem) {
    const blob = new Blob([item.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${item.topic.slice(0, 20)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelected(null); setCopied(false) }}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            ← 返回列表
          </button>
          <span className="text-sm text-gray-400">{formatDate(selected.createdAt)}</span>
        </div>
        <h2 className="text-base font-semibold text-gray-800">{selected.topic}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleCopy(selected.content)}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {copied ? '已复制 ✓' : '复制 Markdown'}
          </button>
          <button
            onClick={() => handleExport(selected)}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            导出 .md
          </button>
          <button
            onClick={() => { deleteHistory(selected.id); setSelected(null) }}
            className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50"
          >
            删除
          </button>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
          {selected.content}
        </div>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-center text-gray-400 py-20 text-sm">
        还没有生成记录，去生成页试试吧 ✨
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-800">历史记录（{history.length} 条）</h1>
        <button
          onClick={() => { if (confirm('确认清空全部历史？')) clearHistory() }}
          className="text-xs text-red-400 hover:text-red-600"
        >
          清空全部
        </button>
      </div>

      <div className="space-y-2">
        {history.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between hover:border-rose-200 cursor-pointer transition-colors"
            onClick={() => setSelected(item)}
          >
            <div>
              <p className="text-sm font-medium text-gray-800 truncate max-w-xs">{item.topic}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2 ml-4 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); handleExport(item) }}
                className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded border border-transparent hover:border-gray-200"
              >
                导出
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteHistory(item.id) }}
                className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded border border-transparent hover:border-red-200"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
