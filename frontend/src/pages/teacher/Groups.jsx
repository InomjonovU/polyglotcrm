import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Users, Clock, ChevronRight } from 'lucide-react'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import { WEEKDAY_PATTERNS, formatMoney } from '../../utils/format'

export default function TeacherGroups() {
  const { data: groups } = useQuery({
    queryKey: ['my-groups'],
    queryFn: () => api.get('/groups/').then(r => r.data),
  })

  return (
    <div>
      <PageHeader title="Guruhlarim" subtitle="Guruhga kirib davomat, baho va vazifalar bilan ishlang" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups?.results?.length === 0 && (
          <div className="card sm:col-span-2 lg:col-span-3 text-center py-12 text-ink-500">
            Biriktirilgan guruh yo'q
          </div>
        )}
        {groups?.results?.map(g => (
          <Link key={g.id} to={`/teacher/groups/${g.id}`} className="card hover:shadow-lift transition group">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs text-brand-600 font-semibold">{g.course_name}</div>
                <h3 className="font-display font-bold text-lg truncate">{g.name}</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-ink-300 group-hover:text-brand-500 transition shrink-0" />
            </div>
            <div className="mt-3 space-y-1 text-xs text-ink-500">
              <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {WEEKDAY_PATTERNS[g.weekday_pattern]} · {g.lesson_time?.slice(0, 5)}</div>
              <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {g.active_students_count} faol o'quvchi</div>
            </div>
            <div className="mt-3 pt-3 border-t border-ink-100 text-sm">
              <span className="font-display font-bold text-brand-600">{formatMoney(g.monthly_fee)}</span>
              <span className="text-ink-500 text-xs ml-1">/ oylik</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
