import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
  className?: string
}

export default function MarkdownView({ content, className = '' }: Props) {
  return (
    <div className={`text-sm text-gray-700 leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-gray-200">{children}</tr>,
          th: ({ children }) => <th className="text-left px-3 py-2 font-medium text-gray-700 border border-gray-200">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-gray-700 border border-gray-200">{children}</td>,
          h1: ({ children }) => <p className="font-semibold text-gray-800 text-base mt-3 first:mt-0">{children}</p>,
          h2: ({ children }) => <p className="font-semibold text-gray-800 mt-3 first:mt-0">{children}</p>,
          h3: ({ children }) => <p className="font-medium text-gray-700 mt-2 first:mt-0">{children}</p>,
          p: ({ children }) => <p className="mt-1 first:mt-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-gray-800">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="mt-1 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="mt-1 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="flex gap-1.5"><span className="shrink-0 text-gray-400">·</span><span>{children}</span></li>,
          hr: () => <hr className="border-gray-200 my-2" />,
          code: ({ children }) => <code className="bg-gray-100 rounded px-1 text-xs font-mono">{children}</code>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 pl-3 text-gray-500 mt-1">{children}</blockquote>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
