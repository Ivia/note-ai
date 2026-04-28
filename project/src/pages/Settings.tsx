import { useState } from 'react'
import { useStore } from '../lib/store'
import type { ModelProvider } from '../lib/store'
import { callAI, friendlyError, MODEL_LABELS } from '../lib/ai'

const PROVIDERS: { id: ModelProvider; label: string; placeholder: string; note: string }[] = [
  { id: 'claude', label: 'Claude', placeholder: 'sk-ant-...', note: '访问 console.anthropic.com 创建，需科学上网' },
  { id: 'deepseek', label: 'DeepSeek', placeholder: 'sk-...', note: '访问 platform.deepseek.com 创建，注册送免费额度' },
  { id: 'glm', label: 'GLM-4.6V-Flash', placeholder: '...', note: '访问 bigmodel.cn 创建，完全免费' },
]

export default function Settings() {
  const {
    activeModel, setActiveModel,
    apiKey, setApiKey, baseUrl, setBaseUrl,
    deepseekKey, setDeepseekKey,
    glmKey, setGlmKey,
  } = useStore()

  const [draftKey, setDraftKey] = useState(apiKey)
  const [draftUrl, setDraftUrl] = useState(baseUrl)
  const [draftDeepseek, setDraftDeepseek] = useState(deepseekKey)
  const [draftGlm, setDraftGlm] = useState(glmKey)
  const [showKeys, setShowKeys] = useState<Record<ModelProvider, boolean>>({ claude: false, deepseek: false, glm: false })

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [saved, setSaved] = useState(false)

  function getCurrentKey(p: ModelProvider) {
    if (p === 'claude') return draftKey
    if (p === 'deepseek') return draftDeepseek
    return draftGlm
  }

  async function handleTest() {
    const key = getCurrentKey(activeModel)
    if (!key.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      await callAI({
        provider: activeModel,
        apiKey: key.trim(),
        baseUrl: activeModel === 'claude' ? (draftUrl.trim() || undefined) : undefined,
        system: '你是一个助手',
        userMessage: '请回复"OK"两个字',
        onChunk: () => {},
      })
      setTestResult({ ok: true, msg: `✅ 连接成功！${MODEL_LABELS[activeModel]} 可用` })
    } catch (err) {
      setTestResult({ ok: false, msg: '❌ ' + friendlyError(err) })
    } finally {
      setTesting(false)
    }
  }

  function handleSave() {
    setApiKey(draftKey.trim())
    setBaseUrl(draftUrl.trim())
    setDeepseekKey(draftDeepseek.trim())
    setGlmKey(draftGlm.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function toggleShow(p: ModelProvider) {
    setShowKeys((prev) => ({ ...prev, [p]: !prev[p] }))
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-gray-800 mb-1">设置</h1>
      <p className="text-sm text-gray-500 mb-6">配置 API Key，所有数据仅存于本机浏览器。</p>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mb-6">
        🔐 你的 Key 仅保存在本机 localStorage，不会上传到任何服务器。
      </div>

      {/* 模型选择 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">使用模型</label>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setActiveModel(p.id); setTestResult(null) }}
              className={`flex-1 py-2 font-medium transition-colors ${
                activeModel === p.id
                  ? 'bg-rose-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 各 provider 的 key 输入 */}
      <div className="space-y-5">
        {PROVIDERS.map((p) => (
          <div key={p.id} className={activeModel !== p.id ? 'opacity-40' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {p.label} API Key
              {activeModel !== p.id && <span className="ml-1 text-gray-400 font-normal text-xs">（未选中）</span>}
            </label>
            <div className="flex gap-2">
              <input
                type={showKeys[p.id] ? 'text' : 'password'}
                value={p.id === 'claude' ? draftKey : p.id === 'deepseek' ? draftDeepseek : draftGlm}
                onChange={(e) => {
                  setTestResult(null)
                  if (p.id === 'claude') setDraftKey(e.target.value)
                  else if (p.id === 'deepseek') setDraftDeepseek(e.target.value)
                  else setDraftGlm(e.target.value)
                }}
                placeholder={p.placeholder}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 font-mono"
              />
              <button
                type="button"
                onClick={() => toggleShow(p.id)}
                className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {showKeys[p.id] ? '隐藏' : '显示'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">{p.note}</p>
          </div>
        ))}

        {/* Claude 独有的 Base URL */}
        <div className={activeModel !== 'claude' ? 'opacity-40' : ''}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Claude Base URL
            <span className="ml-1 text-gray-400 font-normal">（企业版 / 代理填写，个人版留空）</span>
          </label>
          <input
            type="text"
            value={draftUrl}
            onChange={(e) => { setDraftUrl(e.target.value); setTestResult(null) }}
            placeholder="https://your-proxy.example.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 font-mono"
          />
        </div>

        {testResult && (
          <p className={`text-sm ${testResult.ok ? 'text-green-700' : 'text-red-600'}`}>
            {testResult.msg}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleTest}
            disabled={!getCurrentKey(activeModel).trim() || testing}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600"
          >
            {saved ? '已保存 ✓' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
