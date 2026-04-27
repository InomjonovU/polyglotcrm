import { Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Wallet, BarChart3, Settings,
  MessageSquare, UserPlus, Library, Trophy
} from 'lucide-react'
import Sidebar from './Sidebar'

const items = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/leads', label: 'Lidlar', icon: UserPlus },
  { to: '/admin/groups', label: 'Guruhlar', icon: BookOpen },
  { to: '/admin/students', label: "O'quvchilar", icon: Users },
  { to: '/admin/teachers', label: "O'qituvchilar", icon: GraduationCap },
  { to: '/admin/payments', label: "To'lovlar", icon: Wallet },
  { to: '/admin/leaderboard', label: 'Reyting', icon: Trophy },
  { to: '/admin/library', label: 'Kutubxona', icon: Library },
  { to: '/admin/sms', label: 'SMS', icon: MessageSquare },
  { to: '/admin/reports', label: 'Hisobotlar', icon: BarChart3 },
  { to: '/admin/settings', label: 'Sozlamalar', icon: Settings },
]

export default function AdminLayout() {
  return (
    <div className="lg:flex min-h-screen">
      <Sidebar items={items} />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <Outlet />
      </main>
    </div>
  )
}
