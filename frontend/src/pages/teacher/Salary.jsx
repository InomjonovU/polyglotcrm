import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import { formatMoney, MONTHS_UZ, formatDateTime } from '../../utils/format'

export default function TeacherSalary() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [modal, setModal] = useState(false)
  const qc = useQueryClient()

  const { data: salary } = useQuery({
    queryKey: ['my-salary', year, month],
    queryFn: () => api.get('/salary/current/', { params: { year, month } }).then(r => r.data),
  })
  const { data: records } = useQuery({
    queryKey: ['my-records'],
    queryFn: () => api.get('/salary/records/').then(r => r.data),
  })
  const { data: requests } = useQuery({
    queryKey: ['my-requests'],
    queryFn: () => api.get('/salary/requests/').then(r => r.data),
  })

  const reqMut = useMutation({
    mutationFn: (b) => api.post('/salary/requests/', b),
    onSuccess: () => { toast.success("So'rov yuborildi"); qc.invalidateQueries(['my-requests']); setModal(false) },
    onError: (e) => toast.error(JSON.stringify(e.response?.data)),
  })

  return (
    <div>
      <PageHeader
        title="Maoshim"
        actions={<button onClick={() => setModal(true)} className="btn-primary"><Send className="w-4 h-4" /> Pul so'rash</button>}
      />

      <div className="flex gap-3 mb-6">
        <select value={year} onChange={(e) => setYear(+e.target.value)} className="input max-w-[120px]">
          {[now.getFullYear(), now.getFullYear() - 1].map(y => <option key={y}>{y}</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(+e.target.value)} className="input max-w-[160px]">
          {MONTHS_UZ.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mb-6">
        <div className="card"><div className="text-sm text-ink-500">Hisoblangan</div><div className="font-display text-2xl font-bold mt-2">{formatMoney(salary?.calculated_amount)}</div></div>
        <div className="card"><div className="text-sm text-ink-500">Berilgan pul</div><div className="font-display text-2xl font-bold mt-2 text-amber-600">{formatMoney(salary?.advances_total)}</div></div>
        <div className="card bg-gradient-to-br from-brand-600 to-brand-800 text-white border-0"><div className="text-sm opacity-80">Qoldiq</div><div className="font-display text-2xl font-bold mt-2">{formatMoney(salary?.payable)}</div></div>
      </div>

      <div className="card mb-5">
        <h3 className="font-display font-semibold text-lg mb-4">Guruhlar bo'yicha hisob</h3>
        <table className="table-clean">
          <thead><tr><th>Guruh</th><th>O'quvchi</th><th>Narx</th><th>Foiz</th><th>Maosh</th></tr></thead>
          <tbody>
            {salary?.breakdown?.map(b => (
              <tr key={b.group_id}>
                <td className="font-medium">{b.group_name}</td>
                <td>{b.active_students}</td>
                <td>{formatMoney(b.monthly_fee)}</td>
                <td>{b.percent}%</td>
                <td className="font-semibold text-brand-600">{formatMoney(b.salary)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="font-display font-semibold text-lg mb-4">O'tgan oylar</h3>
          <table className="table-clean">
            <thead><tr><th>Oy</th><th>To'langan</th></tr></thead>
            <tbody>
              {records?.results?.map(r => (
                <tr key={r.id}><td>{MONTHS_UZ[r.month - 1]} {r.year}</td><td className="font-semibold text-emerald-600">{formatMoney(r.paid_amount)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3 className="font-display font-semibold text-lg mb-4">Pul so'rovlarim</h3>
          <table className="table-clean">
            <thead><tr><th>Sana</th><th>Summa</th><th>Holat</th></tr></thead>
            <tbody>
              {requests?.results?.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-ink-500">So'rov yo'q</td></tr>}
              {requests?.results?.map(r => (
                <tr key={r.id}>
                  <td>{formatDateTime(r.created_at)}</td>
                  <td className="font-medium">{formatMoney(r.amount)}</td>
                  <td>
                    <span className={r.status === 'approved' ? 'badge-success' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning'}>
                      {r.status === 'pending' ? 'Kutilmoqda' : r.status === 'approved' ? 'Tasdiqlangan' : 'Rad etildi'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Pul so'rash">
        <AdvanceReqForm onSubmit={(b) => reqMut.mutate(b)} />
      </Modal>
    </div>
  )
}

function AdvanceReqForm({ onSubmit }) {
  const [f, setF] = useState({ amount: '', reason: '' })
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f) }} className="space-y-4">
      <div><label className="label">Summa</label><input type="number" className="input" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required /></div>
      <div><label className="label">Sabab</label><textarea className="input" rows={3} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></div>
      <button className="btn-primary w-full">Yuborish</button>
    </form>
  )
}
