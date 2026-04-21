import { useState, useEffect, useRef } from 'react'

interface Props {
  open: boolean
  onSuccess: (cookie: string) => void
  onCancel: () => void
}

export default function LoginModal({ open, onSuccess, onCancel }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!open) { setElapsed(0); setError(''); return }

    setElapsed(0)
    setError('')

    const controller = new AbortController()
    abortRef.current = controller

    const timer = setInterval(() => setElapsed((s) => s + 1), 1000)

    fetch('/xhs-api/api/login-xhs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        clearInterval(timer)
        if (data.success && data.cookie) {
          onSuccess(data.cookie)
        } else {
          setError(data.error || '登录失败，请重试')
        }
      })
      .catch((err) => {
        clearInterval(timer)
        if (err.name !== 'AbortError') {
          setError('登录请求失败，请重试')
        }
      })

    return () => {
      clearInterval(timer)
      controller.abort()
    }
  }, [open])

  function handleCancel() {
    abortRef.current?.abort()
    onCancel()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center space-y-4">
        <p className="text-base font-semibold text-gray-800">需要登录小红书</p>

        {!error ? (
          <>
            <p className="text-sm text-gray-500 leading-relaxed">
              请在弹出的浏览器窗口中扫码登录<br />
              登录成功后将自动继续
            </p>
            <p className="text-2xl font-mono text-rose-500">{elapsed}s</p>
            <p className="text-xs text-gray-400">正在等待登录...</p>
          </>
        ) : (
          <>
            <p className="text-sm text-red-500">{error}</p>
          </>
        )}

        <button
          onClick={handleCancel}
          className="w-full py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          取消
        </button>
      </div>
    </div>
  )
}
