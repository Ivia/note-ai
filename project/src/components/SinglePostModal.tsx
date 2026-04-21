import { useState, useEffect } from 'react'
import { useStore } from '../lib/store'
import { callClaude, friendlyError } from '../lib/claude'
import { buildSinglePostPrompt, STYLE_PRESETS } from '../lib/prompts/singlePost'
import UrlInput, { validateUrls } from './UrlInput'
import CookieInput from './CookieInput'
import { fetchNoteContent, coverUrlToBase64, parseDataUrl } from '../lib/xhs'
import type { NoteContent } from '../lib/xhs'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const MODEL = 'claude-sonnet-4-6'

type RefMode = 'url' | 'manual'

function formatFetchedNotes(notes: NoteContent[]): string {
  return notes
    .map((n, i) => {
      const parts = [`【参考笔记${i + 1}】标题：${n.title}`]
      if (n.content) parts.push(`正文：${n.content}`)
      if (n.tags.length > 0) parts.push(`标签：${n.tags.join(' ')}`)
      return parts.join('\n')
    })
    .join('\n\n')
}

export default function SinglePostModal({ open, onClose, onSaved }: Props) {
  const { apiKey, baseUrl, addHistory, xhsCookie, setXhsCookie } = useStore()

  const [topic, setTopic] = useState('')
  const [selling, setSelling] = useState('')
  const [style, setStyle] = useState(STYLE_PRESETS[0])
  const [customStyle, setCustomStyle] = useState('')

  const [refMode, setRefMode] = useState<RefMode>('manual')
  const [refUrls, setRefUrls] = useState('')
  const [refFetching, setRefFetching] = useState(false)
  const [refFetchError, setRefFetchError] = useState('')
  const [fetchedNotes, setFetchedNotes] = useState<NoteContent[]>([])
  const [manualReference, setManualReference] = useState('')

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

  useEffect(() => {
    if (!open) return
    setTopic('')
    setSelling('')
    setStyle(STYLE_PRESETS[0])
    setCustomStyle('')
    setRefMode('manual')
    setRefUrls('')
    setRefFetching(false)
    setRefFetchError('')
    setFetchedNotes([])
    setManualReference('')
    setGenerating(false)
    setRawOutput('')
    setError('')
    setSaved(false)
  }, [open])

  if (!open) return null

  const hasFetchedNotes = fetchedNotes.length > 0
  const effectiveStyle = style === '自由发挥' ? (customStyle || '自由发挥') : style
  const canGenerate = !generating && !!apiKey && topic.trim() !== '' && selling.trim() !== ''

  async function handleFetchNotes() {
    const { urls, errors } = validateUrls(refUrls, 'note')
    if (errors.length > 0 || urls.length === 0) {
      setRefFetchError('请输入有效的小红书笔记链接')
      return
    }
    if (!xhsCookie.trim()) {
      setRefFetchError('请填写 Cookie')
      return
    }
    setRefFetchError('')
    setFetchedNotes([])
    setRefFetching(true)
    try {
      const notes = await fetchNoteContent(urls.slice(0, 3), xhsCookie.trim())
      setFetchedNotes(notes)
    } catch (err) {
      setRefFetchError(err instanceof Error ? err.message : String(err))
    } finally {
      setRefFetching(false)
    }
  }

  async function handleGenerate() {
    setError('')
    setRawOutput('')
    setSaved(false)
    setGenerating(true)

    let reference: string | undefined
    let images: { mediaType: string; data: string }[] | undefined

    if (refMode === 'url' && hasFetchedNotes) {
      reference = formatFetchedNotes(fetchedNotes)
      try {
        const imageUrls = fetchedNotes.flatMap((n) => n.imageUrls.slice(0, 3)).slice(0, 6)
        if (imageUrls.length > 0) {
          const dataUrls = await Promise.all(imageUrls.map((u) => coverUrlToBase64(u)))
          images = dataUrls.map(parseDataUrl)
        }
      } catch {
        // 图片获取失败降级为纯文本
      }
    } else if (refMode === 'manual' && manualReference.trim()) {
      reference = manualReference.trim()
    }

    const { system, user } = buildSinglePostPrompt({
      topic: topic.trim(),
      selling: selling.trim(),
      style: effectiveStyle,
      reference,
      hasReferenceImages: images && images.length > 0,
    })

    try {
      await callClaude({
        apiKey,
        baseUrl: baseUrl || undefined,
        system,
        userMessage: user,
        images,
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
    addHistory({
      id: crypto.randomUUID(),
      topic: topic.trim(),
      createdAt: Date.now(),
      content: rawOutput,
      model: MODEL,
    })
    setSaved(true)
    onSaved()
    onClose()
  }

  function handleClose() {
    if (generating || refFetching) return
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-xl">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <span className="font-semibold text-gray-800">新文案</span>
          <button
            onClick={handleClose}
            disabled={generating || refFetching}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                笔记主题 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={generating}
                placeholder="如：推荐 3 款平价 CC 霜"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                核心卖点 / 想表达的信息 <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={selling}
                onChange={(e) => setSelling(e.target.value)}
                rows={3}
                disabled={generating}
                placeholder="如：持妆久、不卡粉、学生党预算内都能买"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">风格</label>
              <div className="flex flex-wrap gap-2">
                {STYLE_PRESETS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStyle(s)}
                    disabled={generating}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      style === s
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'border-gray-300 text-gray-600 hover:border-rose-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {style === '自由发挥' && (
                <input
                  type="text"
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
                  disabled={generating}
                  placeholder="描述你想要的风格..."
                  className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:bg-gray-50 disabled:text-gray-400"
                />
              )}
            </div>

            {/* 参考笔记 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  参考笔记 <span className="text-gray-400 font-normal text-xs">（可选）</span>
                </label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setRefMode('url')}
                    disabled={generating}
                    className={`px-3 py-1.5 font-medium transition-colors disabled:opacity-40 ${
                      refMode === 'url' ? 'bg-rose-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    链接抓取
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefMode('manual')}
                    disabled={generating}
                    className={`px-3 py-1.5 font-medium transition-colors disabled:opacity-40 ${
                      refMode === 'manual' ? 'bg-rose-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    手动粘贴
                  </button>
                </div>
              </div>

              {refMode === 'url' && (
                <div className="space-y-3">
                  <UrlInput
                    mode="note"
                    value={refUrls}
                    onChange={(v) => { setRefUrls(v); setFetchedNotes([]); setRefFetchError('') }}
                    disabled={refFetching || generating}
                  />
                  <CookieInput
                    value={xhsCookie}
                    onChange={setXhsCookie}
                    disabled={refFetching || generating}
                  />
                  {refFetchError && (
                    <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {refFetchError}
                    </p>
                  )}
                  {hasFetchedNotes && (
                    <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      ✓ 已抓取 {fetchedNotes.length} 篇参考笔记（含图片）
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleFetchNotes}
                    disabled={refFetching || generating || !refUrls.trim() || !xhsCookie.trim()}
                    className="w-full py-2 border border-rose-400 text-rose-500 rounded-lg text-sm font-medium hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {refFetching ? '抓取中...' : hasFetchedNotes ? '重新抓取' : '抓取笔记'}
                  </button>
                </div>
              )}

              {refMode === 'manual' && (
                <textarea
                  value={manualReference}
                  onChange={(e) => setManualReference(e.target.value)}
                  rows={3}
                  disabled={generating}
                  placeholder="粘贴一段你喜欢的爆款笔记，AI 会学习其风格和结构"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none disabled:bg-gray-50 disabled:text-gray-400"
                />
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full py-2.5 bg-rose-500 text-white rounded-lg font-medium text-sm hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? `生成中... ${elapsed}s` : rawOutput ? '重新生成' : '✨ 一键生成'}
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

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={handleSave}
                disabled={generating || !rawOutput || saved}
                className="px-4 py-2 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saved ? '已保存 ✓' : '保存到记录'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
