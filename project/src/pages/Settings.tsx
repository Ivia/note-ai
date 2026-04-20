import { useState } from 'react'
import { useStore } from '../lib/store'
import { callClaude, friendlyError } from '../lib/claude'

export default function Settings() {
  const { apiKey, setApiKey, baseUrl, setBaseUrl } = useStore()
  const [draftKey, setDraftKey] = useState(apiKey)
  const [draftUrl, setDraftUrl] = useState(baseUrl)
  const [show, setShow] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleTest() {
    if (!draftKey.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      await callClaude({
        apiKey: draftKey.trim(),
        baseUrl: draftUrl.trim() || undefined,
        system: '你是一个助手',
        userMessage: '请回复"OK"两个字',
        onChunk: () => {},
      })
      setTestResult({ ok: true, msg: '✅ 连接成功！API Key 有效' })
    } catch (err) {
      setTestResult({ ok: false, msg: '❌ ' + friendlyError(err) })
    } finally {
      setTesting(false)
    }
  }

  function handleSave() {
    setApiKey(draftKey.trim())
    setBaseUrl(draftUrl.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-gray-800 mb-1">设置</h1>
      <p className="text-sm text-gray-500 mb-6">配置你的 Claude API Key，所有数据仅存于本机浏览器。</p>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mb-6">
        🔐 你的 Key 仅保存在本机 localStorage，不会上传到任何服务器。
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Claude API Key
          </label>
          <div className="flex gap-2">
            <input
              type={show ? 'text' : 'password'}
              value={draftKey}
              onChange={(e) => { setDraftKey(e.target.value); setTestResult(null) }}
              placeholder="sk-ant-..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 font-mono"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {show ? '隐藏' : '显示'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Base URL
            <span className="ml-1 text-gray-400 font-normal">（企业版 / 代理必填，个人版留空）</span>
          </label>
          <input
            type="text"
            value={draftUrl}
            onChange={(e) => { setDraftUrl(e.target.value); setTestResult(null) }}
            placeholder="https://your-company-api.example.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 font-mono"
          />
          <p className="text-xs text-gray-400 mt-1">
            企业版 API 地址由贵公司管理员提供，通常形如 <code className="bg-gray-100 px-1 rounded">https://xxx.anthropic.com</code> 或代理域名。
          </p>
        </div>

        {testResult && (
          <p className={`text-sm ${testResult.ok ? 'text-green-700' : 'text-red-600'}`}>
            {testResult.msg}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleTest}
            disabled={!draftKey.trim() || testing}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
          <button
            onClick={handleSave}
            disabled={!draftKey.trim()}
            className="px-4 py-2 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saved ? '已保存 ✓' : '保存'}
          </button>
        </div>

        <div className="text-xs text-gray-400 mt-2">
          个人版 Key：访问 <span className="font-mono">console.anthropic.com</span> 创建，需科学上网。
        </div>
      </div>
    </div>
  )
}
