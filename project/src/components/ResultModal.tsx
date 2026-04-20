import { useState, useEffect } from 'react'
import SectionBlock from './SectionBlock'

interface Sections {
  titles: string
  body: string
  tags: string
  images: string
}

interface Props {
  open: boolean
  generating: boolean
  rawOutput: string
  sections: Sections | null
  savedToHistory: boolean
  error: string
  onClose: () => void
  onRegenerate: () => void
  onSave: () => void
}

/**
 * 生成结果弹窗
 * - 流式生成中实时展示原始输出
 * - 生成完成后按 ## 分块渲染
 * - 提供复制全部 / 重新生成 / 保存到历史操作
 */
export default function ResultModal({
  open,
  generating,
  rawOutput,
  sections,
  savedToHistory,
  error,
  onClose,
  onRegenerate,
  onSave,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  // 生成中每秒计一次
  useEffect(() => {
    if (!generating) { setElapsed(0); return }
    setElapsed(0)
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [generating])

  if (!open) return null

  async function handleCopyAll() {
    await navigator.clipboard.writeText(rawOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-10 pb-6 px-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col max-h-[85vh] shadow-xl">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <span className="font-semibold text-gray-800">
            {generating ? `生成中... ${elapsed}s` : '生成结果'}
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none px-1"
          >
            ×
          </button>
        </div>

        {/* 内容区（可滚动），min-h 保证弹窗不缩成一条 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-64">

          {/* 1. 报错 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* 2. 等待首字节 */}
          {!error && generating && !rawOutput && (
            <p className="text-sm text-gray-400 animate-pulse">正在生成，请稍候...</p>
          )}

          {/* 3. 生成中：实时展示流式原文 */}
          {!error && generating && rawOutput && (
            <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
              {rawOutput}
            </div>
          )}

          {/* 4. 生成完成 + 分块解析成功 */}
          {!error && !generating && rawOutput && sections?.titles && (
            <>
              <SectionBlock title="📝 标题候选" content={sections.titles} />
              {sections.body && <SectionBlock title="📖 正文" content={sections.body} />}
              {sections.tags && <SectionBlock title="🏷️ 话题标签" content={sections.tags} />}
              {sections.images && <SectionBlock title="🖼️ 配图思路" content={sections.images} />}
            </>
          )}

          {/* 5. 生成完成 + 分块解析失败（格式不符）：展示原文兜底 */}
          {!error && !generating && rawOutput && !sections?.titles && (
            <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
              {rawOutput}
            </div>
          )}

          {/* 6. 生成完成但内容为空 */}
          {!error && !generating && !rawOutput && (
            <p className="text-sm text-gray-400">生成内容为空，请重试。</p>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={handleCopyAll}
            disabled={!rawOutput}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {copied ? '已复制 ✓' : '复制全部'}
          </button>
          <button
            onClick={onRegenerate}
            disabled={generating}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            重新生成
          </button>
          <button
            onClick={onSave}
            disabled={generating || savedToHistory}
            className="ml-auto px-4 py-2 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {savedToHistory ? '已保存 ✓' : '保存到历史'}
          </button>
        </div>
      </div>
    </div>
  )
}
