interface DiagnosisInput {
  positioning?: string
  notes: string
  hasImages?: boolean
}

export function buildDiagnosisPrompt(input: DiagnosisInput) {
  const imageContext = input.hasImages
    ? '每篇笔记的封面图也一并提供（图片顺序与标题顺序一致），请结合封面视觉元素（构图、色调、文字、人物/产品展示方式）综合分析。'
    : ''

  const system = `你是一名资深小红书数据分析专家，擅长通过笔记标题、封面图和互动数据分析账号问题并给出优化建议。${imageContext ? '\n\n' + imageContext : ''}

【输出格式】严格按以下5个 Markdown 小节输出，不要输出其他内容：

## 账号画像
（根据标题${input.hasImages ? '、封面风格' : ''}推断当前赛道、内容风格标签、整体数据表现特征）

## 内容诊断
（哪类标题/选题互动高、哪类低，找出共性规律；${input.hasImages ? '封面视觉风格与标题匹配度分析，' : ''}封面/标题层面存在的问题）

## 优化建议
（赛道聚焦或扩展方向、可复用的爆款标题结构${input.hasImages ? '、封面设计改进方向' : ''}、发布节奏建议）

## 选题推荐
（结合账号风格，给出10个具体可执行的新选题，每个一行）

## 诊断要点
（用一句话总结本次诊断最核心的问题和改进方向，20-40字，加粗输出，直接指出最重要的行动建议）`

  const positioningLine = input.positioning?.trim()
    ? `账号定位：${input.positioning.trim()}\n`
    : ''

  const user = `${positioningLine}近期笔记标题与互动数据（每行一条，格式随意）：
${input.notes}
${input.hasImages ? '\n封面图已随消息附上，图片顺序与上方标题顺序一致。\n' : ''}
请按格式输出诊断报告。`

  return { system, user }
}
