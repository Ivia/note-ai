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

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system,
    messages: [{ role: 'user', content: userMessage }],
  })

  let full = ''
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      full += event.delta.text
      onChunk(event.delta.text)
    }
  }
  return full
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
