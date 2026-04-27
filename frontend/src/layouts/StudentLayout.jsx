import { Outlet } from 'react-router-dom'
import { LayoutDashboard, Award, Users } from 'lucide-react'
import Sidebar from './Sidebar'

const items = [
  { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/student/groups', label: 'Guruhlarim', icon: Users },
  { to: '/student/referrals', label: 'Referrallarim', icon: Award },
]

export default function StudentLayout() {
  return (
    <div className="lg:flex min-h-screen">
      <Sidebar items={items} />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <Outlet />
      </main>
    </div>
  )
}
