import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/', label: '✍️ 生成文案', end: true },
  { to: '/startup', label: '🚀 起号助手' },
  { to: '/diagnosis', label: '🔍 账号诊断' },
  { to: '/settings', label: '⚙️ 设置' },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center gap-6 h-14">
            <span className="font-semibold text-gray-800 text-base shrink-0">小本本</span>
            <nav className="flex gap-1">
              {tabs.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-rose-50 text-rose-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
