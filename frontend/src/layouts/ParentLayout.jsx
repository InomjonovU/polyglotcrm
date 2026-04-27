import { Outlet } from 'react-router-dom'
import { LayoutDashboard, Award, Heart, Users } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'

const items = [
  { to: '/parent', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/parent/groups', label: 'Guruhlar', icon: Users },
  { to: '/parent/referrals', label: 'Referrallarim', icon: Award },
]

function ParentBanner() {
  const { user } = useAuth()
  const children = user?.children || []
  const childNames = children.map(c => c.full_name).join(', ')

  return (
    <div className="mb-5 rounded-2xl bg-gradient-to-r from-rose-50 via-pink-50 to-rose-50 border border-rose-200 px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-white grid place-items-center shadow-soft border border-rose-100 shrink-0">
        <Heart className="w-5 h-5 text-rose-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display font-semibold text-ink-900">Ota-ona paneli</span>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-semibold">
            {user?.full_name || 'Ota-ona'}
          </span>
        </div>
        {children.length > 0 ? (
          <div className="text-xs text-ink-600 mt-0.5 truncate">
            Farzand{children.length > 1 ? 'laringiz' : 'ingiz'}: <b className="text-ink-900">{childNames}</b>
          </div>
        ) : (
          <div className="text-xs text-ink-500 mt-0.5">
            Farzandingiz haqidagi ma'lumotlarni ko'ring
          </div>
        )}
      </div>
    </div>
  )
}

export default function ParentLayout() {
  return (
    <div className="lg:flex min-h-screen">
      <Sidebar items={items} />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <ParentBanner />
        <Outlet />
      </main>
    </div>
  )
}
