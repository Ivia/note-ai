import ReactMarkdown from 'react-markdown'

export default function MarkdownView({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}
