# note-ai · 项目规范

## 开发工作流（每次开发必须遵守）

每一轮开发分 4 个阶段，**每个阶段结束必须停下来等用户确认**，未收到确认前不得进入下一阶段。

### 阶段 1 · 确认本次开发内容

收到需求后，输出以下内容，然后**停止，等用户回复"确认"**：

```
## 本次开发内容确认

**目标**：（一句话描述要做什么）

**改动范围**：
- 新增文件：...
- 修改文件：...
- 不涉及：...

**不做的事**：（明确列出范围外的内容，防止镀金）

请确认以上范围，回复"确认"后开始写代码。
```

### 阶段 2 · 写代码

收到确认后才开始写代码。写完所有改动后，输出以下内容，然后**停止，等用户验收**：

```
## 代码完成，请验收

**已完成**：
- （逐条列出实际改动）

**验收方式**：
1. 打开 http://localhost:5173（若 dev server 未启动先运行 `npm run dev`）
2. （具体操作步骤）
3. （预期结果）

验收通过后回复"通过"，有问题直接描述。
```

### 阶段 3 · 验收

等待用户操作验收。如果用户反馈问题，在本阶段修复并重新请求验收，**不跳到提交阶段**。

### 阶段 4 · 提交 git

收到"通过"后，执行 commit + push 到 `dev` 分支，然后报告：

```
## 已提交

- commit：（message）
- 分支：（branch）
- 链接：https://github.com/Ivia/note-ai/commit/（sha）
```

---

## 分支管理规范

### 日常开发

- **所有代码改动必须在 `dev` 分支上进行**，禁止直接在 `main` 上写代码
- 每次 push 目标为 `origin/dev`
- 若当前不在 `dev` 分支，先执行 `git checkout dev`，若不存在则 `git checkout -b dev && git push -u origin dev`

### 发布版本

当用户明确说"发布 vX.Y.Z"或"出 vX.Y.Z 版本"时，执行以下步骤（**无需再次确认**）：

1. 从 `dev` 新建版本分支：`git checkout -b vX.Y.Z`
2. 推送到远端：`git push -u origin vX.Y.Z`
3. 将 `dev` 合并回 `main`：`git checkout main && git merge dev && git push`
4. 切回 `dev` 继续开发：`git checkout dev`
5. 报告：已创建 `vX.Y.Z` 分支、已同步到 `main`

### 分支结构总览

| 分支 | 用途 |
|------|------|
| `main` | 稳定版，只在发布时从 `dev` 合并进来 |
| `dev` | 日常开发主力分支 |
| `vX.Y.Z` | 每个发布版本的快照，只读，不在上面继续开发 |

---

## 核心原则：所有项目相关文件必须在 note-ai/ 下

**和这个项目相关的任何文件，一律放在 `/Users/shedonggui/Desktop/1/Hello/tools/note-ai/` 下。**

禁止把项目相关内容写入以下位置（及其它项目目录之外的任何地方）：

- `~/.claude/plans/`
- 用户 home、桌面、`/tmp/` 下的任意位置
- 其它项目目录
- 任何工具的默认输出/缓存目录

## Plan 文件的处理

进入 plan 模式时，Claude Code harness 会把 plan 写到 `~/.claude/plans/<slug>.md`。这是 harness 默认行为，不可配置绕过。

**每次写完 plan，必须立刻执行以下三步：**

1. 复制：把 `~/.claude/plans/<slug>.md` 写入本项目的 `docs/PLAN.md`（多份 plan 用 `docs/plans/<slug>.md`）
2. 删除原件：`rm ~/.claude/plans/<slug>.md`
3. 后续引用以项目内副本为 source of truth，harness 里的原件不再视为有效

**落实动作**：退出 plan 模式后的第一条回复里必须包含这三步的结果，不能留到"下次再整理"。

## 文件分类表

| 类型 | 位置 |
| --- | --- |
| 产品 / 开发计划文档 | `docs/` |
| Claude Code 项目指令 | root `CLAUDE.md`（stub 用 `@docs/CLAUDE.md` import）+ `docs/CLAUDE.md`（正文） |
| 应用代码 | `project/src/` |
| 构建配置（package.json、vite.config.ts 等） | `project/`（Vite 约定） |
| 静态资源 | `project/public/` |
| 临时脚本 / 废弃方案 / 一次性草稿 | `.scratch/`（已 gitignore） |

## 内存监控与任务进度保存

### 触发条件

执行任何多步骤任务时，**每完成一个主要步骤后**必须检查一次内存：

```bash
ps -o pid,rss,comm -p $(pgrep -f "claude") 2>/dev/null | awk 'NR>1{mb=$2/1024; printf "PID=%s MEM=%.0fMB %s\n",$1,mb,$3}'
```

**安全阈值：4GB**（留 2GB 缓冲，避免系统接近 6GB 时才发现）。检测到任意 Claude 相关进程 RSS ≥ 4096MB，立即执行保存流程。

### 保存流程（触发后必须完整执行）

1. **停止当前工具调用**，不再读取新文件或执行新命令
2. **生成 log 文件**，写入 `docs/logs/progress_<YYYYMMDD_HHMM>.md`，内容包含：
   - 时间戳与触发时的内存读数
   - 已完成的步骤列表（逐条）
   - 尚未完成的步骤列表（逐条）
   - 当前内存暴增的可能原因分析（结合本次工具调用历史判断）
   - 下次继续执行的入口指令（用户可直接粘贴给 Claude）
3. **明确告知用户**：已保存进度到哪个文件，建议用 `/compact` 或新会话继续

### log 文件格式模板

```markdown
# 任务进度存档

**时间**：<timestamp>  
**触发原因**：内存达到 <X>MB，超过 4096MB 安全阈值

## 内存暴增原因分析
<结合本次工具调用，说明是哪些操作导致上下文/内存增长>

## 已完成步骤
- [x] ...

## 未完成步骤
- [ ] ...

## 继续执行（下次会话直接粘贴）
> 继续执行以下任务，进度详见 docs/logs/progress_<slug>.md：
> <任务描述>
```

### 文件位置

| 类型 | 位置 |
|------|------|
| 进度 log | `docs/logs/progress_<YYYYMMDD_HHMM>.md` |

`docs/logs/` 目录按需创建，不提前建立。

---

## 工具调用约束（防止内存爆炸）

- **禁止**不加 `-not -path "*/node_modules/*"` 地对项目目录执行 `find`
- **禁止**对 `project/` 执行全量 `Glob("**/*")` 或递归 `Read`
- Bash 命令产生超过 50KB 输出时，应限制范围后重试，而不是把结果塞入上下文
- 探索代码时优先用 `Glob` + `Grep`，只读必要的具体文件

## 新建 / 写入文件前的检查清单

调用 `Write` / `Edit` 前，确认目标路径：

1. 是否在 `/Users/shedonggui/Desktop/1/Hello/tools/note-ai/` 之下？
2. 是否匹配上面的文件分类表？
3. 如不匹配，**停下来向用户确认**，不要自作主张写到其它位置。

## 例外：Claude Code 的 harness 内部状态

以下属于 Claude Code 自身的运行状态，不视为"项目文件"，**无需**搬回项目目录：

- `~/.claude/projects/<slug>/sessions/` — 会话历史
- `~/.claude/projects/<slug>/memory/` — 跨会话记忆
- `~/.claude/history.jsonl`、`telemetry/`、`cache/` 等

但如果用户明确要求"项目外完全不留痕迹"，需要在 `settings.json` 中关闭相关功能，并在本文档追加对应条目。
