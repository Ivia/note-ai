import { useState, useEffect, useRef } from 'react'

type CookieStatus = 'idle' | 'checking' | 'valid' | 'invalid'

interface Props {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}

async function validateCookie(cookie: string): Promise<{ valid: boolean; userName?: string }> {
  try {
    const res = await fetch('/xhs-api/api/validate-cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookie }),
    })
    return await res.json()
  } catch {
    return { valid: false }
  }
}

export default function CookieInput({ value, onChange, disabled }: Props) {
  const [status, setStatus] = useState<CookieStatus>('idle')
  const [helpOpen, setHelpOpen] = useState(false)
  const hasChecked = useRef(false)

  // 组件挂载时，若已有保存的 cookie 则自动校验
  useEffect(() => {
    if (!value.trim() || hasChecked.current) return
    hasChecked.current = true
    setStatus('checking')
    validateCookie(value).then((r) => setStatus(r.valid ? 'valid' : 'invalid'))
  }, [value])

  function handleChange(v: string) {
    onChange(v)
    setStatus('idle')
    hasChecked.current = false
  }

  const placeholder =
    status === 'invalid'
      ? 'Cookie 已失效，请重新获取并填入'
      : status === 'valid'
      ? '已自动填入保存的 Cookie'
      : '请获取并填写 Cookie'

  const borderColor =
    status === 'valid'
      ? 'border-green-400 focus:ring-green-400'
      : status === 'invalid'
      ? 'border-red-400 focus:ring-red-400'
      : 'border-gray-300 focus:ring-rose-400'

  return (
    <div>
      {/* 标签行 */}
      <div className="flex items-center gap-1 mb-1">
        <label className="text-sm font-medium text-gray-700">
          Cookie <span className="text-rose-500">*</span>
        </label>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="w-4 h-4 rounded-full border border-gray-400 text-gray-400 hover:border-gray-600 hover:text-gray-600 flex items-center justify-center text-xs leading-none transition-colors"
          title="如何获取 Cookie"
        >
          !
        </button>
      </div>

      {/* 输入框 */}
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        rows={3}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none font-mono text-xs disabled:bg-gray-50 disabled:text-gray-400 transition-colors ${borderColor} ${
          status === 'invalid' ? 'placeholder:text-red-400' : ''
        }`}
      />

      {/* 状态提示 */}
      {status === 'checking' && (
        <p className="text-xs text-gray-400 mt-1 animate-pulse">正在校验 Cookie…</p>
      )}
      {status === 'valid' && (
        <p className="text-xs text-green-600 mt-1">✓ Cookie 有效</p>
      )}
      {status === 'invalid' && (
        <p className="text-xs text-red-500 mt-1">✗ Cookie 无效，请重新填写</p>
      )}

      {/* 使用说明弹窗 */}
      {helpOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-semibold text-gray-800 text-sm">如何获取小红书 Cookie</span>
              <button
                onClick={() => setHelpOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none px-1"
              >
                ×
              </button>
            </div>
            <ol className="px-5 py-4 space-y-2 text-sm text-gray-700 list-decimal list-inside leading-relaxed">
              <li>用 Chrome 打开 <span className="font-mono text-xs bg-gray-100 px-1 rounded">www.xiaohongshu.com</span> 并登录</li>
              <li>按 <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">F12</kbd>（Mac：<kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">⌘⌥I</kbd>）打开开发者工具</li>
              <li>切换到「<strong>Application</strong>」标签页</li>
              <li>左侧展开 <span className="font-mono text-xs">Storage → Cookies → https://www.xiaohongshu.com</span></li>
              <li>在右侧找到任意一条，按 <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">Ctrl+A</kbd> 全选，右键 → Copy all</li>
              <li>或切换到「<strong>Network</strong>」标签，刷新页面，找到任意请求，在 Headers 中找到 <span className="font-mono text-xs">Cookie:</span> 那行，复制其值</li>
              <li>将复制的内容粘贴到输入框中</li>
            </ol>
            <p className="px-5 pb-4 text-xs text-amber-600">
              ⚠️ Cookie 通常有效期数天至数周，失效后需重新获取
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
