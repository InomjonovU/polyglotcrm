import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Medal, Award, Search } from 'lucide-react'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'
import Combobox from '../components/Combobox'
import Pagination from '../components/Pagination'
import { useAuth } from '../context/AuthContext'

/**
 * Universal "Reyting" sahifasi — admin / teacher / student / parent
 *
 * - admin   : barcha o'quvchilar reytingi, optional group filter
 * - teacher : o'z guruhlari, optional group filter
 * - student : faqat o'z guruhi (avtomatik) — o'z o'rni belgilanadi
 * - parent  : farzandi guruh(lar)i
 */
export default function Leaderboard() {
  const { user } = useAuth()
  const [groupId, setGroupId] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  // Admin va teacher uchun guruh tanlovi
  const showGroupFilter = user?.role === 'admin' || user?.role === 'teacher'
  const { data: groups } = useQuery({
    queryKey: ['groups-for-leaderboard', user?.role],
    queryFn: () => api.get('/groups/').then(r => r.data),
    enabled: !!user && showGroupFilter,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', groupId],
    queryFn: () => api.get('/grades/leaderboard/', {
      params: { group: groupId || undefined },
    }).then(r => r.data),
    enabled: !!user,
  })

  useEffect(() => { setPage(1) }, [groupId, q])

  const allRows = data?.results || []
  const myId = data?.my_id

  const filtered = useMemo(() => {
    if (!q.trim()) return allRows
    const t = q.trim().toLowerCase()
    return allRows.filter(r =>
      r.full_name.toLowerCase().includes(t) ||
      (r.group_names || []).some(n => n.toLowerCase().includes(t))
    )
  }, [allRows, q])

  const total = filtered.length
  const slice = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  // O'quvchining shaxsiy o'rni va statistikasi
  const me = myId ? allRows.find(r => r.student_id === myId) : null

  return (
    <div>
      <PageHeader
        title="Reyting"
        subtitle={
          user?.role === 'admin' ? "Barcha o'quvchilar o'rtacha bal bo'yicha"
          : user?.role === 'teacher' ? "O'qituvchi guruhlaridagi reyting"
          : "Guruhdagi o'quvchilar reytingi"
        }
      />

      {/* Foydalanuvchining shaxsiy o'rni */}
      {me && (
        <div className="card mb-5 bg-gradient-to-br from-brand-50 to-white border-brand-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-600 text-white grid place-items-center font-display font-bold text-2xl">
              #{me.rank}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-ink-500 uppercase tracking-wide">Sizning o'rningiz</div>
              <div className="font-display font-bold text-xl text-ink-900 truncate">{me.full_name}</div>
              <div className="text-xs text-ink-500 truncate">{(me.group_names || []).join(', ')}</div>
            </div>
            <div className="text-right">
              <div className="font-display font-bold text-3xl text-brand-700">{me.avg_score}</div>
              <div className="text-xs text-ink-500">{me.grade_count} ta baho</div>
            </div>
          </div>
        </div>
      )}

      {/* Filterlar */}
      <div className="card">
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              className="input pl-9"
              placeholder="Ism yoki guruh bo'yicha qidirish..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {showGroupFilter && (
            <Combobox
              value={groupId}
              onChange={setGroupId}
              placeholder="Barcha guruhlar"
              options={(groups?.results || []).map(g => ({ value: g.id, label: g.name }))}
            />
          )}
        </div>

        {/* Reyting jadvali */}
        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead>
              <tr>
                <th className="w-16 text-center">O'rin</th>
                <th>O'quvchi</th>
                <th className="hidden sm:table-cell">Guruh(lar)</th>
                <th className="text-center">Baholar</th>
                <th className="text-right">O'rtacha</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="text-center py-8 text-ink-500">Yuklanmoqda...</td></tr>}
              {!isLoading && total === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-ink-500">
                  Reyting bo'sh — hali baholar qo'yilmagan
                </td></tr>
              )}
              {slice.map(r => (
                <tr key={r.student_id} className={r.student_id === myId ? 'bg-brand-50/60' : ''}>
                  <td className="text-center"><RankCell rank={r.rank} /></td>
                  <td className="font-medium">{r.full_name}{r.student_id === myId && <span className="ml-2 text-[10px] text-brand-600 uppercase tracking-wide">(siz)</span>}</td>
                  <td className="hidden sm:table-cell text-xs text-ink-500">
                    {(r.group_names || []).map((n, i) => (
                      <span key={i} className="inline-block bg-ink-100 text-ink-700 rounded px-1.5 py-0.5 mr-1">{n}</span>
                    ))}
                  </td>
                  <td className="text-center text-ink-600">{r.grade_count}</td>
                  <td className="text-right">
                    <span className="font-display font-bold text-lg text-brand-700">{r.avg_score}</span>
                    <span className="text-ink-300 text-xs">/10</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onChange={setPage}
        />
      </div>
    </div>
  )
}

function RankCell({ rank }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-700">
        <Trophy className="w-5 h-5" />
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-ink-100 text-ink-600">
        <Medal className="w-5 h-5" />
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 text-orange-700">
        <Award className="w-5 h-5" />
      </span>
    )
  }
  return <span className="inline-block font-display font-bold text-ink-500">#{rank}</span>
}
