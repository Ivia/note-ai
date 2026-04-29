import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface HistoryItem {
  id: string
  topic: string
  createdAt: number
  content: string
  model: string
  noteType?: 'image' | 'video'
  styleWriting?: string
  styleContent?: string
}

export interface StartupNote {
  id: string
  startupId: string
  createdAt: number
  model: string
  count: 1 | 3 | 5
  content: string
}

export interface DiagnosisRecord {
  id: string
  createdAt: number
  model: string
  positioning: string  // 账号定位（可选，空字符串表示未填）
  noteCount: number    // 粘贴的笔记行数
  content: string      // 完整诊断报告
  summary: string      // 一句话总结
  userId: string       // 小红书账号 ID（自动抓取时填入，仅存储不展示）
  userName: string     // 小红书账号名称（自动抓取时填入）
  userRedId: string    // 小红书号（形如 xiaohongshu123，有则展示代替 userId）
}

export interface StartupRecord {
  id: string
  createdAt: number
  model: string
  direction: string        // 内容方向（自由文本）
  tags: string[]           // 参考方向标签（可选多选）
  persona: string          // 人设描述（可选）
  goal: string             // 起号目标
  reference: string        // 对标参考
  content: string
}

export type ModelProvider = 'claude' | 'deepseek'

interface Store {
  activeModel: ModelProvider
  setActiveModel: (m: ModelProvider) => void
  apiKey: string
  setApiKey: (k: string) => void
  baseUrl: string
  setBaseUrl: (u: string) => void
  deepseekKey: string
  setDeepseekKey: (k: string) => void
  xhsCookie: string
  setXhsCookie: (c: string) => void
  history: HistoryItem[]
  addHistory: (item: HistoryItem) => void
  deleteHistory: (id: string) => void
  clearHistory: () => void
  startupRecords: StartupRecord[]
  addStartupRecord: (item: StartupRecord) => void
  deleteStartupRecord: (id: string) => void
  startupNotes: StartupNote[]
  addStartupNote: (item: StartupNote) => void
  deleteStartupNote: (id: string) => void
  diagnosisRecords: DiagnosisRecord[]
  addDiagnosisRecord: (item: DiagnosisRecord) => void
  deleteDiagnosisRecord: (id: string) => void
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      activeModel: 'claude',
      setActiveModel: (m) => set({ activeModel: m }),
      apiKey: '',
      setApiKey: (k) => set({ apiKey: k }),
      baseUrl: '',
      setBaseUrl: (u) => set({ baseUrl: u }),
      deepseekKey: '',
      setDeepseekKey: (k) => set({ deepseekKey: k }),
      xhsCookie: '',
      setXhsCookie: (c) => set({ xhsCookie: c }),
      history: [],
      addHistory: (item) =>
        set((s) => ({ history: [item, ...s.history].slice(0, 100) })),
      deleteHistory: (id) =>
        set((s) => ({ history: s.history.filter((h) => h.id !== id) })),
      clearHistory: () => set({ history: [] }),
      startupRecords: [],
      addStartupRecord: (item) =>
        set((s) => ({ startupRecords: [item, ...s.startupRecords].slice(0, 100) })),
      deleteStartupRecord: (id) =>
        set((s) => ({ startupRecords: s.startupRecords.filter((r) => r.id !== id) })),
      startupNotes: [],
      addStartupNote: (item) =>
        set((s) => ({ startupNotes: [item, ...s.startupNotes].slice(0, 500) })),
      deleteStartupNote: (id) =>
        set((s) => ({ startupNotes: s.startupNotes.filter((n) => n.id !== id) })),
      diagnosisRecords: [],
      addDiagnosisRecord: (item) =>
        set((s) => ({ diagnosisRecords: [item, ...s.diagnosisRecords].slice(0, 100) })),
      deleteDiagnosisRecord: (id) =>
        set((s) => ({ diagnosisRecords: s.diagnosisRecords.filter((r) => r.id !== id) })),
    }),
    { name: 'note-ai-store' }
  )
)
