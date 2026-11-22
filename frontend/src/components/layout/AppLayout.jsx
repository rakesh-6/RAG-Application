import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Icon from '../ui/Icon'
import Logo from '../ui/Logo'

const NAV_ITEMS = [
  { to: '/chat', label: 'Chat', icon: 'chat' },
  { to: '/documents', label: 'Documents', icon: 'file' },
]

/** Top navigation on desktop, bottom tab bar on phones (NavLink sets aria-current="page"). */
export default function AppLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 md:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex h-11 items-center rounded-[10px] px-4 text-[15px] ${
                  isActive ? 'bg-indigo-50 font-semibold text-indigo-700' : 'font-medium text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-slate-600 sm:inline">{user?.email}</span>
          <button
            type="button"
            onClick={logout}
            className="flex h-11 items-center rounded-[10px] border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto pb-16 md:pb-0">
        <Outlet />
      </main>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-2 border-t border-slate-200 bg-white md:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-xs ${
                isActive ? 'font-semibold text-indigo-700' : 'font-medium text-slate-600'
              }`
            }
          >
            <Icon name={item.icon} className="size-[22px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
