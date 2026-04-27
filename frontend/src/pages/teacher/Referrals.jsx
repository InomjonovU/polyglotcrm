import { useQuery } from '@tanstack/react-query'
import { Award, Users, UserCheck } from 'lucide-react'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import { formatDate } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'

export default function TeacherReferrals() {
  const { user } = useAuth()

  const { data: me } = useQuery({
    queryKey: ['my-teacher-profile'],
    queryFn: () => api.get('/teachers/me/').then(r => r.data),
    enabled: !!user,
  })

  const { data: referrals, isLoading } = useQuery({
    queryKey: ['my-referrals-teacher', me?.id],
    queryFn: () => api.get('/students/', { params: { referrer_teacher: me.id } }).then(r => r.data),
    enabled: !!me?.id,
  })

  const rows = referrals?.results || []
  const activeCount = rows.filter(r => r.status === 'active').length

  return (
    <div>
      <PageHeader
        title="Referrallarim"
        subtitle="Sizning taklifingiz bilan qo'shilgan o'quvchilar"
      />

      <div className="grid sm:grid-cols-2 gap-5 mb-6">
        <StatCard icon={Users} label="Jami referrallar" value={rows.length} tone="brand" />
        <StatCard icon={UserCheck} label="Faollar" value={activeCount} tone="emerald" />
      </div>

      <div className="card">
        <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-brand-600" /> Ro'yxat
        </h3>
        {isLoading ? (
          <div className="text-center py-6 text-ink-500">Yuklanmoqda...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-ink-500">
            <Award className="w-10 h-10 mx-auto mb-2 text-ink-300" />
            Hozircha referrallar yo'q.
          </div>
        ) : (
          <table className="table-clean">
            <thead><tr><th>Ism</th><th>Telefon</th><th>Holat</th><th>Qo'shilgan sana</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="font-medium">{r.full_name}</td>
                  <td>+{r.phone}</td>
                  <td>
                    <span className={r.status === 'active' ? 'badge-success' : r.status === 'frozen' ? 'badge-info' : 'badge-muted'}>
                      {r.status_display}
                    </span>
                  </td>
                  <td>{formatDate(r.joined_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
