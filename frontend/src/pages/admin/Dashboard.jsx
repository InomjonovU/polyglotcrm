import { useQuery } from '@tanstack/react-query'
import { Users, BookOpen, Wallet, TrendingUp, UserPlus, CreditCard, CheckSquare } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import { formatMoney } from '../../utils/format'

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reports/dashboard/').then((r) => r.data),
  })

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Umumiy ko'rinish va bugungi statistika" />

      {isLoading ? (
        <div className="grid md:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-32 animate-pulse bg-ink-100/50" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-4 gap-5">
            <StatCard icon={Users} label="Faol o'quvchilar" value={data.total_students} tone="brand" />
            <StatCard icon={BookOpen} label="Guruhlar" value={data.groups_count} tone="emerald" />
            <StatCard icon={Wallet} label="Bu oy to'langan" value={`${data.paid_percent}%`} hint={formatMoney(data.total_paid)} tone="amber" />
            <StatCard icon={TrendingUp} label="Qarzdorlik" value={formatMoney(data.balance)} tone="rose" />
          </div>

          <div className="grid md:grid-cols-3 gap-5 mt-6">
            <div className="card md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-lg">Oxirgi 30 kun daromadi</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.income_last_30_days}>
                  <defs>
                    <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" fontSize={11} stroke="#64748B" tickFormatter={(v) => v.slice(5)} />
                  <YAxis fontSize={11} stroke="#64748B" />
                  <Tooltip formatter={(v) => formatMoney(v)} />
                  <Area type="monotone" dataKey="amount" stroke="#2563EB" fill="url(#inc)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="font-display font-semibold text-lg mb-4">Tezkor havolalar</h3>
              <div className="space-y-2">
                <QuickLink to="/admin/students" icon={UserPlus} label="Yangi o'quvchi" />
                <QuickLink to="/admin/payments" icon={CreditCard} label="To'lov qabul qilish" />
                <QuickLink to="/admin/groups" icon={BookOpen} label="Guruhlar" />
                <QuickLink to="/admin/reports" icon={TrendingUp} label="Hisobotlar" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function QuickLink({ to, icon: Icon, label }) {
  return (
    <Link to={to} className="flex items-center gap-3 p-3 rounded-xl hover:bg-brand-50 transition group">
      <div className="w-9 h-9 rounded-lg bg-brand-50 group-hover:bg-brand-600 text-brand-600 group-hover:text-white grid place-items-center transition">
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  )
}
