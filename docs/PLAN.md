# 小本本 · 本地自用版开发计划（Phase 0 · MVP）

## Context

用户想做一个帮小红书创作者"一键出爆款笔记"的 AI 工具。经过几轮需求对齐，当前聚焦 **Phase 0 本地自用版 MVP**：

- **目标**：用户（产品负责人）自己能跑起来，覆盖最核心场景，快速验证产品形态
- **不考虑**：付费、授权、激活码、商标、合规声明（留给未来有商业化计划后再说）
- **范围收敛**：本次只做 3 步（脚手架 + 设置页 + 单篇文案生成），不做"新手起号"和"账号诊断"
- **模型收敛**：首批只接 **Claude**，豆包等其他模型留到后续版本

目录相关：
- 工作目录：`/Users/shedonggui/Desktop/1/Hello/tools/note-ai/`（已从 `redbook/` 重命名完成）
- 文档：`docs/PRD.md`、`docs/PLAN.md`（当前文件）
- 代码：所有 Vite 工作区文件放在 `project/` 子目录下（避免 root 杂乱）
- 草稿：`.scratch/`（已 gitignore）

核心技术决策（已与用户对齐）：
- 前端：Vite + React + TypeScript + TailwindCSS
- 运行方式：本地 `npm run dev`，浏览器访问 localhost
- API Key 存储：浏览器 localStorage（纯本地，零后端）
- 模型：**仅 Claude**（Anthropic SDK，BYOK）
- 小红书内容获取：本次不做；用户直接填主题+卖点+风格

---

## 产品范围（本次 MVP）

**只做场景 3：单篇文案生成**。

用户输入：
- 笔记主题（如"推荐 3 款平价 CC 霜"）
- 核心卖点 / 想表达的信息
- 风格（6 个预设 + 自由输入）
- 可选：参考笔记文本（贴一段爆款笔记作为风格对标）

输出：
- 3 组标题候选（正标 + 副钩子）
- 正文（含 emoji、分段、结尾互动）
- 话题标签（5–8 个）
- 配图思路（6–9 张，每张含画面内容 + 文字贴纸）

**通用模块**（本次必做）：
- 设置页：Claude API Key 配置
- 历史记录：localStorage 存储，可查看/复制/导出 Markdown

---

## 技术栈

| 层 | 选型 | 理由 |
| --- | --- | --- |
| 构建 | Vite 5 | 现代、快 |
| 框架 | React 18 + TypeScript | 类型安全 |
| 样式 | TailwindCSS 3 | 快速搭 UI |
| 状态 | Zustand | 轻量，存 Key 和历史 |
| 路由 | React Router 6 | 简单 Tab 切换 |
| Markdown | react-markdown | 结果渲染 |
| 模型 SDK | `@anthropic-ai/sdk` | 支持浏览器流式，需 `dangerouslyAllowBrowser: true` |

**浏览器 CORS 说明**：Anthropic Claude 的 TS SDK 支持浏览器运行，开 `dangerouslyAllowBrowser: true` 即可。自用版 Key 只在本机 localStorage，不存在安全问题。

---

## 项目结构

```
note-ai/                         # 工作区根目录
├── README.md                    # 怎么跑起来
├── .gitignore
├── docs/                        # 产品/计划类长期文档
│   ├── PRD.md
│   └── PLAN.md                  # 当前文件
├── .scratch/                    # 草稿 / 调试脚本 / 废弃方案（gitignore）
└── project/                     # ← Vite 工作区，所有代码与构建产物
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── public/                  # 静态资源
    └── src/
        ├── main.tsx             # 入口
        ├── App.tsx              # 路由骨架（3 个 Tab：单篇/历史/设置）
        ├── components/
        │   ├── Layout.tsx       # 顶栏 + 主内容
        │   ├── SectionBlock.tsx # 可复用结果分块（标题/正文/标签/配图）
        │   └── MarkdownView.tsx # Markdown 渲染
        ├── pages/
        │   ├── SinglePost.tsx   # 主场景
        │   ├── History.tsx      # 历史记录
        │   └── Settings.tsx     # Key 配置
        ├── lib/
        │   ├── store.ts         # Zustand：apiKey / history
        │   ├── claude.ts        # Claude 流式调用封装
        │   └── prompts/
        │       └── singlePost.ts
        └── styles/
            └── globals.css
```

