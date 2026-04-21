// 支持三种模式：只接受主页链接 / 只接受笔记链接 / 两者均可
// 多条 URL 时每行一个
export type UrlMode = 'profile' | 'note' | 'both'

interface UrlValidation {
  isProfile: boolean
  isNote: boolean
  valid: boolean
}

function classifyUrl(url: string): UrlValidation {
  const u = url.trim()
  const isProfile = /xiaohongshu\.com\/user\/profile\//.test(u)
  // 笔记：explore 路径 或 小红书分享短链
  const isNote = /xiaohongshu\.com\/explore\//.test(u) || /xhslink\.com\//.test(u)
  return { isProfile, isNote, valid: isProfile || isNote }
}

export function validateUrls(raw: string, mode: UrlMode): { urls: string[]; errors: string[] } {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
  const errors: string[] = []
  const urls: string[] = []

  for (const line of lines) {
    const { isProfile, isNote } = classifyUrl(line)
    if (mode === 'profile' && !isProfile) {
      errors.push(`不是有效的主页链接：${line.slice(0, 60)}`)
    } else if (mode === 'note' && !isNote) {
      errors.push(`不是有效的笔记链接：${line.slice(0, 60)}`)
    } else if (mode === 'both' && !isProfile && !isNote) {
      errors.push(`不是有效的小红书链接：${line.slice(0, 60)}`)
    } else {
      urls.push(line)
    }
  }

  return { urls, errors }
}

const HINT: Record<UrlMode, { label: string; placeholder: string; hint: string }> = {
  profile: {
    label: '主页链接',
    placeholder: 'https://www.xiaohongshu.com/user/profile/...',
    hint: '仅支持小红书博主主页链接，每行一条',
  },
  note: {
    label: '笔记链接',
    placeholder: 'https://www.xiaohongshu.com/explore/... 或分享短链',
    hint: '仅支持小红书笔记链接，每行一条',
  },
  both: {
    label: '链接',
    placeholder: '主页链接或笔记链接，每行一条',
    hint: '支持主页链接（/user/profile/）和笔记链接（/explore/），每行一条',
  },
}

interface Props {
  mode: UrlMode
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  single?: boolean  // true 时只允许一条，多行时显示警告
}

export default function UrlInput({ mode, value, onChange, disabled, single }: Props) {
  const cfg = HINT[mode]

  const lines = value.split('\n').map((l) => l.trim()).filter(Boolean)
  const singleWarn = single && lines.length > 1

  // 实时校验每一行
  const lineErrors = lines
    .map((line) => {
      const { isProfile, isNote } = classifyUrl(line)
      if (mode === 'profile' && !isProfile) return line
      if (mode === 'note' && !isNote) return line
      if (mode === 'both' && !isProfile && !isNote) return line
      return null
    })
    .filter((e): e is string => e !== null)

  const hasError = lineErrors.length > 0 || singleWarn
  const borderColor = hasError
    ? 'border-red-400 focus:ring-red-400'
    : value.trim() && !hasError
    ? 'border-green-400 focus:ring-green-400'
    : 'border-gray-300 focus:ring-rose-400'

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {cfg.label} <span className="text-rose-500">*</span>
      </label>
      <p className="text-xs text-gray-400 mb-1.5">{cfg.hint}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={single ? 2 : 4}
        disabled={disabled}
        placeholder={cfg.placeholder}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none disabled:bg-gray-50 disabled:text-gray-400 transition-colors ${borderColor}`}
      />
      {singleWarn && (
        <p className="text-xs text-red-500 mt-1">此处只支持输入一条链接</p>
      )}
      {!singleWarn && lineErrors.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {lineErrors.map((e, i) => (
            <p key={i} className="text-xs text-red-500">
              ✗ {mode === 'profile' ? '主页' : mode === 'note' ? '笔记' : '小红书'}链接格式不正确
            </p>
          ))}
        </div>
      )}
      {!hasError && lines.length > 0 && (
        <p className="text-xs text-green-600 mt-1">✓ {lines.length} 条链接格式正确</p>
      )}
    </div>
  )
}
