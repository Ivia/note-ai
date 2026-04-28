import { useState, useEffect } from 'react'
import { useStore } from '../lib/store'
import { callAI, friendlyError } from '../lib/ai'
import { buildDiagnosisPrompt } from '../lib/prompts/diagnosis'
import { fetchUserNotes, coverUrlToBase64, parseDataUrl, validateCookie } from '../lib/xhs'
import type { XhsNote, FetchUserNotesResult } from '../lib/xhs'
import UrlInput, { validateUrls } from './UrlInput'
import LoginModal from './LoginModal'
import MarkdownView from './MarkdownView'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const MODEL = 'claude-sonnet-4-6'

type InputMode = 'auto' | 'manual'

function formatNoteText(notes: XhsNote[]): string {
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

function countNotes(raw: string) {
  return raw.split('\n').filter((l) => l.trim() !== '').length
}

export default function DiagnosisModal({ open, onClose, onSaved }: Props) {
  const { activeModel, apiKey, baseUrl, deepseekKey, glmKey, addDiagnosisRecord, xhsCookie, setXhsCookie } = useStore()

  const [mode, setMode] = useState<InputMode>('auto')
  const [positioning, setPositioning] = useState('')

  const [profileUrl, setProfileUrl] = useState('')
  const [fetchCount, setFetchCount] = useState(20)
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [fetchedNotes, setFetchedNotes] = useState<XhsNote[]>([])
  const [fetchedAccount, setFetchedAccount] = useState<Pick<FetchUserNotesResult, 'userId' | 'userName' | 'userRedId'>>({ userId: '', userName: '', userRedId: '' })

  const [notes, setNotes] = useState('')

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
    setMode('auto')
    setPositioning('')
    setProfileUrl('')
    setFetchCount(20)
    setFetching(false)
    setFetchError('')
    setFetchedNotes([])
    setFetchedAccount({ userId: '', userName: '', userRedId: '' })
    setNotes('')
    setGenerating(false)
    setRawOutput('')
    setError('')
    setSaved(false)
  }, [open])

  if (!open) return null

  const hasFetchedData = fetchedNotes.length > 0
  const hasManualData = notes.trim() !== ''
  const activeKey = activeModel === 'claude' ? apiKey : activeModel === 'deepseek' ? deepseekKey : glmKey
  const canGenerate = !generating && !!activeKey && (mode === 'auto' ? hasFetchedData : hasManualData)

  async function doFetch(cookie: string) {
    setFetchError('')
    setFetchedNotes([])
    setFetching(true)
    try {
      const result = await fetchUserNotes(profileUrl.trim(), cookie, fetchCount)
      setFetchedNotes(result.notes)
      setFetchedAccount({ userId: result.userId, userName: result.userName, userRedId: result.userRedId })
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err))
    } finally {
      setFetching(false)
    }
  }

  async function handleFetch() {
    if (!profileUrl.trim()) {
      setFetchError('请填写主页链接')
      return
    }
    const { urls, errors } = validateUrls(profileUrl, 'profile')
    if (errors.length > 0 || urls.length === 0) {
      setFetchError('请输入有效的小红书主页链接')
      return
    }
    const valid = xhsCookie ? await validateCookie(xhsCookie) : false
    if (!valid) {
      setLoginModalOpen(true)
      return
    }
    doFetch(xhsCookie)
  }

  function handleLoginSuccess(cookie: string) {
    setXhsCookie(cookie)
    setLoginModalOpen(false)
    doFetch(cookie)
  }

  async function handleGenerate() {
    setError('')
    setRawOutput('')
    setSaved(false)
    setGenerating(true)

    const notesText = mode === 'auto' ? formatNoteText(fetchedNotes) : notes.trim()

    let images: { mediaType: string; data: string }[] | undefined
    if (mode === 'auto' && fetchedNotes.length > 0) {
      try {
        const dataUrls = await Promise.all(
          fetchedNotes.map((n) => coverUrlToBase64(n.coverUrl))
        )
        images = dataUrls.map(parseDataUrl)
      } catch {
        // 封面图获取失败不中断，降级为纯文本分析
      }
    }

    const { system, user } = buildDiagnosisPrompt({
      positioning: positioning.trim() || undefined,
      notes: notesText,
      hasImages: images && images.length > 0,
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

  function extractSummary(output: string): string {
    const match = output.match(/##\s*诊断要点\s*\n+([\s\S]+?)(\n##|$)/)
    if (!match) return ''
    return match[1].trim().replace(/\*\*/g, '')
  }

  function handleSave() {
    if (!rawOutput || saved) return
    addDiagnosisRecord({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      model: MODEL,
      positioning: positioning.trim(),
      noteCount: mode === 'auto' ? fetchedNotes.length : countNotes(notes),
      content: rawOutput,
      summary: extractSummary(rawOutput),
      userId: mode === 'auto' ? fetchedAccount.userId : '',
      userName: mode === 'auto' ? fetchedAccount.userName : '',
      userRedId: mode === 'auto' ? fetchedAccount.userRedId : '',
    })
    setSaved(true)
    onSaved()
    onClose()
  }

  function handleClose() {
    if (generating || fetching) return
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-xl">
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <span className="font-semibold text-gray-800">新诊断</span>
            <button
              onClick={handleClose}
              disabled={generating || fetching}
              className="text-gray-400 hover:text-gray-700 text-xl leading-none px-1 disabled:opacity-30"
            >
              ×
            </button>
          </div>

          {/* 主体：左右分栏 */}
          <div className="flex flex-1 overflow-hidden">
            {/* 左：输入区 */}
            <div className="w-80 shrink-0 border-r border-gray-100 overflow-y-auto px-5 py-4 space-y-4">
              {!activeKey && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠️ 请先在设置页填入 API Key
                </p>
              )}

              {/* 模式切换 */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                <button
                  onClick={() => setMode('auto')}
                  disabled={generating}
                  className={`flex-1 py-2 font-medium transition-colors ${
                    mode === 'auto'
                      ? 'bg-rose-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  } disabled:opacity-40`}
                >
                  自动抓取
                </button>
                <button
                  onClick={() => setMode('manual')}
                  disabled={generating}
                  className={`flex-1 py-2 font-medium transition-colors ${
                    mode === 'manual'
                      ? 'bg-rose-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  } disabled:opacity-40`}
                >
                  手动粘贴
                </button>
              </div>

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

              {/* 自动抓取模式 */}
              {mode === 'auto' && (
                <div className="space-y-3">
                  <UrlInput
                    mode="profile"
                    value={profileUrl}
                    onChange={setProfileUrl}
                    disabled={fetching || generating}
                    single
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      抓取篇数
                    </label>
                    <select
                      value={fetchCount}
                      onChange={(e) => setFetchCount(Number(e.target.value))}
                      disabled={fetching || generating}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value={10}>10 篇</option>
                      <option value={20}>20 篇</option>
                      <option value={30}>30 篇</option>
                    </select>
                  </div>

                  {fetchError && (
                    <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {fetchError}
                    </p>
                  )}

                  {hasFetchedData && (
                    <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      ✓ 已抓取 {fetchedNotes.length} 篇笔记（含封面图）
                    </p>
                  )}

                  <button
                    onClick={handleFetch}
                    disabled={fetching || generating || !profileUrl.trim()}
                    className="w-full py-2 border border-rose-400 text-rose-500 rounded-lg text-sm font-medium hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {fetching ? '抓取中...' : hasFetchedData ? '重新抓取' : '抓取数据'}
                  </button>
                </div>
              )}

              {/* 手动粘贴模式 */}
              {mode === 'manual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    笔记标题与数据 <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-xs text-gray-400 mb-1.5">
                    每行一个标题，可附带点赞/收藏数，格式随意。
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
              )}

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
                    {mode === 'auto'
                      ? '先抓取数据，再点击「一键诊断」'
                      : '填写左侧笔记数据后点击「一键诊断」'}
                  </div>
                )}

                {!error && generating && !rawOutput && (
                  <p className="text-sm text-gray-400 animate-pulse">
                    正在分析，请稍候... <span className="not-italic text-gray-300">已用时 {elapsed}s</span>
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
                  {saved ? '已保存 ✓' : '保存到诊断记录'}
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
