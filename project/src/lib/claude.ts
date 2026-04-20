import Anthropic from '@anthropic-ai/sdk'

interface CallClaudeOptions {
  apiKey: string
  baseUrl?: string
  system: string
  userMessage: string
  onChunk: (text: string) => void
}

export async function callClaude({ apiKey, baseUrl, system, userMessage, onChunk }: CallClaudeOptions): Promise<string> {
  const clientOpts: ConstructorParameters<typeof Anthropic>[0] = { apiKey, dangerouslyAllowBrowser: true }
  if (baseUrl?.trim()) clientOpts.baseURL = baseUrl.trim()
  const client = new Anthropic(clientOpts)

  // 先尝试流式；企业版网关如不支持 SSE 会报 "no chunks"，回退到非流式
  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content: userMessage }],
    })

    let full = ''
    stream.on('text', (text) => {
      full += text
      onChunk(text)
    })

    await stream.finalMessage()
    if (full) return full
  } catch {
    // 流式失败，降级到非流式
  }

  // 非流式兜底（企业版网关兼容）
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system,
    messages: [{ role: 'user', content: userMessage }],
  })
  const block = msg.content[0]
  const text = block.type === 'text' ? block.text : ''
  onChunk(text)
  return text
}

export function friendlyError(err: unknown): string {
  if (err instanceof Anthropic.APIError) {
    if (err.status === 401) return 'API Key 无效，请检查后重试'
    if (err.status === 402) return '账户余额不足，请在 Anthropic Console 充值'
    return `API 错误 ${err.status}：${err.message}`
  }
  if (err instanceof Error && err.message.includes('fetch')) {
    return '网络连接失败，请检查网络（Anthropic API 需要科学上网）'
  }
  return String(err)
}
