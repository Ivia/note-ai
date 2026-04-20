# note-ai · 项目规范

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
