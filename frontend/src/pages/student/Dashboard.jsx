import { useQuery } from '@tanstack/react-query'
import { BookOpen, Wallet, Clock, CheckSquare } from 'lucide-react'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import { formatMoney, WEEKDAY_PATTERNS, MONTHS_UZ } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'

export default function StudentDashboard() {
  const { user } = useAuth()
  const now = new Date()

  const { data: me } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/students/', {}).then(r => r.data.results?.[0]),
  })
  const { data: charges } = useQuery({
    queryKey: ['my-charges', now.getFullYear(), now.getMonth() + 1],
    queryFn: () => api.get('/payments/charges/', { params: { year: now.getFullYear(), month: now.getMonth() + 1 } }).then(r => r.data),
  })

  const thisMonthCharge = charges?.results?.[0]

  return (
    <div>
      <PageHeader title={`Salom, ${user?.first_name}!`} subtitle={`${MONTHS_UZ[now.getMonth()]} ${now.getFullYear()}`} />

      <div className="grid md:grid-cols-3 gap-5 mb-6">
        <StatCard
          icon={Wallet}
          label="Bu oy to'lovi"
          value={formatMoney(thisMonthCharge?.amount)}
          hint={thisMonthCharge ? `To'langan: ${formatMoney(thisMonthCharge.paid_total)}` : 'Hisob yo\'q'}
          tone={thisMonthCharge?.balance > 0 ? 'rose' : 'emerald'}
        />
        <StatCard icon={BookOpen} label="Guruh" value={me?.group_name || '—'} tone="brand" />
        <StatCard icon={CheckSquare} label="Holat" value={me?.status_display || '—'} tone="amber" />
      </div>

      {thisMonthCharge && Number(thisMonthCharge.discount_percent) > 0 && (
        <div className="card bg-brand-50 border-brand-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-600 grid place-items-center text-white font-display text-xl font-bold">
              −{thisMonthCharge.discount_percent}%
            </div>
            <div>
              <div className="text-sm text-ink-500">Chegirma qo'llangan</div>
              <div className="font-display font-semibold">Asl narx: {formatMoney(thisMonthCharge.original_amount)} → {formatMoney(thisMonthCharge.amount)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
