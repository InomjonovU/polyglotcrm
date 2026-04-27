import { Outlet } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Wallet, Award, Trophy } from 'lucide-react'
import Sidebar from './Sidebar'

const items = [
  { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/teacher/groups', label: 'Guruhlarim', icon: BookOpen },
  { to: '/teacher/leaderboard', label: 'Reyting', icon: Trophy },
  { to: '/teacher/salary', label: 'Maosh', icon: Wallet },
  { to: '/teacher/referrals', label: 'Referrallarim', icon: Award },
]

export default function TeacherLayout() {
  return (
    <div className="lg:flex min-h-screen">
      <Sidebar items={items} />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <Outlet />
      </main>
    </div>
  )
}
