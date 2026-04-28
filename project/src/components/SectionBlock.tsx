import { useState } from 'react'
import MarkdownView from './MarkdownView'
import { mdToText } from '../lib/mdToText'

interface Props {
  title: string
  content: string
}

export default function SectionBlock({ title, content }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(mdToText(content))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <button
          onClick={handleCopy}
          className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded border border-transparent hover:border-gray-200 transition-colors"
        >
          {copied ? '已复制 ✓' : '复制'}
        </button>
      </div>
      <MarkdownView content={content} />
    </div>
  )
}
