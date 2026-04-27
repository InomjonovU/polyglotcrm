import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Phone, MessageSquare, UserCheck, X, Search, Filter, Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import Combobox from '../../components/Combobox'
import { formatDateTime } from '../../utils/format'

const STATUSES = [
  { key: 'new',       label: 'Yangi',       color: 'bg-blue-100 text-blue-700 border-blue-200',         active: 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-200' },
  { key: 'contacted', label: "Bog'lanildi", color: 'bg-indigo-100 text-indigo-700 border-indigo-200',   active: 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-200' },
  { key: 'trial',     label: 'Sinov darsi', color: 'bg-amber-100 text-amber-700 border-amber-200',     active: 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-200' },
  { key: 'converted', label: "O'quvchi",    color: 'bg-emerald-100 text-emerald-700 border-emerald-200', active: 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-200' },
  { key: 'rejected',  label: 'Rad etildi',  color: 'bg-rose-100 text-rose-700 border-rose-200',       active: 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-200' },
  { key: 'lost',      label: "Yo'qotildi",  color: 'bg-ink-100 text-ink-600 border-ink-200',         active: 'bg-ink-700 text-white border-ink-800 ring-2 ring-ink-200' },
]

const SOURCES = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'telegram',  label: 'Telegram' },
  { value: 'website',   label: 'Veb-sayt' },
  { value: 'referral',  label: 'Tanish tavsiyasi' },
  { value: 'walk_in',   label: "Ko'chadan" },
  { value: 'call',      label: "Qo'ng'iroq" },
  { value: 'other',     label: 'Boshqa' },
]

function fmtErr(d) { if (!d) return 'Xatolik'; if (typeof d === 'string') return d; if (d.detail) return d.detail; return Object.entries(d).map(([k,v]) => `${k}: ${Array.isArray(v)?v.join(', '):v}`).join('; ') }

export default function Leads() {
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [active, setActive] = useState(null)

  const { data } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.get('/leads/').then(r => r.data),
  })
  const leads = data?.results || data || []

  const filtered = useMemo(() => leads.filter(l =>
    (!q || l.full_name.toLowerCase().includes(q.toLowerCase()) || l.phone?.includes(q)) &&
    (!statusFilter || l.status === statusFilter)
  ), [leads, q, statusFilter])

  return (
    <div>
      <PageHeader
        title="Lidlar"
        subtitle="Potensial o'quvchilar"
        actions={<button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Yangi lid</button>}
      />

      <div className="card mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Ism yoki telefon..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input max-w-[180px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Barcha holatlar</option>
          {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <div className="text-sm text-ink-500">Jami: <b>{filtered.length}</b></div>
      </div>

      <div className="card p-0">
        <table className="table-clean">
          <thead><tr><th>Ism</th><th>Telefon</th><th>Manba</th><th>Kurs</th><th>Holat</th><th>Tavsiya</th><th>Sana</th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-ink-500">Lidlar yo'q</td></tr>}
            {filtered.map(l => (
              <tr key={l.id} className="cursor-pointer hover:bg-ink-50" onClick={() => setActive(l)}>
                <td className="font-medium">{l.full_name}</td>
                <td className="text-sm">{l.phone}</td>
                <td className="text-sm"><span className="badge-muted">{l.source_display}</span></td>
                <td className="text-sm">{l.course_name || '—'}</td>
                <td><StatusBadge status={l.status} /></td>
                <td className="text-xs text-ink-600">{l.referrer_name || '—'}</td>
                <td className="text-xs text-ink-500 whitespace-nowrap">{formatDateTime(l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LeadFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {active && <LeadDetailModal lead={active} onClose={() => setActive(null)} />}
    </div>
  )
}

function StatusBadge({ status }) {
  const s = STATUSES.find(x => x.key === status) || STATUSES[0]
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium border ${s.color}`}>{s.label}</span>
}

function LeadFormModal({ open, onClose, lead }) {
  const qc = useQueryClient()
  const [f, setF] = useState(lead || {
    full_name: '', phone: '', source: 'other', status: 'new',
    interest_course: null, interest_level: null,
    referrer_student: null, referrer_teacher: null, notes: '',
  })

  const { data: courses } = useQuery({ queryKey: ['courses'], queryFn: () => api.get('/groups/courses/').then(r => r.data), enabled: open })
  const { data: levels } = useQuery({ queryKey: ['levels'], queryFn: () => api.get('/groups/levels/').then(r => r.data), enabled: open })
  const { data: students } = useQuery({ queryKey: ['students-lite'], queryFn: () => api.get('/students/', { params: { status: 'active' } }).then(r => r.data), enabled: open })
  const { data: teachers } = useQuery({ queryKey: ['teachers-lite'], queryFn: () => api.get('/teachers/').then(r => r.data), enabled: open })

  const mut = useMutation({
    mutationFn: () => lead ? api.patch(`/leads/${lead.id}/`, f) : api.post('/leads/', f),
    onSuccess: () => { toast.success('Saqlandi'); qc.invalidateQueries({ queryKey: ['leads'] }); onClose() },
    onError: (e) => toast.error(fmtErr(e.response?.data)),
  })

  return (
    <Modal open={open} onClose={onClose} title={lead ? 'Lidni tahrirlash' : 'Yangi lid'} size="lg">
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label">To'liq ism</label>
            <input className="input" value={f.full_name} onChange={(e) => setF({...f, full_name: e.target.value})} />
          </div>
          <div><label className="label">Telefon</label>
            <input className="input" value={f.phone} onChange={(e) => setF({...f, phone: e.target.value})} />
          </div>
          <div><label className="label">Manba</label>
            <Combobox value={f.source} onChange={(v) => setF({...f, source: v})} options={SOURCES} searchable={false} clearable={false} />
          </div>
          <div><label className="label">Holat</label>
            <Combobox value={f.status} onChange={(v) => setF({...f, status: v})}
              options={STATUSES.map(s => ({ value: s.key, label: s.label }))} searchable={false} clearable={false} />
          </div>
          <div><label className="label">Qiziqtirayotgan kurs</label>
            <Combobox value={f.interest_course} onChange={(v) => setF({...f, interest_course: v})}
              options={(courses?.results || courses || []).map(c => ({ value: c.id, label: c.name }))} placeholder="—" />
          </div>
          <div><label className="label">Daraja</label>
            <Combobox value={f.interest_level} onChange={(v) => setF({...f, interest_level: v})}
              options={(levels?.results || levels || []).map(l => ({ value: l.id, label: l.name }))} placeholder="—" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label">Kim tavsiya qildi (o'quvchi)</label>
            <Combobox value={f.referrer_student} onChange={(v) => setF({...f, referrer_student: v, referrer_teacher: v ? null : f.referrer_teacher})}
              options={(students?.results || []).map(s => ({ value: s.id, label: `${s.full_name} (${s.phone})` }))} placeholder="—" />
          </div>
          <div><label className="label">Yoki o'qituvchi</label>
            <Combobox value={f.referrer_teacher} onChange={(v) => setF({...f, referrer_teacher: v, referrer_student: v ? null : f.referrer_student})}
              options={(teachers?.results || []).map(t => ({ value: t.id, label: t.full_name }))} placeholder="—" />
          </div>
        </div>
        <div><label className="label">Izoh</label>
          <textarea className="input" rows={3} value={f.notes} onChange={(e) => setF({...f, notes: e.target.value})} />
        </div>
        <button onClick={() => mut.mutate()} disabled={!f.full_name || !f.phone || mut.isPending} className="btn-primary w-full">
          {mut.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </div>
    </Modal>
  )
}

function LeadDetailModal({ lead, onClose }) {
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [note, setNote] = useState('')
  // Optimistik holat — tugma bosilishi bilan darhol vizual o'zgaradi
  const [currentStatus, setCurrentStatus] = useState(lead.status)
  const [pendingStatus, setPendingStatus] = useState(null)

  // Lid yangilanganda local state ham sinxronlashadi
  useEffect(() => { setCurrentStatus(lead.status) }, [lead.status])

  const noteMut = useMutation({
    mutationFn: (text) => api.post(`/leads/${lead.id}/add_note/`, { text }),
    onSuccess: () => { toast.success("Izoh qo'shildi"); qc.invalidateQueries({ queryKey: ['leads'] }); setNote('') },
  })
  const delMut = useMutation({
    mutationFn: () => api.delete(`/leads/${lead.id}/`),
    onSuccess: () => { toast.success("O'chirildi"); qc.invalidateQueries({ queryKey: ['leads'] }); onClose() },
  })
  const statusMut = useMutation({
    mutationFn: (status) => api.patch(`/leads/${lead.id}/`, { status }),
    onMutate: (status) => {
      const prev = currentStatus
      setCurrentStatus(status)         // optimistik
      setPendingStatus(status)
      return { prev }
    },
    onSuccess: () => {
      toast.success("Holat o'zgartirildi")
      qc.invalidateQueries({ queryKey: ['leads'] })
      setPendingStatus(null)
    },
    onError: (err, _vars, ctx) => {
      // rollback
      if (ctx?.prev != null) setCurrentStatus(ctx.prev)
      setPendingStatus(null)
      toast.error("Saqlab bo'lmadi")
    },
  })

  function changeStatus(key) {
    if (key === currentStatus || pendingStatus) return
    statusMut.mutate(key)
  }

  return (
    <>
      <Modal open={!!lead && !editOpen && !convertOpen} onClose={onClose} title={lead.full_name} size="xl">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div><div className="text-xs text-ink-500">Telefon</div><div className="font-medium">{lead.phone}</div></div>
            <div><div className="text-xs text-ink-500">Manba</div><div>{lead.source_display}</div></div>
            <div><div className="text-xs text-ink-500">Qiziqish</div><div>{lead.course_name || '—'} {lead.level_name && `· ${lead.level_name}`}</div></div>
            <div><div className="text-xs text-ink-500">Tavsiya</div><div>{lead.referrer_name || '—'}</div></div>
          </div>

          <div>
            <div className="text-xs text-ink-500 mb-2 uppercase tracking-wider">Holat</div>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(s => {
                const isActive = currentStatus === s.key
                const isPending = pendingStatus === s.key
                const disabled = !!pendingStatus && !isPending
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => changeStatus(s.key)}
                    disabled={disabled}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all inline-flex items-center gap-1.5 ${
                      isActive
                        ? `${s.active} shadow-soft scale-[1.02]`
                        : 'bg-white border-ink-200 text-ink-600 hover:bg-ink-50 hover:border-ink-300'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isActive ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : null}
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a href={`tel:${lead.phone}`} className="btn-outline"><Phone className="w-4 h-4" /> Qo'ng'iroq</a>
            <button onClick={() => setEditOpen(true)} className="btn-outline">Tahrirlash</button>
            {currentStatus !== 'converted' && (
              <button onClick={() => setConvertOpen(true)} className="btn-primary"><UserCheck className="w-4 h-4" /> O'quvchiga aylantirish</button>
            )}
            <button onClick={() => { if (confirm('Lidni o\'chirish?')) delMut.mutate() }} className="btn-outline text-rose-600 border-rose-200 hover:bg-rose-50">O'chirish</button>
          </div>

          {lead.notes && (
            <div className="p-3 bg-ink-50 rounded-lg">
              <div className="text-xs text-ink-500 mb-1">Izoh</div>
              <div className="text-sm whitespace-pre-wrap">{lead.notes}</div>
            </div>
          )}

          <div>
            <h4 className="font-semibold text-sm mb-2">Harakatlar tarixi</h4>
            <div className="flex gap-2 mb-3">
              <input className="input flex-1" placeholder="Yangi izoh yozing..." value={note} onChange={(e) => setNote(e.target.value)} />
              <button disabled={!note.trim() || noteMut.isPending} onClick={() => noteMut.mutate(note)} className="btn-primary">Qo'shish</button>
            </div>
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {lead.activities?.length === 0 && <div className="text-xs text-ink-400 text-center py-4">Harakatlar yo'q</div>}
              {lead.activities?.map(a => (
                <div key={a.id} className="p-2 border border-ink-100 rounded-lg text-sm">
                  <div className="text-xs text-ink-500 mb-0.5">{formatDateTime(a.created_at)} · {a.created_by_name}</div>
                  <div>{a.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
      {editOpen && <LeadFormModal open={editOpen} onClose={() => setEditOpen(false)} lead={lead} />}
      {convertOpen && <ConvertModal lead={lead} onClose={() => setConvertOpen(false)} onDone={onClose} />}
    </>
  )
}

function ConvertModal({ lead, onClose, onDone }) {
  const qc = useQueryClient()
  const [password, setPassword] = useState('1234')
  const [groupId, setGroupId] = useState(null)
  const { data: groups } = useQuery({ queryKey: ['groups-lite'], queryFn: () => api.get('/groups/').then(r => r.data) })

  const mut = useMutation({
    mutationFn: () => api.post(`/leads/${lead.id}/convert/`, { password, group_id: groupId }),
    onSuccess: () => { toast.success("O'quvchi yaratildi"); qc.invalidateQueries(); onClose(); onDone() },
    onError: (e) => toast.error(fmtErr(e.response?.data)),
  })

  return (
    <Modal open={true} onClose={onClose} title="O'quvchiga aylantirish" size="md">
      <div className="space-y-3">
        <div className="p-3 bg-brand-50 rounded-lg text-sm">
          <div><b>{lead.full_name}</b> o'quvchi bo'lib ro'yxatga olinadi.</div>
          <div className="text-xs text-ink-500 mt-1">Telefon: {lead.phone}</div>
        </div>
        <div><label className="label">Boshlang'ich parol</label>
          <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div><label className="label">Qaysi guruhga (ixtiyoriy)</label>
          <Combobox value={groupId} onChange={setGroupId}
            options={(groups?.results || []).map(g => ({ value: g.id, label: g.name }))} placeholder="—" />
        </div>
        <button onClick={() => mut.mutate()} disabled={mut.isPending} className="btn-primary w-full">
          {mut.isPending ? 'Yaratilmoqda...' : 'Yaratish'}
        </button>
      </div>
    </Modal>
  )
}
