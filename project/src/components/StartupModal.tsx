import { useState, useEffect } from 'react'
import { useStore } from '../lib/store'
import { callAI, friendlyError } from '../lib/ai'
import { DIRECTIONS, GOALS, buildStartupPrompt } from '../lib/prompts/startup'
import UrlInput, { validateUrls } from './UrlInput'
import LoginModal from './LoginModal'
import MarkdownView from './MarkdownView'
import { fetchUserNotes, coverUrlToBase64, parseDataUrl, validateCookie } from '../lib/xhs'
import type { XhsNote } from '../lib/xhs'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const MODEL = 'claude-sonnet-4-6'

type RefMode = 'url' | 'manual'

function formatFetchedProfile(notes: XhsNote[]): string {
  return notes
    .map((n, i) => {
      const parts = [`${i + 1}. ${n.title}`]
      if (n.likes) parts.push(`赞${n.likes}`)
      if (n.collects) parts.push(`藏${n.collects}`)
      if (n.comments) parts.push(`评${n.comments}`)
      return parts.join(' ')
    })
    .join('\n')
}

export default function StartupModal({ open, onClose, onSaved }: Props) {
  const { activeModel, apiKey, baseUrl, deepseekKey, addStartupRecord, xhsCookie, setXhsCookie } = useStore()

  const [direction, setDirection] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [persona, setPersona] = useState('')
  const [goal, setGoal] = useState('')

  const [refMode, setRefMode] = useState<RefMode>('manual')
  const [refUrl, setRefUrl] = useState('')
  const [refFetching, setRefFetching] = useState(false)
  const [refFetchError, setRefFetchError] = useState('')
  const [fetchedNotes, setFetchedNotes] = useState<XhsNote[]>([])
  const [manualReference, setManualReference] = useState('')

  const [loginModalOpen, setLoginModalOpen] = useState(false)

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
    setDirection('')
    setSelectedTags([])
    setPersona('')
    setGoal('')
    setRefMode('manual')
    setRefUrl('')
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

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const hasFetchedNotes = fetchedNotes.length > 0
  const activeKey = activeModel === 'claude' ? apiKey : deepseekKey
  const canGenerate = !generating && !!activeKey && direction.trim() !== '' && !!goal

  async function doFetchProfile(cookie: string) {
    setRefFetchError('')
    setFetchedNotes([])
    setRefFetching(true)
    try {
      const result = await fetchUserNotes(refUrl.trim(), cookie, 10)
      setFetchedNotes(result.notes)
    } catch (err) {
      setRefFetchError(err instanceof Error ? err.message : String(err))
    } finally {
      setRefFetching(false)
    }
  }

  async function handleFetchProfile() {
    const { urls, errors } = validateUrls(refUrl, 'profile')
    if (errors.length > 0 || urls.length === 0) {
      setRefFetchError('请输入有效的小红书主页链接')
      return
    }
    const valid = xhsCookie ? await validateCookie(xhsCookie) : false
    if (!valid) {
      setLoginModalOpen(true)
      return
    }
    doFetchProfile(xhsCookie)
  }

  function handleLoginSuccess(cookie: string) {
    setXhsCookie(cookie)
    setLoginModalOpen(false)
    doFetchProfile(cookie)
  }

  async function handleGenerate() {
    setError('')
    setRawOutput('')
    setSaved(false)
    setGenerating(true)

    let reference: string | undefined
    let images: { mediaType: string; data: string }[] | undefined

    if (refMode === 'url' && hasFetchedNotes) {
      reference = formatFetchedProfile(fetchedNotes)
      try {
        const dataUrls = await Promise.all(fetchedNotes.map((n) => coverUrlToBase64(n.coverUrl)))
        images = dataUrls.map(parseDataUrl)
      } catch {
        // 封面图获取失败降级为纯文本
      }
    } else if (refMode === 'manual' && manualReference.trim()) {
      reference = manualReference.trim()
    }

    const { system, user } = buildStartupPrompt({
      direction: direction.trim(),
      tags: selectedTags,
      persona: persona.trim() || undefined,
      goal,
      reference,
      hasReferenceImages: images && images.length > 0,
    })

    try {
      await callAI({
        provider: activeModel,
        apiKey: activeKey,
        baseUrl: activeModel === 'claude' ? baseUrl || undefined : undefined,
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
    addStartupRecord({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      model: MODEL,
      direction: direction.trim(),
      tags: selectedTags,
      persona: persona.trim(),
      goal,
      reference: refMode === 'manual' ? manualReference.trim() : (hasFetchedNotes ? formatFetchedProfile(fetchedNotes) : ''),
      content: rawOutput,
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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-xl">
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <span className="font-semibold text-gray-800">新起号</span>
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
            <div className="w-80 shrink-0 border-r border-gray-100 overflow-y-auto px-5 py-4 space-y-5">
              {!activeKey && (
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
                  disabled={generating}
                  placeholder="描述你想做的内容方向，例如：分享平价好用的护肤品、记录职场新人的成长日记、做家常菜教程..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none disabled:bg-gray-50 disabled:text-gray-400"
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
                      disabled={generating}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
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
                  disabled={generating}
                  placeholder="例如：28岁宝妈，有两个孩子，平时喜欢研究好物..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none disabled:bg-gray-50 disabled:text-gray-400"
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
                        disabled={generating}
                        className="accent-rose-500 disabled:opacity-40"
                      />
                      <span className={`text-sm ${generating ? 'text-gray-400' : 'text-gray-700'}`}>{g}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 对标参考 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    对标参考 <span className="text-gray-400 font-normal text-xs">（可选）</span>
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
                      mode="profile"
                      value={refUrl}
                      onChange={(v) => { setRefUrl(v); setFetchedNotes([]); setRefFetchError('') }}
                      disabled={refFetching || generating}
                      single
                    />

                    {refFetchError && (
                      <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {refFetchError}
                      </p>
                    )}

                    {hasFetchedNotes && (
                      <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        ✓ 已抓取 {fetchedNotes.length} 篇笔记（含封面图）
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleFetchProfile}
                      disabled={refFetching || generating || !refUrl.trim()}
                      className="w-full py-2 border border-rose-400 text-rose-500 rounded-lg text-sm font-medium hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {refFetching ? '抓取中...' : hasFetchedNotes ? '重新抓取' : '抓取主页'}
                    </button>
                  </div>
                )}

                {refMode === 'manual' && (
                  <textarea
                    value={manualReference}
                    onChange={(e) => setManualReference(e.target.value)}
                    rows={4}
                    disabled={generating}
                    placeholder="粘贴1-3篇同类爆款笔记文本，AI 会分析其风格规律"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none disabled:bg-gray-50 disabled:text-gray-400"
                  />
                )}
              </div>

              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="w-full py-2.5 bg-rose-500 text-white rounded-lg font-medium text-sm hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? `生成中... ${elapsed}s` : rawOutput ? '重新生成' : '🚀 一键生成'}
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
                  <p className="text-sm text-gray-400 animate-pulse">
                    正在生成，请稍候... <span className="not-italic text-gray-300">已用时 {elapsed}s</span>
                  </p>
                )}

                {!error && generating && rawOutput && (
                  <p className="text-xs text-gray-300 text-right">已用时 {elapsed}s</p>
                )}

                {!error && rawOutput && (
                  <MarkdownView content={rawOutput} />
                )}
              </div>

              {/* 底部操作栏 */}
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
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

      <LoginModal
        open={loginModalOpen}
        onSuccess={handleLoginSuccess}
        onCancel={() => setLoginModalOpen(false)}
      />
    </>
  )
}
