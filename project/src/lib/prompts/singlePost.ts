export const STYLE_WRITING = ['轻松幽默', '温柔治愈', '中二热血', '犀利毒舌', '正经严谨', '自由发挥']
export const STYLE_CONTENT = ['教程攻略', '经验复盘', '种草测评', '情感共鸣', '互动问答', '日常分享', '踩坑避雷', '自由发挥']

interface SinglePostInput {
  topic: string
  selling: string
  noteType: 'image' | 'video'
  styleWriting: string
  styleContent: string
  reference?: string
  hasReferenceImages?: boolean
}

export function buildSinglePostPrompt(input: SinglePostInput) {
  const isVideo = input.noteType === 'video'
  const styleDesc = [
    input.styleWriting !== '自由发挥' ? `文风：${input.styleWriting}` : '',
    input.styleContent !== '自由发挥' ? `内容形式：${input.styleContent}` : '',
  ].filter(Boolean).join('，') || '风格不限'

  const outputFormat = isVideo
    ? `## 标题候选
1. （正标题）
2. （正标题）
3. （正标题）

## 正文
（带 emoji 分段的正文）

## 话题标签
#xxx #xxx #xxx ...（5-8个）

## 视频脚本
（按分镜列出，每个分镜：时间节点 / 画面内容 / 旁白文字 / 文字贴纸，建议 BGM 风格）`
    : `## 标题候选
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

  const system = `你是一名资深小红书爆款文案专家，擅长创作高互动率的内容。

【调性要求】
- 标题必须包含以下之一：emoji、数字、悬念钩子（如"我劝你别买""看完省1000块"）
- 正文分短段（每段2-4行），每段配 emoji
- 结尾有引导互动的句子（如"你们也有同款烦恼吗？评论区聊聊～"）
- 语气真实、口语化，像真人分享，不要营销腔

【输出格式】严格按以下 Markdown 小节输出，不要输出其他内容：

${outputFormat}`

  const refPart = input.reference
    ? `\n参考笔记（学习其风格和结构，但不要抄袭内容）${input.hasReferenceImages ? '（已附上参考笔记图片，请结合图片内容理解其风格）' : ''}：\n${input.reference}`
    : ''

  const user = `笔记形式：${isVideo ? '视频' : '图文'}
主题：${input.topic}
核心卖点/想表达的信息：${input.selling}
风格要求：${styleDesc}${refPart}

请按格式输出。`

  return { system, user }
}
