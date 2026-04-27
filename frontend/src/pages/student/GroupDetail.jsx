import { useState, useEffect } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Calendar, Clock, CheckSquare, FileText, Star, Trophy, Wallet,
  Crown, Medal, Paperclip, Receipt as ReceiptIcon, ScanLine,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import { formatDate, formatDateTime, formatMoney, MONTHS_UZ } from '../../utils/format'
import Pagination from '../../components/Pagination'
import Modal from '../../components/Modal'
import PaymentReceipt from '../../components/PaymentReceipt'

const TABS = [
  { key: 'attendance', label: 'Davomat', icon: CheckSquare },
  { key: 'homework', label: 'Vazifalar', icon: FileText },
  { key: 'grades', label: 'Baholar', icon: Star },
  { key: 'leaderboard', label: 'Reyting', icon: Trophy },
  { key: 'payments', label: "To'lovlar", icon: Wallet },
]

export default function StudentGroupDetail() {
  const { id } = useParams()
  const location = useLocation()
  const basePath = location.pathname.startsWith('/parent') ? '/parent' : '/student'
  const [tab, setTab] = useState('attendance')

  const { data: group } = useQuery({
    queryKey: ['my-group', id],
    queryFn: () => api.get(`/groups/${id}/`).then(r => r.data),
  })

  return (
    <div>
      <Link to={`${basePath}/groups`} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600 mb-4 transition">
        <ArrowLeft className="w-4 h-4" /> Guruhlar ro'yxatiga
      </Link>

      {/* Group header */}
      <div className="card mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs text-ink-500 mb-1">
              {group?.course_name}{group?.level_name ? ` · ${group.level_name}` : ''}
            </div>
            <h1 className="font-display font-bold text-2xl">{group?.name || '—'}</h1>
            <div className="flex items-center gap-4 mt-3 text-sm text-ink-700 flex-wrap">
              <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4 text-ink-400" /> {group?.weekday_pattern_display}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4 text-ink-400" /> {group?.lesson_time?.slice(0, 5)}</span>
              {group?.teacher_name && <span className="text-ink-500">O'qituvchi: <b className="text-ink-700">{group.teacher_name}</b></span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-ink-500">Oylik narx</div>
            <div className="font-display font-bold text-lg text-ink-900">{formatMoney(group?.monthly_fee)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-ink-100 rounded-xl w-fit max-w-full overflow-x-auto mb-5">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition inline-flex items-center gap-1.5 whitespace-nowrap ${
              tab === key ? 'bg-white shadow-soft text-ink-900' : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'attendance' && <AttendanceTab groupId={id} />}
      {tab === 'homework' && <HomeworkTab groupId={id} />}
      {tab === 'grades' && <GradesTab groupId={id} />}
      {tab === 'leaderboard' && <LeaderboardTab groupId={id} />}
      {tab === 'payments' && <PaymentsTab groupId={id} />}
    </div>
  )
}

// ==================================================
// Davomat
// ==================================================
function AttendanceTab({ groupId }) {
  const [page, setPage] = useState(1)
  const [statusF, setStatusF] = useState('')
  useEffect(() => { setPage(1) }, [statusF])

  const { data, isLoading } = useQuery({
    queryKey: ['my-att-group', groupId, statusF, page],
    queryFn: () => api.get('/attendance/', {
      params: { group: groupId, status: statusF || undefined, page },
    }).then(r => r.data),
    keepPreviousData: true,
  })

  const rows = data?.results || []
  const total = rows.length
  const present = rows.filter(r => r.status === 'present').length
  const late = rows.filter(r => r.status === 'late').length
  const absent = rows.filter(r => r.status === 'absent').length

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-emerald-50 rounded-xl text-center"><div className="text-2xl font-bold text-emerald-700">{present}</div><div className="text-xs text-emerald-600">Keldi</div></div>
          <div className="p-3 bg-amber-50 rounded-xl text-center"><div className="text-2xl font-bold text-amber-700">{late}</div><div className="text-xs text-amber-600">Kech</div></div>
          <div className="p-3 bg-rose-50 rounded-xl text-center"><div className="text-2xl font-bold text-rose-700">{absent}</div><div className="text-xs text-rose-600">Kelmadi</div></div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-display font-semibold text-lg">Kunlik tarix</h3>
          <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="input max-w-[180px]">
            <option value="">Barcha holatlar</option>
            <option value="present">Keldi</option>
            <option value="late">Kech</option>
            <option value="absent">Kelmadi</option>
          </select>
        </div>
        <table className="table-clean">
          <thead><tr><th>Sana</th><th>Holat</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={2} className="text-center py-6 text-ink-500">Yuklanmoqda...</td></tr>}
            {!isLoading && total === 0 && <tr><td colSpan={2} className="text-center py-6 text-ink-500">Yozuvlar yo'q</td></tr>}
            {rows.map(r => (
              <tr key={r.id}>
                <td>{formatDate(r.date)}</td>
                <td>
                  <span className={
                    r.status === 'present' ? 'badge-success'
                      : r.status === 'late' ? 'badge-warning'
                        : 'badge-danger'
                  }>{r.status_display}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={data?.count || 0} onChange={setPage} className="mt-3" />
      </div>
    </div>
  )
}

// ==================================================
// Vazifalar
// ==================================================
function HomeworkTab({ groupId }) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['my-hw-group', groupId, page],
    queryFn: () => api.get('/homework/', { params: { group: groupId, page } }).then(r => r.data),
    keepPreviousData: true,
  })

  const items = data?.results || []

  return (
    <div className="card">
      {isLoading && <div className="text-center py-6 text-ink-500">Yuklanmoqda...</div>}
      {!isLoading && items.length === 0 && <div className="text-center py-8 text-ink-500">Vazifalar yo'q</div>}
      <div className="space-y-3">
        {items.map(h => (
          <div key={h.id} className="p-4 border border-ink-100 rounded-xl">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink-900">{h.title}</div>
                {h.description && <div className="text-sm text-ink-700 mt-1 whitespace-pre-line">{h.description}</div>}
              </div>
              {h.due_date && (
                <div className="text-xs text-ink-500 whitespace-nowrap">
                  Muddat: <b className="text-ink-700">{formatDate(h.due_date)}</b>
                </div>
              )}
            </div>
            {h.attachment && (
              <a
                href={h.attachment}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-sm text-brand-600 hover:underline"
              >
                <Paperclip className="w-4 h-4" /> Faylni yuklab olish
              </a>
            )}
          </div>
        ))}
      </div>
      <Pagination page={page} total={data?.count || 0} onChange={setPage} className="mt-4" />
    </div>
  )
}

// ==================================================
// Baholar
// ==================================================
function GradesTab({ groupId }) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['my-grades-group', groupId, page],
    queryFn: () => api.get('/grades/', { params: { group: groupId, page } }).then(r => r.data),
    keepPreviousData: true,
  })

  const rows = data?.results || []
  const avg = rows.length ? (rows.reduce((s, r) => s + r.value, 0) / rows.length).toFixed(2) : '—'

  return (
    <div className="space-y-4">
      <div className="card flex items-center justify-between">
        <div>
          <div className="text-sm text-ink-500">Sahifadagi o'rtacha baho</div>
          <div className="font-display text-3xl font-bold text-brand-600 mt-1">{avg}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-ink-500">Jami</div>
          <div className="font-display text-3xl font-bold text-ink-900 mt-1">{data?.count || 0}</div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-display font-semibold text-lg mb-3">Baholar</h3>
        <table className="table-clean">
          <thead><tr><th>Sana</th><th>Tur</th><th>Sarlavha</th><th>Baho</th><th>Izoh</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="text-center py-6 text-ink-500">Yuklanmoqda...</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-ink-500">Baholar yo'q</td></tr>}
            {rows.map(r => (
              <tr key={r.id}>
                <td>{formatDate(r.date)}</td>
                <td>{r.type_display}</td>
                <td>{r.title || '—'}</td>
                <td>
                  <span className="font-display text-xl font-bold text-brand-600">{r.value}</span>
                  <span className="text-ink-300 text-xs">/10</span>
                </td>
                <td className="text-ink-500">{r.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={data?.count || 0} onChange={setPage} className="mt-3" />
      </div>
    </div>
  )
}

// ==================================================
// Reyting
// ==================================================
function LeaderboardTab({ groupId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['my-leaderboard-group', groupId],
    queryFn: () => api.get('/grades/leaderboard/', { params: { group: groupId } }).then(r => r.data),
  })

  const rows = Array.isArray(data) ? data : (data?.results || [])

  function rankBadge(rank) {
    if (rank === 1) return <Crown className="w-4 h-4 text-amber-500" />
    if (rank === 2) return <Medal className="w-4 h-4 text-ink-400" />
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-700" />
    return <span className="text-ink-500 font-mono text-xs">#{rank}</span>
  }

  return (
    <div className="card">
      <h3 className="font-display font-semibold text-lg mb-3">Guruh reytingi</h3>
      <table className="table-clean">
        <thead>
          <tr>
            <th className="w-14">O'rin</th>
            <th>O'quvchi</th>
            <th className="text-right">O'rtacha</th>
            <th className="text-right">Baholar soni</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <tr><td colSpan={4} className="text-center py-6 text-ink-500">Yuklanmoqda...</td></tr>}
          {!isLoading && rows.length === 0 && (
            <tr><td colSpan={4} className="text-center py-6 text-ink-500">Hali baholar qo'yilmagan</td></tr>
          )}
          {rows.map(r => (
            <tr key={r.student_id} className={r.rank === 1 ? 'bg-amber-50/60' : ''}>
              <td><div className="flex items-center gap-1.5">{rankBadge(r.rank)}</div></td>
              <td className="font-medium">{r.full_name}</td>
              <td className="text-right">
                <span className="font-display text-lg font-bold text-brand-600">{r.avg_score}</span>
                <span className="text-ink-300 text-xs">/10</span>
              </td>
              <td className="text-right text-ink-500">{r.grade_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ==================================================
// To'lovlar
// ==================================================
function PaymentsTab({ groupId }) {
  const [page, setPage] = useState(1)
  const [receipt, setReceipt] = useState(null)
  const [lookupCode, setLookupCode] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['my-payments-group', groupId, page],
    queryFn: () => api.get('/payments/', { params: { group: groupId, page } }).then(r => r.data),
    keepPreviousData: true,
  })

  const rows = data?.results || []
  const totalPaid = rows.reduce((s, p) => s + Number(p.amount || 0), 0)

  function showReceipt(p) {
    setReceipt({
      receipt_code: p.receipt_code,
      student_name: p.student_name,
      amount: p.amount,
      method: p.method,
      method_display: p.method_display,
      paid_at: p.paid_at,
      year: p.charge_year,
      month: p.charge_month,
      group_name: p.group_name,
      received_by_name: p.received_by_name,
      note: p.note,
      center_name: p.center_name,
    })
  }

  async function lookupReceipt(e) {
    e.preventDefault()
    const code = lookupCode.trim().toUpperCase()
    if (!code) return
    setLookupLoading(true)
    try {
      const { data } = await api.get(`/payments/lookup/${encodeURIComponent(code)}/`)
      setReceipt(data)
      setLookupCode('')
    } catch (err) {
      toast.error(err.response?.status === 404 ? 'Bunday kodli chek topilmadi' : 'Xatolik')
    } finally {
      setLookupLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card flex items-center justify-between">
        <div>
          <div className="text-sm text-ink-500">Bu guruhga jami to'lovlar</div>
          <div className="font-display text-2xl font-bold text-emerald-600 mt-1">{formatMoney(totalPaid)}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-ink-500">Jami to'lovlar soni</div>
          <div className="font-display text-2xl font-bold text-ink-900 mt-1">{data?.count || 0}</div>
        </div>
      </div>

      {/* Chek tekshirish */}
      <div className="card">
        <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-brand-600" /> Chekni tekshirish
        </h3>
        <form onSubmit={lookupReceipt} className="flex flex-wrap gap-2 items-stretch">
          <div className="flex-1 min-w-[200px]">
            <input
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
              placeholder="ABC23456"
              maxLength={12}
              className="input font-mono tracking-wider uppercase"
            />
          </div>
          <button type="submit" disabled={!lookupCode.trim() || lookupLoading} className="btn-primary">
            {lookupLoading ? 'Qidirilmoqda...' : 'Tekshirish'}
          </button>
        </form>
        <p className="text-[11px] text-ink-500 mt-2">
          Chek kodini kiritib, har qanday to'lovni tekshirishingiz mumkin.
        </p>
      </div>

      <div className="card">
        <h3 className="font-display font-semibold text-lg mb-3">To'lovlar tarixi</h3>
        <table className="table-clean">
          <thead>
            <tr>
              <th>Sana</th>
              <th>Chek</th>
              <th>Oy</th>
              <th>Summa</th>
              <th>Usul</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="text-center py-6 text-ink-500">Yuklanmoqda...</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-ink-500">To'lovlar yo'q</td></tr>}
            {rows.map(p => (
              <tr key={p.id}>
                <td className="text-xs text-ink-700 whitespace-nowrap">{formatDateTime(p.paid_at)}</td>
                <td className="font-mono text-xs text-brand-700">{p.receipt_code}</td>
                <td className="text-ink-500 text-sm">
                  {p.charge_month ? `${MONTHS_UZ[(p.charge_month - 1) % 12]} ${p.charge_year}` : '—'}
                </td>
                <td className="font-semibold text-emerald-600">{formatMoney(p.amount)}</td>
                <td><span className="badge-muted">{p.method_display}</span></td>
                <td className="text-right">
                  <button
                    onClick={() => showReceipt(p)}
                    className="text-brand-600 hover:underline text-sm inline-flex items-center gap-1"
                    title="Chekni ko'rish"
                  >
                    <ReceiptIcon className="w-4 h-4" /> Chek
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={data?.count || 0} onChange={setPage} className="mt-3" />
      </div>

      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="To'lov cheki">
        {receipt && <PaymentReceipt data={receipt} />}
      </Modal>
    </div>
  )
}
