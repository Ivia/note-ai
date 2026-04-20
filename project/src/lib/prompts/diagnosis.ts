interface DiagnosisInput {
  positioning?: string
  notes: string
}

export function buildDiagnosisPrompt(input: DiagnosisInput) {
  const system = `你是一名资深小红书数据分析专家，擅长通过笔记标题和互动数据分析账号问题并给出优化建议。

【输出格式】严格按以下4个 Markdown 小节输出，不要输出其他内容：

## 账号画像
（根据标题推断当前赛道、内容风格标签、整体数据表现特征）

## 内容诊断
（哪类标题/选题互动高、哪类低，找出共性规律；封面/标题层面存在的问题）

## 优化建议
（赛道聚焦或扩展方向、可复用的爆款标题结构、发布节奏建议）

## 选题推荐
（结合账号风格，给出10个具体可执行的新选题，每个一行）`

  const positioningLine = input.positioning?.trim()
    ? `账号定位：${input.positioning.trim()}\n`
    : ''

  const user = `${positioningLine}近期笔记标题与互动数据（每行一条，格式随意）：
${input.notes}

请按格式输出诊断报告。`

  return { system, user }
}
