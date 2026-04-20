# note-ai

本地自用的小红书爆款笔记生成工具（Phase 0 MVP）。

> 项目仍未脚手架化，启动命令会在 Step 1 完成后验证。

## 文档

- [产品需求 PRD](./docs/PRD.md)
- [开发计划 PLAN](./docs/PLAN.md)

## 快速开始（脚手架完成后生效）

```bash
# 进入代码目录
cd project

# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 浏览器打开 http://localhost:5173

# 4. 进入"设置"页，填入你的 Claude API Key（仅存本机 localStorage）
```

## 目录约定

```
note-ai/
├── docs/          # 产品/计划类长期文档（PRD、PLAN）
├── project/       # 所有代码与构建产物（Vite 工作区）
│   ├── src/       # 应用代码
│   ├── public/    # 静态资源
│   └── ...        # package.json、vite.config.ts 等
├── .scratch/      # 草稿、调试脚本、废弃方案（不进版本控制）
├── .gitignore
└── README.md
```

**规则**：

- 代码只放在 `project/` 下，root 不散落 `.ts`/`.tsx`
- 临时脚本/废弃方案只放 `.scratch/`
- 长期文档只放 `docs/`

## 备注

- 仅本地自用，不考虑付费、授权、合规
- 模型：Claude（Anthropic SDK，浏览器直连，BYOK）
- 访问 Anthropic API 需要代理
