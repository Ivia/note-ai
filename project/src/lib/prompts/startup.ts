export const DIRECTIONS = [
  '美妆护肤', '穿搭时尚', '美食探店', '健身运动',
  '母婴育儿', '数码科技', '家居生活', '职场干货',
  '旅行攻略', '学习成长',
]

export const AGE_TAGS = ['18-22岁', '23-28岁', '29-35岁', '35岁以上']
export const IDENTITY_TAGS = ['学生', '上班族', '宝妈', '自由职业']
export const RESOURCE_TAGS = ['颜值', '专业背景', '生活经历', '产品资源']
export const GOALS = ['快速涨粉', '带货变现', '个人品牌', '副业探索']

interface StartupInput {
  direction: string
  tags: string[]
  persona?: string
  goal: string
  reference?: string
  hasReferenceImages?: boolean
}

export function buildStartupPrompt(input: StartupInput) {
  const system = `你是一名资深小红书运营专家，擅长帮助新人快速起号。

【输出格式】严格按以下3个 Markdown 小节输出，不要输出其他内容：

## 对标分析
（共性选题方向、爆款标题套路、封面风格特征、高频互动话术）

## 账号定位建议
（差异化切入点、账号人设定位、昵称/简介/头像风格建议各2-3个范例）

## 30天内容节奏表
（按周拆解，每周主题方向 + 建议发帖频率 + 2-3个具体选题示例）`

  const personaLine = input.persona?.trim() ? `\n人设描述：${input.persona.trim()}` : ''
  const refLine = input.reference
    ? `\n对标参考笔记${input.hasReferenceImages ? '（已附上封面图，请结合封面风格进行分析）' : ''}（学习其风格规律，不要抄袭）：\n${input.reference}`
    : ''
  const user = `内容方向：${input.direction}
参考方向标签：${input.tags.join('、') || '未填写'}${personaLine}
起号目标：${input.goal}${refLine}

请按格式输出。`

  return { system, user }
}

interface StartupNotesInput {
  direction: string
  goal: string
  count: number
  planContent: string  // 已生成的起号计划内容，用于上下文
}

export function buildStartupNotesPrompt(input: StartupNotesInput) {
  const system = `你是一名资深小红书爆款文案专家。根据已制定的起号计划，生成具体的起号笔记。

【调性要求】
- 标题必须包含 emoji、数字、悬念钩子之一
- 正文分短段，每段配 emoji，语气真实口语化
- 结尾有互动引导句

【输出格式】每篇笔记用 ### 第X篇 分隔，每篇包含：
#### 标题候选
1. ...
2. ...
3. ...
#### 正文
...
#### 话题标签
#xxx #xxx ...
#### 配图思路
1. ...`

  const user = `垂类方向：${input.direction}
起号目标：${input.goal}
需要生成：${input.count}篇起号笔记

已有起号计划如下（请结合节奏表中的选题方向生成笔记）：
${input.planContent}

请按格式输出${input.count}篇笔记。`

  return { system, user }
}
