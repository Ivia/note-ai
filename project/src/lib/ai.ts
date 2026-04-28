import { callClaude, friendlyError as claudeFriendlyError } from './claude'
import type { ImageInput } from './claude'
import type { ModelProvider } from './store'

export type { ImageInput }

interface CallAIOptions {
  provider: ModelProvider
  apiKey: string
  baseUrl?: string
  system: string
  userMessage: string
  images?: ImageInput[]
  onChunk: (text: string) => void
}

const PROVIDER_CONFIG: Record<Exclude<ModelProvider, 'claude'>, { baseUrl: string; model: string }> = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
  },
  glm: {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4v-flash',
  },
}

async function callOpenAICompat({ baseUrl, model, apiKey, system, userMessage, images, onChunk }: {
  baseUrl: string
  model: string
  apiKey: string
  system: string
  userMessage: string
  images?: ImageInput[]
  onChunk: (text: string) => void
}): Promise<void> {
  type ContentPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }

  let userContent: string | ContentPart[]
  if (images?.length) {
    const parts: ContentPart[] = [{ type: 'text', text: userMessage }]
    for (const img of images) {
      parts.push({
        type: 'image_url',
        image_url: { url: `data:${img.mediaType};base64,${img.data}` },
      })
    }
    userContent = parts
  } else {
    userContent = userMessage
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API 错误 ${res.status}：${body || res.statusText}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('无法读取响应流')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (!trimmed.startsWith('data: ')) continue
      try {
        const json = JSON.parse(trimmed.slice(6))
        const chunk = json.choices?.[0]?.delta?.content
        if (chunk) onChunk(chunk)
      } catch {
        // 跳过无法解析的行
      }
    }
  }
}

export async function callAI({ provider, apiKey, baseUrl, system, userMessage, images, onChunk }: CallAIOptions): Promise<void> {
  if (provider === 'claude') {
    await callClaude({ apiKey, baseUrl, system, userMessage, images, onChunk })
    return
  }
  const cfg = PROVIDER_CONFIG[provider]
  await callOpenAICompat({
    baseUrl: cfg.baseUrl,
    model: cfg.model,
    apiKey,
    system,
    userMessage,
    images,
    onChunk,
  })
}

export function friendlyError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message
    if (msg.includes('401')) return 'API Key 无效，请检查后重试'
    if (msg.includes('402') || msg.includes('insufficient')) return '账户余额不足，请充值'
    if (msg.includes('429')) return '请求过于频繁，请稍后重试'
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')) return '网络连接失败，请检查网络'
    if (msg.startsWith('API 错误')) return msg
  }
  return claudeFriendlyError(err)
}

export const MODEL_LABELS: Record<ModelProvider, string> = {
  claude: 'claude-sonnet-4-6',
  deepseek: 'deepseek-chat',
  glm: 'glm-4v-flash',
}
