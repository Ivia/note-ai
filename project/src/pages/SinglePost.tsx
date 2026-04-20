import { useState } from 'react'
import { useStore } from '../lib/store'
import { callClaude, friendlyError } from '../lib/claude'
import { buildSinglePostPrompt, STYLE_PRESETS } from '../lib/prompts/singlePost'
import SectionBlock from '../components/SectionBlock'
import { useNavigate } from 'react-router-dom'

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

export default function SinglePost() {
  const { apiKey, baseUrl, addHistory } = useStore()
  const navigate = useNavigate()

  const [topic, setTopic] = useState('')
  const [selling, setSelling] = useState('')
  const [style, setStyle] = useState(STYLE_PRESETS[0])
  const [customStyle, setCustomStyle] = useState('')
  const [reference, setReference] = useState('')

  const [generating, setGenerating] = useState(false)
  const [rawOutput, setRawOutput] = useState('')
  const [error, setError] = useState('')
  const [savedToHistory, setSavedToHistory] = useState(false)

  const canGenerate = !generating && apiKey && topic.trim() && selling.trim()
  const sections = rawOutput ? parseSections(rawOutput) : null
  const effectiveStyle = style === '自由发挥' ? (customStyle || '自由发挥') : style

  async function handleGenerate() {
    if (!canGenerate) return
    if (!apiKey) { navigate('/settings'); return }

    setError('')
    setRawOutput('')
    setSavedToHistory(false)
    setGenerating(true)

    const { system, user } = buildSinglePostPrompt({
      topic: topic.trim(),
      selling: selling.trim(),
      style: effectiveStyle,
      reference: reference.trim() || undefined,
    })

    try {
      const full = await callClaude({
        apiKey,
        baseUrl: baseUrl || undefined,
        system,
        userMessage: user,
        onChunk: (chunk) => setRawOutput((prev) => prev + chunk),
      })
      const id = crypto.randomUUID()
      addHistory({ id, topic: topic.trim(), createdAt: Date.now(), content: full })
      setSavedToHistory(true)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopyAll() {
    if (!rawOutput) return
    await navigator.clipboard.writeText(rawOutput)
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h1 className="text-base font-semibold text-gray-800">一键生成小红书文案</h1>

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            参考笔记 <span className="text-gray-400 font-normal">（可选）</span>
          </label>
          <textarea
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            rows={3}
            placeholder="粘贴一段你喜欢的爆款笔记，AI 会学习其风格和结构"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full py-2.5 bg-rose-500 text-white rounded-lg font-medium text-sm hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? '生成中...' : '✨ 一键生成'}
        </button>
      </div>

      {rawOutput && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {generating ? '正在生成...' : (savedToHistory ? '已自动保存到历史 ✓' : '生成完成')}
            </p>
            {!generating && (
              <button
                onClick={handleCopyAll}
                className="text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 border border-gray-300 rounded-lg"
              >
                复制全部 Markdown
              </button>
            )}
          </div>

          {sections?.titles && <SectionBlock title="📝 标题候选" content={sections.titles} />}
          {sections?.body && <SectionBlock title="📖 正文" content={sections.body} />}
          {sections?.tags && <SectionBlock title="🏷️ 话题标签" content={sections.tags} />}
          {sections?.images && <SectionBlock title="🖼️ 配图思路" content={sections.images} />}

          {generating && !sections?.titles && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-500 whitespace-pre-wrap">
              {rawOutput}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
