import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import { LogOut, Menu, X } from 'lucide-react'

export default function Sidebar({ items }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const baseLabel = { admin: 'Administrator', teacher: "O'qituvchi", student: "O'quvchi", parent: 'Ota-ona' }[user?.role]
  const roleLabel = user?.role === 'teacher' && user?.teacher_type === 'support'
    ? "O'qituvchi · Support"
    : baseLabel

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Lock body scroll when drawer open on mobile
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const navContent = (
    <>
      <div className="p-6 border-b border-ink-100 flex items-center justify-between">
        <Logo />
        <button onClick={() => setOpen(false)} className="lg:hidden p-2 hover:bg-ink-100 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-brand-600 text-white shadow-lift'
                    : 'text-ink-700 hover:bg-ink-100'
                )
              }
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="p-3 border-t border-ink-100">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white font-semibold text-sm shrink-0">
            {(user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{user?.full_name || user?.username}</div>
            <div className="text-[11px] text-ink-500">{roleLabel}</div>
          </div>
          <button onClick={logout} className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition" title="Chiqish">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile topbar */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-ink-100 flex items-center justify-between px-4 h-14">
        <button onClick={() => setOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-ink-100">
          <Menu className="w-6 h-6" />
        </button>
        <Logo compact />
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white font-semibold text-sm">
          {(user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-white border-r border-ink-100 h-screen sticky top-0 flex-col">
        {navContent}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[85%] max-w-[320px] bg-white flex flex-col animate-slide-up" style={{ animation: 'slideInLeft 0.25s ease-out' }}>
            {navContent}
          </aside>
        </div>
      )}

      <style>{`@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
    </>
  )
}