---

## 实现步骤

### Step 0 · 目录管理（已完成）

- [x] `redbook/` → `note-ai/` 重命名完成
- [x] `docs/` 建好，`PRD.md`、`PLAN.md` 已归位
- [x] `project/` 子目录建好（Vite 工作区占位）
- [x] `.scratch/`、`.gitignore`、`README.md` 就位

后续所有代码操作进入 `project/` 目录执行。

### Step 1 · 项目脚手架（半天）

> 所有命令在 `project/` 下执行。当前 `project/` 里只有一个空的 `.gitkeep`，脚手架时先删掉。

```bash
cd /Users/shedonggui/Desktop/1/Hello/tools/note-ai/project
rm -f .gitkeep
npm create vite@latest . -- --template react-ts
npm i zustand react-router-dom react-markdown @anthropic-ai/sdk
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- 配置 `tailwind.config.js` 的 content 路径
- 写 `src/styles/globals.css` 引入 Tailwind 指令
- 搭 `src/components/Layout.tsx`：顶部 3 个 Tab（单篇 / 历史 / 设置）
- 配置 React Router

**验证**：`npm run dev` 打开 `http://localhost:5173`，看到 3 个能切换的 Tab 即可

### Step 2 · 设置页 + Claude 调用层（半天 ~ 1 天）

**设置页** (`pages/Settings.tsx`)：
- 一个输入框：Claude API Key（type=password，带"显示/隐藏"切换）
- 一个"测试连接"按钮：调一次简短的 Claude 请求，成功弹 toast
- 保存到 Zustand store + localStorage 持久化
- 顶部提示："你的 Key 仅存于本机浏览器，不会上传任何地方"

**Claude 调用封装** (`lib/claude.ts`)：

```ts
// 伪代码
export async function callClaude({
  apiKey,
  system,
  userMessage,
  onChunk,
}: {
  apiKey: string;
  system: string;
  userMessage: string;
  onChunk: (text: string) => void;
}): Promise<string>
```

- 使用 `@anthropic-ai/sdk` 的 `client.messages.stream(...)`
- model 用 `claude-sonnet-4-6`
- max_tokens 8192
- 把 delta 累加传给 onChunk
- 返回完整文本

**Store** (`lib/store.ts`)：
```ts
interface Store {
  apiKey: string;
  setApiKey: (k: string) => void;
  history: HistoryItem[];
  addHistory: (item: HistoryItem) => void;
  // ...
}
```

**验证**：在设置页填入真实 Claude Key，点"测试连接"能看到 "✅ 连接成功"

### Step 3 · 单篇文案生成（1 ~ 1.5 天，MVP 主打）

**UI** (`pages/SinglePost.tsx`)：

表单区：
- 笔记主题（单行输入，必填）
- 核心卖点/想表达的信息（多行文本，必填）
- 风格选择：6 个预设卡片（干货科普 / 情绪共鸣 / 踩坑避雷 / 沉浸 VLOG / 清单测评 / 自由）+ 一个"自定义"输入
- 参考笔记（可选，多行文本，提示"可粘贴一段你喜欢的爆款笔记作为风格对标"）
- "一键生成"按钮（未填必填项或无 Key 时禁用）

结果区（生成后出现）：
- 4 个 `SectionBlock`：标题候选 / 正文 / 话题标签 / 配图思路
- 每块右上角：复制按钮
- 顶部：整体复制 Markdown 按钮、保存到历史按钮（自动也会保存）

**Prompt 模板** (`lib/prompts/singlePost.ts`)：

```ts
export function buildSinglePostPrompt(input: {
  topic: string;
  selling: string;
  style: string;
  reference?: string;
}) {
  const system = `你是一名资深小红书爆款文案专家...
