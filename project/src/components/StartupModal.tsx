import { useState, useEffect } from 'react'
import { useStore } from '../lib/store'
import { callClaude, friendlyError } from '../lib/claude'
import { DIRECTIONS, GOALS, buildStartupPrompt } from '../lib/prompts/startup'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const MODEL = 'claude-sonnet-4-6'

/**
 * 新起号弹窗
 * 左侧：输入表单；右侧：生成结果实时展示
 */
export default function StartupModal({ open, onClose, onSaved }: Props) {
  const { apiKey, baseUrl, addStartupRecord } = useStore()

  const [direction, setDirection] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [persona, setPersona] = useState('')
  const [goal, setGoal] = useState('')
  const [reference, setReference] = useState('')

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

  if (!open) return null

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const canGenerate = !generating && !!apiKey && direction.trim() !== '' && !!goal

  async function handleGenerate() {
    setError('')
    setRawOutput('')
    setSaved(false)
    setGenerating(true)

    const { system, user } = buildStartupPrompt({
      direction: direction.trim(),
      tags: selectedTags,
      persona: persona.trim() || undefined,
      goal,
      reference: reference.trim() || undefined,
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
    addStartupRecord({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      model: MODEL,
      direction: direction.trim(),
      tags: selectedTags,
      persona: persona.trim(),
      goal,
      reference: reference.trim(),
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
          <span className="font-semibold text-gray-800">新起号</span>
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
          <div className="w-80 shrink-0 border-r border-gray-100 overflow-y-auto px-5 py-4 space-y-5">
            {!apiKey && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ 请先在设置页填入 API Key
              </p>
            )}

            {/* 内容方向 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                内容方向 <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                rows={3}
                placeholder="描述你想做的内容方向，例如：分享平价好用的护肤品、记录职场新人的成长日记、做家常菜教程..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
              />
            </div>

            {/* 参考方向 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                参考方向{' '}
                <span className="text-gray-400 font-normal text-xs">可多选，不确定可不选</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DIRECTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleTag(d)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      selectedTags.includes(d)
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'border-gray-300 text-gray-600 hover:border-rose-400'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* 人设描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                人设描述{' '}
                <span className="text-gray-400 font-normal text-xs">（可选）</span>
              </label>
              <textarea
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                rows={2}
                placeholder="例如：28岁宝妈，有两个孩子，平时喜欢研究好物..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
              />
            </div>

            {/* 起号目标 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                起号目标 <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-1.5">
                {GOALS.map((g) => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="goal"
                      value={g}
                      checked={goal === g}
                      onChange={() => setGoal(g)}
                      className="accent-rose-500"
                    />
                    <span className="text-sm text-gray-700">{g}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 对标参考 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                对标参考 <span className="text-gray-400 font-normal text-xs">（可选）</span>
              </label>
              <textarea
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                rows={4}
                placeholder="粘贴1-3篇同类爆款笔记文本，AI 会分析其风格规律"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full py-2.5 bg-rose-500 text-white rounded-lg font-medium text-sm hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? `生成中... ${elapsed}s` : '🚀 一键生成'}
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
                  填写左侧信息后点击「一键生成」
                </div>
              )}

              {!error && generating && !rawOutput && (
                <p className="text-sm text-gray-400 animate-pulse">正在生成，请稍候...</p>
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
                onClick={handleGenerate}
                disabled={!canGenerate || !rawOutput}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                重新生成
              </button>
              <button
                onClick={handleSave}
                disabled={generating || !rawOutput || saved}
                className="px-4 py-2 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                保存到历史
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
