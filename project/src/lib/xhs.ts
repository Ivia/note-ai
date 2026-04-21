export interface XhsNote {
  id: string
  title: string
  coverUrl: string
  likes: number
  collects: number
  comments: number
  type: string
}

export interface FetchUserNotesResult {
  notes: XhsNote[]
  userId: string
  userName: string
}

export async function fetchUserNotes(
  profileUrl: string,
  cookie: string,
  count: number
): Promise<FetchUserNotesResult> {
  const res = await fetch('/xhs-api/api/user-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: profileUrl, cookie, count }),
  })
  const data = await res.json()
  if (!res.ok || !data.success) throw new Error(data.error || '抓取失败')
  return { notes: data.notes, userId: data.userId || '', userName: data.userName || '' }
}

// 将封面图 URL 转为 base64 data URL（用于 Claude vision）
export async function coverUrlToBase64(coverUrl: string): Promise<string> {
  const res = await fetch(`/xhs-api/img-proxy?url=${encodeURIComponent(coverUrl)}`)
  if (!res.ok) throw new Error('封面图获取失败')
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export interface NoteContent {
  url: string
  title: string
  content: string
  imageUrls: string[]
  tags: string[]
  type: 'image' | 'video'
}

export async function fetchNoteContent(urls: string[], cookie: string): Promise<NoteContent[]> {
  const res = await fetch('/xhs-api/api/note-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls, cookie }),
  })
  const data = await res.json()
  if (!res.ok || !data.success) throw new Error(data.error || '抓取失败')
  return data.notes
}

// 从 data URL 中解析 base64 数据和 mediaType
export function parseDataUrl(dataUrl: string): { mediaType: string; data: string } {
  const [header, data] = dataUrl.split(',')
  const mediaType = header.match(/data:(.*);base64/)?.[1] ?? 'image/jpeg'
  return { mediaType, data }
}
