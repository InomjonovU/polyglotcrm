import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Users, Calendar, Clock, ChevronRight, BookOpen, CalendarCheck } from 'lucide-react'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import { formatMoney, formatDate } from '../../utils/format'

export default function StudentGroups() {
  const location = useLocation()
  // /parent/... yoki /student/...
  const basePath = location.pathname.startsWith('/parent') ? '/parent' : '/student'

  const { data, isLoading } = useQuery({
    queryKey: ['my-groups'],
    queryFn: () => api.get('/groups/').then(r => r.data),
  })

  const groups = data?.results || []

  return (
    <div>
      <PageHeader title="Guruhlar" subtitle="O'qiyotgan guruhlaringiz ro'yxati" />

      {isLoading && <div className="card text-center text-ink-500">Yuklanmoqda...</div>}

      {!isLoading && groups.length === 0 && (
        <div className="card text-center py-12">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-ink-100 grid place-items-center mb-3">
            <BookOpen className="w-6 h-6 text-ink-500" />
          </div>
          <div className="font-display text-lg font-semibold mb-1">Guruhlar yo'q</div>
          <div className="text-sm text-ink-500">Hali biror guruhga yozilmagansiz.</div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {groups.map(g => (
          <Link
            key={g.id}
            to={`${basePath}/groups/${g.id}`}
            className="card hover:shadow-lift hover:-translate-y-0.5 transition-all group block"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <div className="text-xs text-ink-500 mb-1 truncate">
                  {g.course_name}{g.level_name ? ` · ${g.level_name}` : ''}
                </div>
                <h3 className="font-display font-semibold text-lg group-hover:text-brand-600 transition truncate">
                  {g.name}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand-50 grid place-items-center shrink-0">
                <Users className="w-5 h-5 text-brand-600" />
              </div>
            </div>

            <div className="space-y-1.5 text-sm text-ink-700">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-ink-400" />
                <span>{g.weekday_pattern_display}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-ink-400" />
                <span>{g.lesson_time?.slice(0, 5)}</span>
              </div>
              {g.start_date && (
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-3.5 h-3.5 text-ink-400" />
                  <span>
                    {new Date(g.start_date) > new Date() ? 'Boshlanadi: ' : 'Boshlangan: '}
                    <b>{formatDate(g.start_date)}</b>
                  </span>
                </div>
              )}
              {g.teacher_name && (
                <div className="text-xs text-ink-500 mt-2 pt-2 border-t border-ink-100">
                  O'qituvchi: <b className="text-ink-700">{g.teacher_name}</b>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-ink-100 flex items-center justify-between text-sm">
              <span className="text-ink-500">{formatMoney(g.monthly_fee)}/oy</span>
              <span className="text-brand-600 font-medium inline-flex items-center gap-1">
                Ochish <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
