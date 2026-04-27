import { useState, useMemo, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Snowflake, ArrowLeftRight, Archive, Percent, Key, Save, Users, UserCog,
  Receipt as ReceiptIcon, BookCopy, Award,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import Modal from '../../components/Modal'
import Combobox from '../../components/Combobox'
import PhoneInput from '../../components/PhoneInput'
import PaymentReceipt from '../../components/PaymentReceipt'
import Pagination from '../../components/Pagination'
import { formatMoney, formatDate, MONTHS_UZ } from '../../utils/format'

function fmtErr(data) {
  if (!data) return 'Xatolik'
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  return Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' • ') || 'Xatolik'
}

export default function AdminStudentDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [receipt, setReceipt] = useState(null) // payment object

  const { data: student } = useQuery({
    queryKey: ['student', id],
    queryFn: () => api.get(`/students/${id}/`).then((r) => r.data),
  })
  const { data: groups } = useQuery({
    queryKey: ['groups-list'],
    queryFn: () => api.get('/groups/').then((r) => r.data),
  })
  const { data: payments } = useQuery({
    queryKey: ['payments', id],
    queryFn: () => api.get('/payments/', { params: { student: id } }).then((r) => r.data),
  })
  const { data: attendance } = useQuery({
    queryKey: ['att', id],
    queryFn: () => api.get('/attendance/', { params: { student: id, page_size: 200 } }).then((r) => r.data),
  })
  const [attStatus, setAttStatus] = useState('')
  const [attYear, setAttYear] = useState('')
  const [attMonth, setAttMonth] = useState('')
  const [attPage, setAttPage] = useState(1)
  const ATT_PAGE_SIZE = 15
  const attRows = attendance?.results || []
  const attFiltered = useMemo(() => {
    let list = attRows
    if (attStatus) list = list.filter(r => r.status === attStatus)
    if (attYear) list = list.filter(r => r.date?.startsWith(String(attYear)))
    if (attMonth) {
      const m = String(attMonth).padStart(2, '0')
      list = list.filter(r => r.date?.slice(5, 7) === m)
    }
    return list
  }, [attRows, attStatus, attYear, attMonth])
  useEffect(() => { setAttPage(1) }, [attStatus, attYear, attMonth])
  const attTotal = attFiltered.length
  const attSlice = useMemo(
    () => attFiltered.slice((attPage - 1) * ATT_PAGE_SIZE, attPage * ATT_PAGE_SIZE),
    [attFiltered, attPage]
  )
  const attYears = useMemo(() => {
    const ys = new Set(attRows.map(r => r.date?.slice(0, 4)).filter(Boolean))
    return Array.from(ys).sort().reverse()
  }, [attRows])
  const { data: referrals } = useQuery({
    queryKey: ['student-referrals', id],
    queryFn: () => api.get('/students/', { params: { referrer_student: id } })
      .then((r) => r.data),
    enabled: !!student,
  })
  const { data: sales } = useQuery({
    queryKey: ['student-sales', id],
    queryFn: () => api.get('/library/sales/', { params: { student: id } }).then((r) => r.data).catch(() => null),
  })

  function callAction(action, body) {
    return api.post(`/students/${id}/${action}/`, body).then(() => {
      toast.success("Saqlandi")
      qc.invalidateQueries({ queryKey: ['student', id] })
      setModal(null)
    }).catch((e) => toast.error(fmtErr(e.response?.data)))
  }

  const saveMut = useMutation({
    mutationFn: (body) => api.patch(`/students/${id}/`, body),
    onSuccess: () => { toast.success("Saqlandi"); qc.invalidateQueries({ queryKey: ['student', id] }); setModal(null) },
    onError: (e) => toast.error(fmtErr(e.response?.data)),
  })

  if (!student) return <div>Yuklanmoqda...</div>

  return (
    <div>
      <Link to="/admin/students" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600 mb-4">
        <ArrowLeft className="w-4 h-4" /> O'quvchilar
      </Link>

      <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white font-display text-2xl font-bold">
            {student.first_name[0]}{student.last_name[0]}
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">{student.full_name}</h1>
            <div className="text-ink-500 mt-1">+{student.phone}</div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {student.groups_detail?.length === 0 && <span className="text-xs text-ink-400">Guruhsiz</span>}
              {student.groups_detail?.map(g => (
                <Link key={g.id} to={`/admin/groups/${g.id}`} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded hover:bg-brand-100">
                  {g.name}
                </Link>
              ))}
            </div>
            {(student.referrer_name || student.referrals_count > 0) && (
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-500">
                {student.referrer_name && <span>Taklif qilgan: <b className="text-ink-700">{student.referrer_name}</b></span>}
                {student.referrals_count > 0 && <span>U tomonidan kelganlar: <b className="text-ink-700">{student.referrals_count}</b></span>}
              </div>
            )}
          </div>
        </div>
        <span className={student.status === 'active' ? 'badge-success' : student.status === 'frozen' ? 'badge-info' : 'badge-muted'}>
          {student.status_display}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button onClick={() => setModal('edit')} className="btn-outline"><Save className="w-4 h-4" /> Tahrirlash</button>
        <button onClick={() => setModal('groups')} className="btn-outline"><Users className="w-4 h-4" /> Guruhlar</button>
        <button onClick={() => setModal('freeze')} className="btn-outline"><Snowflake className="w-4 h-4" /> Muzlatish</button>
        <button onClick={() => setModal('transfer')} className="btn-outline"><ArrowLeftRight className="w-4 h-4" /> O'tkazish</button>
        <button onClick={() => setModal('discount')} className="btn-outline"><Percent className="w-4 h-4" /> Chegirma</button>
        <button onClick={() => setModal('password')} className="btn-outline"><Key className="w-4 h-4" /> Parol reset</button>
        <button onClick={() => setModal('parent')} className="btn-outline"><UserCog className="w-4 h-4" /> Ota-ona paroli</button>
        <button onClick={() => setModal('archive')} className="btn-danger"><Archive className="w-4 h-4" /> Arxivga</button>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <div className="card md:col-span-2">
          <h3 className="font-display font-semibold text-lg mb-4">To'lov tarixi</h3>
          <table className="table-clean">
            <thead><tr><th>Sana</th><th>Summa</th><th>Usul</th><th>Chek</th><th></th></tr></thead>
            <tbody>
              {payments?.results?.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-ink-500">Hali to'lov yo'q</td></tr>}
              {payments?.results?.map((p) => (
                <tr key={p.id}>
                  <td>{formatDate(p.paid_at)}</td>
                  <td className="font-medium">{formatMoney(p.amount)}</td>
                  <td>{p.method_display}</td>
                  <td className="font-mono text-xs text-brand-700">{p.receipt_code}</td>
                  <td className="text-right">
                    <button onClick={() => setReceipt(p)} className="text-brand-600 hover:underline text-xs inline-flex items-center gap-1">
                      <ReceiptIcon className="w-3.5 h-3.5" /> Ko'rish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 className="font-display font-semibold text-lg mb-4">Ma'lumot</h3>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-ink-500 text-xs">Tug'ilgan sana</dt><dd>{formatDate(student.birth_date)}</dd></div>
            <div><dt className="text-ink-500 text-xs">Manzil</dt><dd>{student.address || '—'}</dd></div>
            <div><dt className="text-ink-500 text-xs">Qo'shilgan sana</dt><dd>{formatDate(student.joined_date)}</dd></div>
            <div><dt className="text-ink-500 text-xs">Chegirma</dt><dd>{student.discount_percent}%</dd></div>
            <div>
              <dt className="text-ink-500 text-xs">Ota-ona</dt>
              <dd>
                {student.parent_phone
                  ? <span>{student.parent_name || '—'} <span className="text-ink-500">+{student.parent_phone}</span>
                      {student.parent_has_account
                        ? <span className="ml-1 badge-success text-[10px]">login bor</span>
                        : <span className="ml-1 badge-muted text-[10px]">parol yo'q</span>}
                    </span>
                  : <span className="text-ink-400">Kiritilmagan</span>}
              </dd>
            </div>
            <div><dt className="text-ink-500 text-xs">Izoh</dt><dd className="whitespace-pre-wrap">{student.notes || '—'}</dd></div>
          </dl>
        </div>
      </div>

      {/* Referrallar */}
      <div className="card mt-5">
        <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-brand-600" /> Taklif qilganlari
        </h3>
        {referrals?.results?.length > 0 ? (
          <table className="table-clean">
            <thead><tr><th>Ism</th><th>Telefon</th><th>Holat</th><th>Sana</th></tr></thead>
            <tbody>
              {referrals.results.map(r => (
                <tr key={r.id}>
                  <td className="font-medium"><Link to={`/admin/students/${r.id}`} className="hover:text-brand-600">{r.full_name}</Link></td>
                  <td className="text-ink-700">+{r.phone}</td>
                  <td><span className={r.status === 'active' ? 'badge-success' : 'badge-muted'}>{r.status_display}</span></td>
                  <td>{formatDate(r.joined_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-sm text-ink-500 py-2">U tomonidan hech kim kelmagan</div>
        )}
      </div>

      {/* Kutubxona — sotuvlar */}
      <div className="card mt-5">
        <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
          <BookCopy className="w-5 h-5 text-brand-600" /> Kutubxona — sotib olingan kitoblar
        </h3>
        {sales?.results?.length > 0 ? (
          <table className="table-clean">
            <thead><tr><th>Kitob</th><th>Narx</th><th>Sana</th><th>To'langan</th></tr></thead>
            <tbody>
              {sales.results.map(s => (
                <tr key={s.id}>
                  <td className="font-medium">{s.book_title}</td>
                  <td>{formatMoney(s.price)}</td>
                  <td>{formatDate(s.sold_at)}</td>
                  <td>{s.paid ? <span className="badge-success">To'langan</span> : <span className="badge-warning">Qarz</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-sm text-ink-500 py-2">Hech qanday kitob sotib olinmagan</div>
        )}
      </div>

      <div className="card mt-5">
        <h3 className="font-display font-semibold text-lg mb-4">Davomat tarixi</h3>
        <div className="grid sm:grid-cols-3 gap-2 mb-3">
          <Combobox
            value={attStatus} onChange={setAttStatus}
            placeholder="Barcha holatlar" searchable={false}
            options={[
              { value: 'present', label: 'Keldi' },
              { value: 'late', label: 'Kech qoldi' },
              { value: 'absent', label: 'Kelmadi' },
            ]}
          />
          <Combobox
            value={attYear} onChange={setAttYear}
            placeholder="Barcha yillar" searchable={false}
            options={attYears.map(y => ({ value: y, label: y }))}
          />
          <Combobox
            value={attMonth} onChange={setAttMonth}
            placeholder="Barcha oylar" searchable={false}
            options={MONTHS_UZ.map((m, i) => ({ value: i + 1, label: m }))}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead><tr><th>Sana</th><th>Guruh</th><th>Holat</th></tr></thead>
            <tbody>
              {attTotal === 0 && <tr><td colSpan={3} className="text-center py-6 text-ink-500">Davomat yozuvlari topilmadi</td></tr>}
              {attSlice.map((a) => (
                <tr key={a.id}>
                  <td>{formatDate(a.date)}</td>
                  <td>{a.group_name || `Guruh #${a.group}`}</td>
                  <td><span className={a.status === 'present' ? 'badge-success' : a.status === 'late' ? 'badge-warning' : 'badge-danger'}>{a.status_display}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={attPage}
          pageSize={ATT_PAGE_SIZE}
          total={attTotal}
          onChange={setAttPage}
        />
      </div>

      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="O'quvchini tahrirlash" size="lg">
        <EditStudentForm student={student} onSubmit={(b) => saveMut.mutate(b)} loading={saveMut.isPending} />
      </Modal>
      <Modal open={modal === 'groups'} onClose={() => setModal(null)} title="Guruhlarni boshqarish" size="lg">
        <ManageGroupsForm student={student} groups={groups?.results || []} onSubmit={(b) => saveMut.mutate(b)} loading={saveMut.isPending} />
      </Modal>
      <Modal open={modal === 'freeze'} onClose={() => setModal(null)} title="Muzlatish">
        <FreezeForm onSubmit={(b) => callAction('freeze', b)} />
      </Modal>
      <Modal open={modal === 'transfer'} onClose={() => setModal(null)} title="Guruh o'tkazish">
        <TransferForm groups={groups?.results || []} currentId={student.group} onSubmit={(b) => callAction('transfer', b)} />
      </Modal>
      <Modal open={modal === 'discount'} onClose={() => setModal(null)} title="Chegirma belgilash">
        <DiscountForm current={student.discount_percent} onSubmit={(b) => callAction('set_discount', b)} />
      </Modal>
      <Modal open={modal === 'archive'} onClose={() => setModal(null)} title="Arxivga o'tkazish">
        <SimpleReasonForm onSubmit={(b) => callAction('archive', b)} />
      </Modal>
      <Modal open={modal === 'password'} onClose={() => setModal(null)} title="Yangi parol">
        <PasswordForm onSubmit={(b) => callAction('reset_password', b)} />
      </Modal>
      <Modal open={modal === 'parent'} onClose={() => setModal(null)} title="Ota-ona uchun parol">
        <ParentPasswordForm student={student} onSubmit={(b) => callAction('set_parent_password', b)} />
      </Modal>

      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="To'lov cheki">
        {receipt && <PaymentReceipt data={{
          receipt_code: receipt.receipt_code,
          student_name: receipt.student_name,
          amount: receipt.amount,
          method: receipt.method,
          method_display: receipt.method_display,
          paid_at: receipt.paid_at,
          year: receipt.charge_year,
          month: receipt.charge_month,
          group_name: receipt.group_name,
          received_by_name: receipt.received_by_name,
          note: receipt.note,
        }} />}
      </Modal>
    </div>
  )
}

function EditStudentForm({ student, onSubmit, loading }) {
  const [f, setF] = useState({
    first_name: student.first_name || '',
    last_name: student.last_name || '',
    phone: student.phone || '',
    birth_date: student.birth_date || '',
    address: student.address || '',
    discount_percent: student.discount_percent || 0,
    notes: student.notes || '',
    parent_phone: student.parent_phone || '',
    parent_name: student.parent_name || '',
  })
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...f, birth_date: f.birth_date || null }) }} className="grid sm:grid-cols-2 gap-3">
      <div><label className="label">Ism</label><input className="input" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} required /></div>
      <div><label className="label">Familiya</label><input className="input" value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} required /></div>
      <div><label className="label">Telefon</label>
        <PhoneInput value={f.phone} onChange={(v) => setF({ ...f, phone: v })} required />
      </div>
      <div><label className="label">Tug'ilgan sana</label><input type="date" className="input" value={f.birth_date || ''} onChange={(e) => setF({ ...f, birth_date: e.target.value })} /></div>
      <div className="sm:col-span-2"><label className="label">Manzil</label><input className="input" value={f.address || ''} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
      <div><label className="label">Chegirma (%)</label><input type="number" min="0" max="100" step="0.01" className="input" value={f.discount_percent} onChange={(e) => setF({ ...f, discount_percent: e.target.value })} /></div>
      <div className="sm:col-span-2 border-t border-ink-100 pt-3 mt-1">
        <div className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">Ota-ona</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label">Telefon raqam</label>
            <PhoneInput value={f.parent_phone} onChange={(v) => setF({ ...f, parent_phone: v })} />
          </div>
          <div><label className="label">Ism</label><input className="input" value={f.parent_name} onChange={(e) => setF({ ...f, parent_name: e.target.value })} /></div>
        </div>
      </div>
      <div className="sm:col-span-2"><label className="label">Izoh</label><textarea rows={3} className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
      <div className="sm:col-span-2"><button disabled={loading} className="btn-primary w-full">{loading ? 'Saqlanmoqda...' : 'Saqlash'}</button></div>
    </form>
  )
}

function ManageGroupsForm({ student, groups, onSubmit, loading }) {
  const initial = (student.groups_detail || []).map(g => g.id)
  const [selected, setSelected] = useState(initial)
  const [primary, setPrimary] = useState(student.group || initial[0] || '')

  function toggle(id) {
    setSelected(sel => {
      const next = sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]
      if (!next.includes(primary)) setPrimary(next[0] || '')
      return next
    })
  }

  function submit() {
    onSubmit({ groups: selected, group: primary || null })
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-ink-600">Guruhlar ustiga bosib tanlang. Asosiy guruh to'lovlar va ko'rsatish uchun ishlatiladi.</div>
      <div className="flex flex-wrap gap-2 p-2 border border-ink-200 rounded-xl min-h-[60px]">
        {groups.length === 0 && <div className="text-sm text-ink-400 p-2">Guruhlar yo'q</div>}
        {groups.map(g => {
          const isSel = selected.includes(g.id)
          const isPrimary = primary === g.id
          return (
            <button type="button" key={g.id}
              onClick={() => toggle(g.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${isSel ? (isPrimary ? 'bg-brand-700 text-white ring-2 ring-brand-300' : 'bg-brand-600 text-white') : 'bg-ink-100 text-ink-700 hover:bg-ink-200'}`}>
              {g.name}
              {isPrimary && <span className="ml-1 text-[10px]">★</span>}
            </button>
          )
        })}
      </div>
      {selected.length > 1 && (
        <div>
          <label className="label">Asosiy guruh</label>
          <Combobox value={primary} onChange={setPrimary} searchable={false} clearable={false}
            options={groups.filter(g => selected.includes(g.id)).map(g => ({ value: g.id, label: g.name }))} />
        </div>
      )}
      <button onClick={submit} disabled={loading} className="btn-primary w-full">
        {loading ? 'Saqlanmoqda...' : 'Saqlash'}
      </button>
    </div>
  )
}

function FreezeForm({ onSubmit }) {
  const [f, setF] = useState({ start_date: '', end_date: '', reason: '' })
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Boshlanish</label><input type="date" className="input" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} required /></div>
        <div><label className="label">Tugash</label><input type="date" className="input" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} required /></div>
      </div>
      <div><label className="label">Sabab</label><textarea className="input" rows={2} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></div>
      <button className="btn-primary w-full">Muzlatish</button>
    </form>
  )
}
function TransferForm({ groups, currentId, onSubmit }) {
  const [f, setF] = useState({ new_group: '', transfer_date: new Date().toISOString().slice(0, 10) })
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f) }} className="space-y-4">
      <div><label className="label">Yangi guruh</label>
        <Combobox value={f.new_group} onChange={(v) => setF({ ...f, new_group: v })}
          options={groups.filter((g) => g.id !== currentId).map(g => ({ value: g.id, label: g.name }))}
          placeholder="Tanlang..." />
      </div>
      <div><label className="label">O'tkazish sanasi</label><input type="date" className="input" required value={f.transfer_date} onChange={(e) => setF({ ...f, transfer_date: e.target.value })} /></div>
      <button className="btn-primary w-full">O'tkazish</button>
    </form>
  )
}
function DiscountForm({ current, onSubmit }) {
  const [v, setV] = useState(current || 0)
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ discount_percent: v }) }} className="space-y-4">
      <div><label className="label">Chegirma %</label><input type="number" min={0} max={100} step={0.01} className="input" value={v} onChange={(e) => setV(e.target.value)} /></div>
      <button className="btn-primary w-full">Saqlash</button>
    </form>
  )
}
function SimpleReasonForm({ onSubmit }) {
  const [reason, setReason] = useState('')
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ reason }) }} className="space-y-4">
      <div><label className="label">Sabab</label><textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
      <button className="btn-danger w-full">Arxivga</button>
    </form>
  )
}
function PasswordForm({ onSubmit }) {
  const [v, setV] = useState('')
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ new_password: v }) }} className="space-y-4">
      <div><label className="label">Yangi parol</label><input className="input" value={v} onChange={(e) => setV(e.target.value)} minLength={4} required /></div>
      <button className="btn-primary w-full">Saqlash va SMS yuborish</button>
    </form>
  )
}
function ParentPasswordForm({ student, onSubmit }) {
  const [v, setV] = useState('')
  if (!student.parent_phone) {
    return (
      <div className="text-sm text-rose-600">
        Avval o'quvchini tahrirlab, ota-ona telefon raqamini kiriting.
      </div>
    )
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ new_password: v }) }} className="space-y-3">
      <div className="p-3 bg-brand-50 rounded-xl text-sm">
        Ota-ona <b>+{student.parent_phone}</b> raqami bilan login qiladi.
      </div>
      <div><label className="label">Parol</label><input className="input" value={v} onChange={(e) => setV(e.target.value)} minLength={4} required /></div>
      <button className="btn-primary w-full">O'rnatish va SMS yuborish</button>
    </form>
  )
}
