import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface HistoryItem {
  id: string
  topic: string
  createdAt: number
  content: string
  model: string
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

interface Store {
  apiKey: string
  setApiKey: (k: string) => void
  baseUrl: string
  setBaseUrl: (u: string) => void
  history: HistoryItem[]
  addHistory: (item: HistoryItem) => void
  deleteHistory: (id: string) => void
  clearHistory: () => void
  startupRecords: StartupRecord[]
  addStartupRecord: (item: StartupRecord) => void
  deleteStartupRecord: (id: string) => void
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      apiKey: '',
      setApiKey: (k) => set({ apiKey: k }),
      baseUrl: '',
      setBaseUrl: (u) => set({ baseUrl: u }),
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
    }),
    { name: 'note-ai-store' }
  )
)
