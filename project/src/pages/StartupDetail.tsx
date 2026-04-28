import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { callAI, friendlyError } from '../lib/ai'
import { buildStartupNotesPrompt } from '../lib/prompts/startup'
import ResultModal from '../components/ResultModal'
import MarkdownView from '../components/MarkdownView'

function parseSections(raw: string) {
  const get = (heading: string) => {
    const re = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`)
    return (raw.match(re)?.[1] ?? '').trim()
  }
  return {
    titles: get('标题候选'),
    body: get('正文'),
    tags: get('话题标签'),
    images: get('配图思路'),
  }
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatShortDate(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const MODEL = 'claude-sonnet-4-6'

export default function StartupDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeModel, startupRecords, startupNotes, addStartupNote, deleteStartupNote, apiKey, baseUrl, deepseekKey, glmKey } = useStore()
  const activeKey = activeModel === 'claude' ? apiKey : activeModel === 'deepseek' ? deepseekKey : glmKey
  const record = startupRecords.find((r) => r.id === id)
  const myNotes = startupNotes.filter((n) => n.startupId === id)

  const [noteCount, setNoteCount] = useState<1 | 3 | 5>(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [rawOutput, setRawOutput] = useState('')
  const [error, setError] = useState('')
  const [savedToHistory, setSavedToHistory] = useState(false)

  // 查看已保存笔记
  const [viewNoteId, setViewNoteId] = useState<string | null>(null)
  const viewNote = startupNotes.find((n) => n.id === viewNoteId)

  const sections = rawOutput ? parseSections(rawOutput) : null

  if (!record) {
    return (
      <div className="text-center text-gray-400 py-20 text-sm">
        记录不存在，<button onClick={() => navigate('/startup')} className="underline">返回列表</button>
      </div>
    )
  }

  async function handleGenerateNotes() {
    if (!activeKey) return
    setError('')
    setRawOutput('')
    setSavedToHistory(false)
    setGenerating(true)
    setModalOpen(true)

    const { system, user } = buildStartupNotesPrompt({
      direction: record!.direction,
      goal: record!.goal,
      count: noteCount,
      planContent: record!.content,
    })

    try {
      await callAI({
        provider: activeModel,
        apiKey: activeKey,
        baseUrl: activeModel === 'claude' ? baseUrl || undefined : undefined,
        system,
        userMessage: user,
        onChunk: (chunk) => setRawOutput((prev) => prev + chunk),
      })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setGenerating(false)
    }
  }

  function handleSaveNotes() {
    if (!rawOutput || savedToHistory) return
    addStartupNote({
      id: crypto.randomUUID(),
      startupId: id!,
      createdAt: Date.now(),
      model: record!.model ?? MODEL,
      count: noteCount,
      content: rawOutput,
    })
    setSavedToHistory(true)
    setModalOpen(false)
  }

  return (
    <div className="space-y-5">
      {/* 顶部返回 + 标题 */}
      <div>
        <button
          onClick={() => navigate('/startup')}
          className="text-sm text-gray-500 hover:text-gray-800 mb-3 inline-block"
        >
          ← 返回列表
        </button>
        <h1 className="text-base font-semibold text-gray-800">
          {record.direction} · {record.goal}
        </h1>
        {record.tags.length > 0 && (
          <p className="text-sm text-gray-500 mt-0.5">{record.tags.join(' · ')}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">{formatDate(record.createdAt)}</span>
          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
            {record.model}
          </span>
        </div>
      </div>

      {/* 起号计划内容 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <MarkdownView content={record.content} />
      </div>

      {/* 生成起号笔记 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800">生成起号笔记</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">篇数</span>
          {([1, 3, 5] as const).map((n) => (
            <label key={n} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="noteCount"
                value={n}
                checked={noteCount === n}
                onChange={() => setNoteCount(n)}
                className="accent-rose-500"
              />
              <span className="text-sm text-gray-700">{n}篇</span>
            </label>
          ))}
        </div>
        {!activeKey && (
          <p className="text-xs text-amber-600">⚠️ 请先在设置页填入 API Key</p>
        )}
        <button
          onClick={handleGenerateNotes}
          disabled={!activeKey || generating}
          className="w-full py-2.5 bg-rose-500 text-white rounded-lg font-medium text-sm hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ✨ 生成笔记
        </button>
      </div>

      {/* 已保存笔记列表 */}
      {myNotes.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">已保存笔记（{myNotes.length}）</h2>
          <div className="space-y-2">
            {myNotes.map((note) => (
              <div
                key={note.id}
                className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2.5"
              >
                <div>
                  <span className="text-sm text-gray-700 font-medium">{note.count}篇笔记</span>
                  <span className="text-xs text-gray-400 ml-2">{formatShortDate(note.createdAt)}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono ml-2">
                    {note.model}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => setViewNoteId(note.id)}
                    className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded border border-transparent hover:border-blue-200"
                  >
                    查看
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('确认删除该笔记记录？')) deleteStartupNote(note.id)
                    }}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded border border-transparent hover:border-red-200"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 生成笔记弹窗 */}
      <ResultModal
        open={modalOpen}
        generating={generating}
        rawOutput={rawOutput}
        sections={sections}
        savedToHistory={savedToHistory}
        error={error}
        onClose={() => setModalOpen(false)}
        onRegenerate={handleGenerateNotes}
        onSave={handleSaveNotes}
        saveLabel="保存笔记"
      />

      {/* 查看已保存笔记弹窗 */}
      <ResultModal
        open={viewNoteId !== null}
        generating={false}
        rawOutput={viewNote?.content ?? ''}
        sections={null}
        savedToHistory={false}
        error=""
        onClose={() => setViewNoteId(null)}
        onRegenerate={() => {}}
        onSave={() => {}}
        readOnly
      />
    </div>
  )
}
