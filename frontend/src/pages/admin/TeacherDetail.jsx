import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CircleDollarSign, CheckCircle2, Key, Save, Award } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import Modal from '../../components/Modal'
import PhoneInput from '../../components/PhoneInput'
import { formatMoney, formatDate, MONTHS_UZ } from '../../utils/format'

function fmtErr(data) {
  if (!data) return 'Xatolik'
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  return Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' • ') || 'Xatolik'
}

export default function AdminTeacherDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data: teacher } = useQuery({ queryKey: ['teacher', id], queryFn: () => api.get(`/teachers/${id}/`).then(r => r.data) })
  const { data: salary } = useQuery({
    queryKey: ['salary', id, year, month],
    queryFn: () => api.get(`/salary/current/`, { params: { teacher: id, year, month } }).then(r => r.data),
  })
  const { data: records } = useQuery({
    queryKey: ['salary-records', id],
    queryFn: () => api.get(`/salary/records/`, { params: { teacher: id } }).then(r => r.data),
  })
  const { data: advances } = useQuery({
    queryKey: ['advances', id, year, month],
    queryFn: () => api.get(`/salary/advances/`, { params: { teacher: id, year, month } }).then(r => r.data),
  })
  const { data: referrals } = useQuery({
    queryKey: ['teacher-referrals', id],
    queryFn: () => api.get('/students/', { params: { referrer_teacher: id } }).then(r => r.data),
  })

  const giveAdv = useMutation({
    mutationFn: (body) => api.post('/salary/advances/', body).then(r => r.data),
    onSuccess: () => { toast.success('Pul berildi'); qc.invalidateQueries(); setModal(null) },
    onError: (e) => toast.error(fmtErr(e.response?.data)),
  })
  const finalizeMut = useMutation({
    mutationFn: () => api.post('/salary/finalize/', { teacher: id, year, month }),
    onSuccess: () => { toast.success('Oy yakunlandi'); qc.invalidateQueries() },
    onError: (e) => toast.error(fmtErr(e.response?.data)),
  })
  const saveMut = useMutation({
    mutationFn: (body) => api.patch(`/teachers/${id}/`, body),
    onSuccess: () => { toast.success('Saqlandi'); qc.invalidateQueries({ queryKey: ['teacher', id] }); setModal(null) },
    onError: (e) => toast.error(fmtErr(e.response?.data)),
  })
  const pwdMut = useMutation({
    mutationFn: (body) => api.post(`/teachers/${id}/reset_password/`, body),
    onSuccess: () => { toast.success("Parol yangilandi, SMS yuborildi"); setModal(null) },
    onError: (e) => toast.error(fmtErr(e.response?.data)),
  })

  if (!teacher) return <div>Yuklanmoqda...</div>

  return (
    <div>
      <Link to="/admin/teachers" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600 mb-4">
        <ArrowLeft className="w-4 h-4" /> O'qituvchilar
      </Link>

      <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white font-display text-2xl font-bold">
            {teacher.first_name[0]}{teacher.last_name[0]}
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">{teacher.full_name}</h1>
            <div className="text-ink-500 mt-1">{teacher.phone} · {teacher.percent}% · {teacher.groups_count} guruh</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal('edit')} className="btn-outline"><Save className="w-4 h-4" /> Tahrirlash</button>
          <button onClick={() => setModal('password')} className="btn-outline"><Key className="w-4 h-4" /> Parol</button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <select value={year} onChange={(e) => setYear(+e.target.value)} className="input max-w-[120px]">
          {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(y => <option key={y}>{y}</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(+e.target.value)} className="input max-w-[160px]">
          {MONTHS_UZ.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mb-6">
        <div className="card">
          <div className="text-sm text-ink-500">Hisoblangan</div>
          <div className="font-display text-2xl font-bold mt-2">{formatMoney(salary?.calculated_amount)}</div>
        </div>
        <div className="card">
          <div className="text-sm text-ink-500">Berilgan pul</div>
          <div className="font-display text-2xl font-bold mt-2 text-amber-600">{formatMoney(salary?.advances_total)}</div>
        </div>
        <div className="card bg-gradient-to-br from-brand-600 to-brand-800 text-white border-0">
          <div className="text-sm opacity-80">To'lanadigan</div>
          <div className="font-display text-2xl font-bold mt-2">{formatMoney(salary?.payable)}</div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setModal('advance')} className="btn-outline"><CircleDollarSign className="w-4 h-4" /> Pul berish</button>
        <button onClick={() => finalizeMut.mutate()} className="btn-primary"><CheckCircle2 className="w-4 h-4" /> Oyni yakunla</button>
      </div>

      <div className="card mb-6">
        <h3 className="font-display font-semibold text-lg mb-4">Guruhlar bo'yicha hisob</h3>
        <table className="table-clean">
          <thead><tr><th>Guruh</th><th>Narx</th><th>Faol o'quvchi</th><th>Daromad</th><th>Foiz</th><th>Maosh</th></tr></thead>
          <tbody>
            {salary?.breakdown?.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-ink-500">Guruh yo'q</td></tr>}
            {salary?.breakdown?.map((b) => (
              <tr key={b.group_id}>
                <td className="font-medium">{b.group_name}</td>
                <td>{formatMoney(b.monthly_fee)}</td>
                <td>{b.active_students}</td>
                <td>{formatMoney(b.income)}</td>
                <td>{b.percent}%</td>
                <td className="font-semibold text-brand-600">{formatMoney(b.salary)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="font-display font-semibold text-lg mb-4">Bu oy berilgan pullar</h3>
          <table className="table-clean">
            <thead><tr><th>Sana</th><th>Summa</th><th>Izoh</th></tr></thead>
            <tbody>
              {advances?.results?.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-ink-500">Pul berilmagan</td></tr>}
              {advances?.results?.map(a => (
                <tr key={a.id}>
                  <td>{new Date(a.given_at).toLocaleDateString('uz-UZ')}</td>
                  <td className="font-medium">{formatMoney(a.amount)}</td>
                  <td className="text-ink-500">{a.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3 className="font-display font-semibold text-lg mb-4">Yakunlangan oylar</h3>
          <table className="table-clean">
            <thead><tr><th>Oy</th><th>Hisoblangan</th><th>To'langan</th></tr></thead>
            <tbody>
              {records?.results?.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-ink-500">Yakunlar yo'q</td></tr>}
              {records?.results?.map(r => (
                <tr key={r.id}>
                  <td>{MONTHS_UZ[r.month - 1]} {r.year}</td>
                  <td>{formatMoney(r.calculated_amount)}</td>
                  <td className="font-semibold text-emerald-600">{formatMoney(r.paid_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-brand-600" /> Referrallar
          <span className="text-sm text-ink-500 font-normal">({referrals?.results?.length || 0})</span>
        </h3>
        {referrals?.results?.length > 0 ? (
          <table className="table-clean">
            <thead><tr><th>Ism</th><th>Telefon</th><th>Holat</th><th>Qo'shilgan</th></tr></thead>
            <tbody>
              {referrals.results.map(r => (
                <tr key={r.id}>
                  <td className="font-medium">
                    <Link to={`/admin/students/${r.id}`} className="hover:text-brand-600">{r.full_name}</Link>
                  </td>
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
        ) : (
          <div className="text-center py-6 text-ink-500 text-sm">Hozircha referrallar yo'q</div>
        )}
      </div>

      <Modal open={modal === 'advance'} onClose={() => setModal(null)} title="Pul berish">
        <AdvanceForm
          limit={salary?.payable || 0}
          onSubmit={(b) => giveAdv.mutate({ teacher: id, year, month, ...b })}
          loading={giveAdv.isPending}
        />
      </Modal>

      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="O'qituvchini tahrirlash" size="lg">
        <EditTeacherForm teacher={teacher} onSubmit={(b) => saveMut.mutate(b)} loading={saveMut.isPending} />
      </Modal>

      <Modal open={modal === 'password'} onClose={() => setModal(null)} title="Yangi parol">
        <PasswordForm onSubmit={(b) => pwdMut.mutate(b)} loading={pwdMut.isPending} />
      </Modal>
    </div>
  )
}

function AdvanceForm({ limit, onSubmit, loading }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ amount, note }) }} className="space-y-4">
      <div className="bg-brand-50 p-3 rounded-xl text-sm">Qoldiq limit: <b>{formatMoney(limit)}</b></div>
      <div><label className="label">Summa</label><input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
      <div><label className="label">Izoh</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <button disabled={loading} className="btn-primary w-full">{loading ? 'Saqlanmoqda...' : 'Berish'}</button>
    </form>
  )
}

function EditTeacherForm({ teacher, onSubmit, loading }) {
  const [f, setF] = useState({
    first_name: teacher.first_name || '',
    last_name: teacher.last_name || '',
    phone: teacher.phone || '',
    birth_date: teacher.birth_date || '',
    address: teacher.address || '',
    percent: teacher.percent || 30,
    is_active: teacher.is_active,
  })
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...f, birth_date: f.birth_date || null }) }} className="grid sm:grid-cols-2 gap-3">
      <div><label className="label">Ism</label><input className="input" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} required /></div>
      <div><label className="label">Familiya</label><input className="input" value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} required /></div>
      <div><label className="label">Telefon</label><PhoneInput value={f.phone} onChange={(v) => setF({ ...f, phone: v })} required /></div>
      <div><label className="label">Tug'ilgan sana</label><input type="date" className="input" value={f.birth_date || ''} onChange={(e) => setF({ ...f, birth_date: e.target.value })} /></div>
      <div className="sm:col-span-2"><label className="label">Manzil</label><input className="input" value={f.address || ''} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
      <div><label className="label">Foiz (%)</label><input type="number" min="0" max="100" step="0.01" className="input" value={f.percent} onChange={(e) => setF({ ...f, percent: e.target.value })} required /></div>
      <label className="flex items-center gap-2 mt-6">
        <input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} />
        <span className="text-sm">Faol o'qituvchi</span>
      </label>
      <div className="sm:col-span-2"><button disabled={loading} className="btn-primary w-full">{loading ? 'Saqlanmoqda...' : 'Saqlash'}</button></div>
    </form>
  )
}

function PasswordForm({ onSubmit, loading }) {
  const [v, setV] = useState('')
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ new_password: v }) }} className="space-y-4">
      <div><label className="label">Yangi parol</label><input className="input" value={v} onChange={(e) => setV(e.target.value)} minLength={4} required /></div>
      <button disabled={loading} className="btn-primary w-full">Saqlash va SMS yuborish</button>
    </form>
  )
}