【调性要求】
- 标题必须带 emoji、数字、悬念钩子之一
- 正文分短段，每段加 emoji
- 结尾有互动引导句
【输出格式】严格按以下 4 个 Markdown 小节输出：
## 标题候选
1. ...
2. ...
3. ...
## 正文
...
## 话题标签
#xxx #xxx ...
## 配图思路
1. 封面：...（含文字贴纸：xxx）
2. ...
`;

  const user = `主题：${input.topic}
核心卖点：${input.selling}
期望风格：${input.style}
${input.reference ? `参考笔记（学习其风格和结构，但不要抄袭）：\n${input.reference}` : ''}
请按格式输出。`;

  return { system, user };
}
```

**生成流程**：
1. 点击"一键生成" → 调 `callClaude(...)`
2. 流式 onChunk → 累加到 state，实时渲染 Markdown
3. 完成后：解析 Markdown 按 `##` 分块，填入 4 个 SectionBlock
4. 自动写入历史（Zustand + localStorage，最多 100 条）

**历史页** (`pages/History.tsx`)：
- 列表展示最近 N 条：主题 + 时间 + 预览
- 点击查看详情，支持复制和导出 `.md`
- 删除单条 / 清空全部

**验证（端到端测试）**：
1. 设置页填 Claude Key
2. 单篇页输入"推荐 3 款平价粉底液" + "持妆久、不卡粉、学生党预算" + 风格选"清单测评"
3. 点生成 → 能看到流式输出 → 最终 4 个分块
4. 人工评价：输出是否像真的"小红书爆款"（标题有钩子、正文有 emoji、配图思路具体）
5. 打开历史页 → 能看到刚才的记录 → 能复制和导出

---

## 关键技术细节与注意事项

### Claude SDK 浏览器用法

```ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey,
  dangerouslyAllowBrowser: true,  // 必须
});

const stream = client.messages.stream({
  model: 'claude-sonnet-4-6',
  max_tokens: 8192,
  system: systemPrompt,
  messages: [{ role: 'user', content: userPrompt }],
});

for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    onChunk(event.delta.text);
  }
}
```

### 错误处理
- Key 空 → 直接提示"请先在设置页填入 API Key"
- Key 错误（401） → 提示"API Key 无效，请检查"
- 余额不足（402） → 提示"账户余额不足，请在 Anthropic Console 充值"
- 网络错误 → "请检查网络（Anthropic API 需要科学上网）"

### 国内访问 Anthropic API
- 用户需要自备梯子，代码层面只要浏览器能访问 `api.anthropic.com` 就能用
- 在设置页 README 注明这一点

---

## 验证方法（端到端）

1. **安装与启动**：
   ```bash
   cd /Users/shedonggui/Desktop/1/Hello/tools/note-ai/project
   npm install
   npm run dev
   ```
2. **浏览器访问** `http://localhost:5173`
3. **设置页**：输入真实 Claude API Key → 测试连接成功
4. **单篇场景**：输入上述测试案例 → 流式输出 → 4 个分块完整
5. **历史页**：能查看、复制、导出
6. **刷新页面**：Key 和历史都保留（localStorage 生效）
7. **异常验证**：
   - 清空 Key → 点生成 → 提示"请先填 Key"
   - 故意填错 Key → 看错误提示

---

## 时间预估

| 步骤 | 预估 |
| --- | --- |
| Step 0 目录重命名 | 5 分钟 |
| Step 1 脚手架 | 0.5 天 |
| Step 2 设置页 + Claude 层 | 0.5~1 天 |
| Step 3 单篇生成（主打） | 1~1.5 天 |
| **合计** | **2~3 天** |

---

## 不在本次范围（后续版本）

- 场景 1 新手起号、场景 2 账号诊断（需求已清晰，代码结构已预留）
- 豆包等其他模型接入（模型层已抽象，加家方便）
- Cloudflare Worker 代理 + 小红书自动抓取
- 商业化（激活码、付费）
- 文生图
