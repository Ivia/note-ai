import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface HistoryItem {
  id: string
  topic: string
  createdAt: number
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
    }),
    { name: 'note-ai-store' }
  )
)
