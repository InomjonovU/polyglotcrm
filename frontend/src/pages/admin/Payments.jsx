import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Send, Wallet, TrendingUp, AlertCircle, X, Check, Receipt as ReceiptIcon, ScanLine } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import Combobox from '../../components/Combobox'
import StatCard from '../../components/StatCard'
import PaymentReceipt from '../../components/PaymentReceipt'
import Pagination from '../../components/Pagination'
import { formatMoney, formatDateTime, MONTHS_UZ } from '../../utils/format'

function fmtErr(data) {
  if (!data) return 'Xatolik'
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  const parts = []
  for (const [k, v] of Object.entries(data)) {
    parts.push(`${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
  }
  return parts.join(' • ') || 'Xatolik'
}

export default function AdminPayments() {
  const qc = useQueryClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [modal, setModal] = useState(null)

  // Filters for payments list
  const [q, setQ] = useState('')
  const [methodF, setMethodF] = useState('')
  const [studentF, setStudentF] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [q, methodF, studentF, dateFrom, dateTo])

  // Receipt
  const [receipt, setReceipt] = useState(null)
  const [lookupCode, setLookupCode] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)

  async function lookupReceipt(e) {
    e.preventDefault()
    const code = lookupCode.trim().toUpperCase()
    if (!code) return
    setLookupLoading(true)
    try {
      const { data } = await api.get(`/payments/lookup/${encodeURIComponent(code)}/`)
      setReceipt(data)
    } catch (err) {
      toast.error(err.response?.status === 404 ? 'Bunday kodli chek topilmadi' : 'Xatolik')
    } finally {
      setLookupLoading(false)
    }
  }

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

  const { data: summary } = useQuery({
    queryKey: ['pay-summary', year, month],
    queryFn: () => api.get('/payments/charges/summary/', { params: { year, month } }).then(r => r.data),
  })
  const { data: debtors } = useQuery({
    queryKey: ['debtors', year, month],
    queryFn: () => api.get('/payments/charges/debtors/', { params: { year, month } }).then(r => r.data),
  })
  const PAGE_SIZE = 20
  const { data: payments } = useQuery({
    queryKey: ['payments-list', methodF, studentF, q, dateFrom, dateTo, page],
    queryFn: () => api.get('/payments/', {
      params: {
        method: methodF || undefined,
        student: studentF || undefined,
        search: q || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        page_size: PAGE_SIZE,
      }
    }).then(r => r.data),
    keepPreviousData: true,
  })

  const { data: students } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => api.get('/students/', { params: { status: 'active' } }).then(r => r.data),
  })

  const payMut = useMutation({
    mutationFn: (body) => api.post('/payments/', body).then(r => r.data),
    onSuccess: (p) => {
      toast.success("To'lov qabul qilindi, SMS yuborildi")
      qc.invalidateQueries({ queryKey: ['payments-list'] })
      qc.invalidateQueries({ queryKey: ['pay-summary'] })
      qc.invalidateQueries({ queryKey: ['debtors'] })
      setModal(null)
      // To'lov qabul qilingach — chekni darhol ko'rsatish
      showReceipt(p)
    },
    onError: (e) => toast.error(fmtErr(e.response?.data)),
  })
  const bulkSms = useMutation({
    mutationFn: (body) => api.post('/sms/bulk-send/', body),
    onSuccess: (r) => toast.success(`${r.data.queued} ta SMS yuborildi`),
  })

  const paymentRows = payments?.results || []
  const balance = (summary?.balance) || 0

  // "Qarzdorlar" widget uchun client-side pagination
  const WIDGET_PAGE_SIZE = 10
  const [debtorsPage, setDebtorsPage] = useState(1)
  const debtorsTotal = debtors?.length || 0
  const debtorsSlice = useMemo(
    () => (debtors || []).slice((debtorsPage - 1) * WIDGET_PAGE_SIZE, debtorsPage * WIDGET_PAGE_SIZE),
    [debtors, debtorsPage]
  )
  // Qarzdorlar oy/yil o'zgarganda 1-sahifaga qaytadi
  useEffect(() => { setDebtorsPage(1) }, [year, month])

  return (
    <div>
      <PageHeader
        title="To'lovlar"
        actions={<button onClick={() => setModal('new')} className="btn-primary"><Plus className="w-4 h-4" /> To'lov qabul</button>}
      />

      <div className="flex items-center gap-3 mb-6">
        <select value={year} onChange={(e) => setYear(+e.target.value)} className="input max-w-[120px]">
          {[now.getFullYear(), now.getFullYear() - 1].map(y => <option key={y}>{y}</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(+e.target.value)} className="input max-w-[160px]">
          {MONTHS_UZ.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mb-6">
        <StatCard icon={Wallet} label="Hisoblangan" value={formatMoney(summary?.total_charged)} tone="brand" />
        <StatCard icon={TrendingUp} label="Kelib tushgan" value={formatMoney(summary?.total_paid)} tone="emerald" />
        <StatCard icon={AlertCircle} label="Qarzdorlik" value={formatMoney(balance)} tone="rose" />
      </div>

      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display font-semibold text-lg">Qarzdorlar ({debtors?.length || 0})</h3>
          {debtors?.length > 0 && (
            <button
              onClick={() => bulkSms.mutate({
                phones: debtors.map(d => d.student_phone).filter(Boolean),
                message: `Assalomu alaykum! Sizning to'lovingiz hali amalga oshmagan. Iltimos, administrator bilan bog'laning.`
              })}
              className="btn-ghost text-brand-600 text-sm"
            >
              <Send className="w-4 h-4" /> Massa SMS
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead><tr><th>Ism</th><th>Guruh</th><th>Qarz</th></tr></thead>
            <tbody>
              {debtorsTotal === 0 && <tr><td colSpan={3} className="text-center py-6 text-ink-500">Qarzdorlar yo'q</td></tr>}
              {debtorsSlice.map(d => (
                <tr key={d.id}>
                  <td><div className="font-medium">{d.student_name}</div><div className="text-xs text-ink-500">{d.student_phone}</div></td>
                  <td className="text-xs text-ink-500">{d.group_name || '—'}</td>
                  <td className="font-semibold text-rose-600 whitespace-nowrap">{formatMoney(d.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={debtorsPage}
          pageSize={WIDGET_PAGE_SIZE}
          total={debtorsTotal}
          onChange={setDebtorsPage}
          className="mt-3"
        />
      </div>

      {/* Chek tekshirish */}
      <div className="card mb-5">
        <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-brand-600" /> Chekni tekshirish
        </h3>
        <form onSubmit={lookupReceipt} className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[220px]">
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
      </div>

      {/* Barcha to'lovlar + filterlar */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-display font-semibold text-lg">Barcha to'lovlar tarixi</h3>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input className="input pl-9" placeholder="Ism bo'yicha qidirish..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Combobox value={methodF} onChange={setMethodF} placeholder="Barcha turlar" searchable={false}
            options={[
              { value: 'cash', label: 'Naqd' },
              { value: 'card', label: 'Plastik' },
              { value: 'transfer', label: "Bank o'tkazma" },
            ]} />
          <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead><tr><th>Sana</th><th>O'quvchi</th><th>Summa</th><th>Usul</th><th>Chek</th><th>Izoh</th><th></th></tr></thead>
            <tbody>
              {paymentRows.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-ink-500">To'lovlar topilmadi</td></tr>}
              {paymentRows.map(p => (
                <tr key={p.id}>
                  <td className="text-xs text-ink-500 whitespace-nowrap">{formatDateTime(p.paid_at)}</td>
                  <td className="font-medium">{p.student_name}</td>
                  <td className="font-semibold text-emerald-600">{formatMoney(p.amount)}</td>
                  <td><span className="badge-muted">{p.method_display}</span></td>
                  <td className="font-mono text-xs text-brand-700">{p.receipt_code}</td>
                  <td className="text-sm text-ink-500">{p.note || '—'}</td>
                  <td className="text-right">
                    <button onClick={() => showReceipt(p)} className="text-brand-600 hover:underline text-sm inline-flex items-center gap-1">
                      <ReceiptIcon className="w-4 h-4" /> Chek
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={payments?.count || 0}
          onChange={setPage}
        />
      </div>

      <Modal open={modal === 'new'} onClose={() => setModal(null)} title="To'lov qabul qilish" size="lg">
        <PaymentForm students={students?.results || []} onSubmit={(b) => payMut.mutate(b)} loading={payMut.isPending} />
      </Modal>

      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="To'lov cheki">
        {receipt && <PaymentReceipt data={receipt} />}
      </Modal>
    </div>
  )
}

function PaymentForm({ students, onSubmit, loading }) {
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [groupId, setGroupId] = useState('')

  const filtered = useMemo(() => {
    if (!search) return students.slice(0, 50)
    const t = search.toLowerCase()
    return students.filter(s => s.full_name.toLowerCase().includes(t) || s.phone?.includes(search)).slice(0, 50)
  }, [students, search])

  // O'quvchi tanlanganda — agar 1 ta guruhi bo'lsa, uni avtomatik tanlash
  useEffect(() => {
    if (!selected) { setGroupId(''); return }
    const gs = selected.groups_detail || []
    if (gs.length === 1) setGroupId(gs[0].id)
    else setGroupId('')
  }, [selected])

  const studentGroups = selected?.groups_detail || []

  function submit(e) {
    e.preventDefault()
    if (!selected) return toast.error("O'quvchini tanlang")
    if (!amount) return toast.error("Summani kiriting")
    if (studentGroups.length > 1 && !groupId) {
      return toast.error("Qaysi guruh uchun to'lov ekanligini tanlang")
    }
    onSubmit({
      student: selected.id,
      amount,
      method,
      note,
      group: groupId || null,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">O'quvchi *</label>
        {selected ? (
          <div className="flex items-center justify-between gap-2 p-3 bg-brand-50 border border-brand-200 rounded-xl">
            <div className="min-w-0">
              <div className="font-medium">{selected.full_name}</div>
              <div className="text-xs text-ink-500">{selected.phone}</div>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="p-1 hover:bg-white rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input autoFocus className="input pl-9" placeholder="Ism yoki telefon bo'yicha qidiring..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="max-h-56 overflow-y-auto border border-ink-100 rounded-xl divide-y divide-ink-100">
              {filtered.length === 0 && <div className="p-6 text-center text-ink-500 text-sm">O'quvchi topilmadi</div>}
              {filtered.map(s => (
                <button type="button" key={s.id} onClick={() => setSelected(s)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-brand-50 text-left transition">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{s.full_name}</div>
                    <div className="text-xs text-ink-500">{s.phone}</div>
                  </div>
                  <Check className="w-4 h-4 text-ink-300" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Guruh tanlovi — faqat o'quvchi 1 dan ortiq guruhga yozilgan bo'lsa ko'rinadi */}
      {selected && studentGroups.length > 1 && (
        <div>
          <label className="label">Qaysi guruh uchun? *</label>
          <div className="grid sm:grid-cols-2 gap-2">
            {studentGroups.map(g => {
              const active = String(groupId) === String(g.id)
              return (
                <button
                  type="button"
                  key={g.id}
                  onClick={() => setGroupId(g.id)}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition ${
                    active
                      ? 'bg-brand-50 border-brand-500 text-brand-800 ring-2 ring-brand-100'
                      : 'bg-white border-ink-200 text-ink-700 hover:border-brand-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{g.name}</span>
                    {active && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {selected && studentGroups.length === 1 && (
        <div className="text-xs text-ink-500 -mt-2">
          Guruh: <b className="text-ink-700">{studentGroups[0].name}</b>
        </div>
      )}
      {selected && studentGroups.length === 0 && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg -mt-2">
          Bu o'quvchi hech qanday guruhga yozilmagan — to'lov umumiy hisobga o'tadi.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Summa *</label>
          <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} required min="1" />
        </div>
        <div>
          <label className="label">To'lov turi</label>
          <Combobox value={method} onChange={setMethod} searchable={false} clearable={false}
            options={[
              { value: 'cash', label: 'Naqd' },
              { value: 'card', label: 'Plastik' },
              { value: 'transfer', label: "Bank o'tkazma" },
            ]} />
        </div>
      </div>
      <div>
        <label className="label">Izoh</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button type="submit" disabled={loading || !selected} className="btn-primary w-full">
        {loading ? 'Saqlanmoqda...' : "Qabul qilish"}
      </button>
    </form>
  )
}
