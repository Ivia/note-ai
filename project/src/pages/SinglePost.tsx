import { useState } from 'react'
import { useStore } from '../lib/store'
import type { HistoryItem } from '../lib/store'
import SinglePostModal from '../components/SinglePostModal'

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).replace(/\//g, '-')
}

function DetailView({ item, onBack }: { item: HistoryItem; onBack: () => void }) {
  const { deleteHistory } = useStore()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(item.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleExport() {
    const blob = new Blob([item.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${item.topic.slice(0, 20)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleDelete() {
    if (confirm('确认删除该历史记录？')) {
      deleteHistory(item.id)
      onBack()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800">
          ← 返回列表
        </button>
        <span className="text-sm text-gray-400">{formatDate(item.createdAt)}</span>
        {item.model && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-mono">
            {item.model}
          </span>
        )}
      </div>
      <h2 className="text-base font-semibold text-gray-800">{item.topic}</h2>
      {(item.noteType || (item.styleWriting && item.styleWriting !== '自由发挥') || (item.styleContent && item.styleContent !== '自由发挥')) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.noteType && (
            <span className="text-xs bg-blue-50 text-blue-500 border border-blue-100 px-1.5 py-0.5 rounded">
              {item.noteType === 'image' ? '图文' : '视频'}
            </span>
          )}
          {item.styleWriting && item.styleWriting !== '自由发挥' && (
            <span className="text-xs bg-rose-50 text-rose-500 border border-rose-100 px-1.5 py-0.5 rounded">
              {item.styleWriting}
            </span>
          )}
          {item.styleContent && item.styleContent !== '自由发挥' && (
            <span className="text-xs bg-purple-50 text-purple-500 border border-purple-100 px-1.5 py-0.5 rounded">
              {item.styleContent}
            </span>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {copied ? '已复制 ✓' : '复制 Markdown'}
        </button>
        <button
          onClick={handleExport}
          className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          导出 .md
        </button>
        <button
          onClick={handleDelete}
          className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50"
        >
          删除
        </button>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
        {item.content}
      </div>
    </div>
  )
}

export default function SinglePost() {
  const { history, deleteHistory } = useStore()
  const [selected, setSelected] = useState<HistoryItem | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  if (selected) {
    return <DetailView item={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-800">生成文案</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="px-3 py-1.5 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
        >
          + 新文案
        </button>
      </div>

      {history.length === 0 ? (
        <div className="text-center text-gray-400 py-20 text-sm">
          <p className="text-3xl mb-3">✨</p>
          <p>还没有文案记录</p>
          <p className="mt-1">点击右上角「新文案」开始吧</p>
        </div>
      ) : (
        <>
<div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between hover:border-rose-200 cursor-pointer transition-colors"
                onClick={() => setSelected(item)}
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 truncate max-w-xs">{item.topic}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {item.noteType && (
                      <span className="text-xs bg-blue-50 text-blue-500 border border-blue-100 px-1.5 py-0.5 rounded">
                        {item.noteType === 'image' ? '图文' : '视频'}
                      </span>
                    )}
                    {item.styleWriting && item.styleWriting !== '自由发挥' && (
                      <span className="text-xs bg-rose-50 text-rose-500 border border-rose-100 px-1.5 py-0.5 rounded">
                        {item.styleWriting}
                      </span>
                    )}
                    {item.styleContent && item.styleContent !== '自由发挥' && (
                      <span className="text-xs bg-purple-50 text-purple-500 border border-purple-100 px-1.5 py-0.5 rounded">
                        {item.styleContent}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-400">{formatDate(item.createdAt)}</p>
                    {item.model && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                        {item.model}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const blob = new Blob([item.content], { type: 'text/markdown' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `${item.topic.slice(0, 20)}.md`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded border border-transparent hover:border-gray-200"
                  >
                    导出
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('确认删除该历史记录？')) deleteHistory(item.id)
                    }}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded border border-transparent hover:border-red-200"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <SinglePostModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => setModalOpen(false)}
      />
    </div>
  )
}
