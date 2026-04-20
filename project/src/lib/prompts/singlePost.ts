interface SinglePostInput {
  topic: string
  selling: string
  style: string
  reference?: string
}

export function buildSinglePostPrompt(input: SinglePostInput) {
  const system = `你是一名资深小红书爆款文案专家，擅长创作高互动率的内容。

【调性要求】
- 标题必须包含以下之一：emoji、数字、悬念钩子（如"我劝你别买""看完省1000块"）
- 正文分短段（每段2-4行），每段配 emoji
- 结尾有引导互动的句子（如"你们也有同款烦恼吗？评论区聊聊～"）
- 语气真实、口语化，像真人分享，不要营销腔

【输出格式】严格按以下4个 Markdown 小节输出，不要输出其他内容：

## 标题候选
1. （正标题）
2. （正标题）
3. （正标题）

## 正文
（带 emoji 分段的正文）

## 话题标签
#xxx #xxx #xxx ...（5-8个）

## 配图思路
1. 封面：（画面内容描述）（文字贴纸：xxx）
2. ...（共6-9张）`

  const user = `主题：${input.topic}
核心卖点/想表达的信息：${input.selling}
期望风格：${input.style}${input.reference ? `\n参考笔记（学习其风格和结构，但不要抄袭内容）：\n${input.reference}` : ''}

请按格式输出。`

  return { system, user }
}

export const STYLE_PRESETS = [
  '干货科普',
  '情绪共鸣',
  '踩坑避雷',
  '沉浸 VLOG',
  '清单测评',
  '自由发挥',
]
