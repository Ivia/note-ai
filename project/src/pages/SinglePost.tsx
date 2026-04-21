import { useState } from 'react'
import { useStore } from '../lib/store'
import { callClaude, friendlyError } from '../lib/claude'
import { buildSinglePostPrompt, STYLE_PRESETS } from '../lib/prompts/singlePost'
import ResultModal from '../components/ResultModal'
import UrlInput, { validateUrls } from '../components/UrlInput'
import CookieInput from '../components/CookieInput'
import { fetchNoteContent, coverUrlToBase64, parseDataUrl } from '../lib/xhs'
import type { NoteContent } from '../lib/xhs'
import { useNavigate } from 'react-router-dom'

type RefMode = 'url' | 'manual'

interface Sections {
  titles: string
  body: string
  tags: string
  images: string
}

function parseSections(raw: string): Sections {
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

export default function SinglePost() {
  const { apiKey, baseUrl, addHistory, xhsCookie, setXhsCookie } = useStore()
  const navigate = useNavigate()

  const [topic, setTopic] = useState('')
  const [selling, setSelling] = useState('')
  const [style, setStyle] = useState(STYLE_PRESETS[0])
  const [customStyle, setCustomStyle] = useState('')

  // 参考笔记区
  const [refMode, setRefMode] = useState<RefMode>('manual')
  const [refUrls, setRefUrls] = useState('')
  const [refFetching, setRefFetching] = useState(false)
  const [refFetchError, setRefFetchError] = useState('')
  const [fetchedNotes, setFetchedNotes] = useState<NoteContent[]>([])
  const [manualReference, setManualReference] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [rawOutput, setRawOutput] = useState('')
  const [error, setError] = useState('')
  const [savedToHistory, setSavedToHistory] = useState(false)

  const hasFetchedNotes = fetchedNotes.length > 0
  const canGenerate = !generating && !!apiKey && topic.trim() !== '' && selling.trim() !== ''
  const sections = rawOutput ? parseSections(rawOutput) : null
  const effectiveStyle = style === '自由发挥' ? (customStyle || '自由发挥') : style

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

  async function runGenerate() {
    if (!apiKey) { navigate('/settings'); return }

    setError('')
    setRawOutput('')
    setSavedToHistory(false)
    setGenerating(true)
    setModalOpen(true)

    let reference: string | undefined
    let images: { mediaType: string; data: string }[] | undefined

    if (refMode === 'url' && hasFetchedNotes) {
      reference = formatFetchedNotes(fetchedNotes)
      // 收集每篇笔记的图片（最多每篇3张，总计最多6张）
      try {
        const imageUrls = fetchedNotes.flatMap((n) => n.imageUrls.slice(0, 3)).slice(0, 6)
        if (imageUrls.length > 0) {
          const dataUrls = await Promise.all(imageUrls.map((u) => coverUrlToBase64(u)))
          images = dataUrls.map(parseDataUrl)
        }
      } catch {
        // 图片获取失败不中断，降级为纯文本
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
      const full = await callClaude({
        apiKey,
        baseUrl: baseUrl || undefined,
        system,
        userMessage: user,
        images,
        onChunk: (chunk) => setRawOutput((prev) => prev + chunk),
      })
      void full
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setGenerating(false)
    }
  }

  function handleSave() {
    if (!rawOutput || savedToHistory) return
    addHistory({
      id: crypto.randomUUID(),
      topic: topic.trim(),
      createdAt: Date.now(),
      content: rawOutput,
      model: 'claude-sonnet-4-6',
    })
    setSavedToHistory(true)
    setModalOpen(false)
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-800">一键生成小红书文案</h1>
          <button
            onClick={() => navigate('/history')}
            className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 border border-gray-200 rounded-lg hover:border-gray-300"
          >
            历史记录 →
          </button>
        </div>

        {!apiKey && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            ⚠️ 请先前往{' '}
            <button onClick={() => navigate('/settings')} className="underline font-medium">
              设置页
            </button>{' '}
            填入 Claude API Key。
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            笔记主题 <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="如：推荐 3 款平价 CC 霜"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
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
            placeholder="如：持妆久、不卡粉、学生党预算内都能买"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
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
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
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
              placeholder="描述你想要的风格..."
              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          )}
        </div>

        {/* 参考笔记区域 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              参考笔记 <span className="text-gray-400 font-normal">（可选）</span>
            </label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setRefMode('url')}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  refMode === 'url' ? 'bg-rose-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                链接抓取
              </button>
              <button
                type="button"
                onClick={() => setRefMode('manual')}
                className={`px-3 py-1.5 font-medium transition-colors ${
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
              placeholder="粘贴一段你喜欢的爆款笔记，AI 会学习其风格和结构"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
            />
          )}
        </div>

        <button
          onClick={runGenerate}
          disabled={!canGenerate}
          className="w-full py-2.5 bg-rose-500 text-white rounded-lg font-medium text-sm hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? '生成中...' : '✨ 一键生成'}
        </button>
      </div>

      <ResultModal
        open={modalOpen}
        generating={generating}
        rawOutput={rawOutput}
        sections={sections}
        savedToHistory={savedToHistory}
        error={error}
        onClose={() => setModalOpen(false)}
        onRegenerate={runGenerate}
        onSave={handleSave}
      />
    </div>
  )
}
