import { useState, useEffect } from 'react'
import { useStore } from '../lib/store'
import { callClaude, friendlyError } from '../lib/claude'
import { buildDiagnosisPrompt } from '../lib/prompts/diagnosis'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const MODEL = 'claude-sonnet-4-6'

function countNotes(raw: string) {
  return raw.split('\n').filter((l) => l.trim() !== '').length
}

export default function DiagnosisModal({ open, onClose, onSaved }: Props) {
  const { apiKey, baseUrl, addDiagnosisRecord } = useStore()

  const [positioning, setPositioning] = useState('')
  const [notes, setNotes] = useState('')

  const [generating, setGenerating] = useState(false)
  const [rawOutput, setRawOutput] = useState('')
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!generating) { setElapsed(0); return }
    setElapsed(0)
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [generating])

  // 弹窗每次打开时重置所有状态
  useEffect(() => {
    if (!open) return
    setPositioning('')
    setNotes('')
    setGenerating(false)
    setRawOutput('')
    setError('')
    setSaved(false)
  }, [open])

  if (!open) return null

  const canGenerate = !generating && !!apiKey && notes.trim() !== ''

  async function handleGenerate() {
    setError('')
    setRawOutput('')
    setSaved(false)
    setGenerating(true)

    const { system, user } = buildDiagnosisPrompt({
      positioning: positioning.trim() || undefined,
      notes: notes.trim(),
    })

    try {
      await callClaude({
        apiKey,
        baseUrl: baseUrl || undefined,
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

  function handleSave() {
    if (!rawOutput || saved) return
    addDiagnosisRecord({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      model: MODEL,
      positioning: positioning.trim(),
      noteCount: countNotes(notes),
      content: rawOutput,
    })
    setSaved(true)
    onSaved()
    onClose()
  }

  function handleClose() {
    if (generating) return
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-xl">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <span className="font-semibold text-gray-800">新诊断</span>
          <button
            onClick={handleClose}
            disabled={generating}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none px-1 disabled:opacity-30"
          >
            ×
          </button>
        </div>

        {/* 主体：左右分栏 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左：输入区 */}
          <div className="w-80 shrink-0 border-r border-gray-100 overflow-y-auto px-5 py-4 space-y-4">
            {!apiKey && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ 请先在设置页填入 API Key
              </p>
            )}

            {/* 账号定位 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                账号定位{' '}
                <span className="text-gray-400 font-normal text-xs">（可选）</span>
              </label>
              <textarea
                value={positioning}
                onChange={(e) => setPositioning(e.target.value)}
                rows={2}
                disabled={generating}
                placeholder="描述你的账号方向和目标受众，例如：美妆护肤 · 学生党 · 平价好物分享"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>

            {/* 笔记标题与数据 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                笔记标题与数据 <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-gray-400 mb-1.5">
                每行一个标题，可附带点赞/收藏数，格式随意。从创作中心复制即可。
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={14}
                disabled={generating}
                placeholder={`3款CC霜测评\n学生党护肤顺序 赞230 藏156\n封面为什么没人看 赞89\n...`}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none disabled:bg-gray-50 disabled:text-gray-400 font-mono"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full py-2.5 bg-rose-500 text-white rounded-lg font-medium text-sm hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? `生成中... ${elapsed}s` : rawOutput ? '重新诊断' : '✨ 一键诊断'}
            </button>
          </div>

          {/* 右：结果区 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {!error && !generating && !rawOutput && (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  填写左侧笔记数据后点击「一键诊断」
                </div>
              )}

              {!error && generating && !rawOutput && (
                <p className="text-sm text-gray-400 animate-pulse">正在分析，请稍候...</p>
              )}

              {!error && rawOutput && (
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {rawOutput}
                </div>
              )}
            </div>

            {/* 底部操作栏 */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={handleSave}
                disabled={generating || !rawOutput || saved}
                className="px-4 py-2 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saved ? '已保存 ✓' : '保存到诊断记录'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
