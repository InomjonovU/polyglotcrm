import { useQuery } from '@tanstack/react-query'
import { BookOpen, Wallet, Users, Clock } from 'lucide-react'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import { formatMoney, MONTHS_UZ, WEEKDAY_PATTERNS } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const now = new Date()

  const { data: groups } = useQuery({
    queryKey: ['my-groups'],
    queryFn: () => api.get('/groups/').then(r => r.data),
  })

  const { data: salary } = useQuery({
    queryKey: ['my-salary', now.getFullYear(), now.getMonth() + 1],
    queryFn: () => api.get('/salary/current/', { params: { year: now.getFullYear(), month: now.getMonth() + 1 } }).then(r => r.data),
  })

  const totalStudents = groups?.results?.reduce((sum, g) => sum + g.active_students_count, 0) || 0

  return (
    <div>
      <PageHeader title={`Salom, ${user?.first_name}!`} subtitle={`${MONTHS_UZ[now.getMonth()]} ${now.getFullYear()}`} />

      <div className="grid md:grid-cols-3 gap-5 mb-6">
        <StatCard icon={BookOpen} label="Guruhlar" value={groups?.results?.length || 0} tone="brand" />
        <StatCard icon={Users} label="O'quvchilar" value={totalStudents} tone="emerald" />
        <StatCard icon={Wallet} label="To'lanishi kerak" value={formatMoney(salary?.payable)} hint={`Hisoblangan: ${formatMoney(salary?.calculated_amount)}`} tone="amber" />
      </div>

      <div className="card">
        <h3 className="font-display font-semibold text-lg mb-4">Guruhlarim</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {groups?.results?.map(g => (
            <div key={g.id} className="border border-ink-100 rounded-xl p-4 hover:border-brand-300 hover:shadow-soft transition">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold">{g.name}</h4>
                <span className="badge-info">{g.level_name}</span>
              </div>
              <div className="space-y-1 text-sm text-ink-700">
                <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {WEEKDAY_PATTERNS[g.weekday_pattern]} · {g.lesson_time?.slice(0, 5)}</div>
                <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {g.active_students_count} o'quvchi</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
