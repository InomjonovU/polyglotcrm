import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, Archive, CheckCircle2, Send, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import Combobox from '../../components/Combobox'
import PhoneInput from '../../components/PhoneInput'
import Pagination from '../../components/Pagination'

function fmtErr(data) {
  if (!data) return 'Xatolik'
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  const parts = []
  for (const [k, v] of Object.entries(data)) parts.push(`${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
  return parts.join(' • ') || 'Xatolik'
}

export default function AdminStudents() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [bulkModal, setBulkModal] = useState(null) // 'archive' | 'activate' | 'sms' | 'enroll'
  const [selected, setSelected] = useState([])
  const qc = useQueryClient()

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [q, status, groupFilter])

  const PAGE_SIZE = 20
  const { data, isLoading } = useQuery({
    queryKey: ['students', q, status, groupFilter, page],
    queryFn: () => api.get('/students/', {
      params: {
        search: q,
        status: status || undefined,
        group: groupFilter || undefined,
        page,
        page_size: PAGE_SIZE,
      },
    }).then((r) => r.data),
    keepPreviousData: true,
  })

  const { data: groups } = useQuery({
    queryKey: ['groups-list'],
    queryFn: () => api.get('/groups/').then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (body) => api.post('/students/', body).then((r) => r.data),
    onSuccess: () => {
      toast.success("O'quvchi qo'shildi, SMS yuborildi")
      qc.invalidateQueries({ queryKey: ['students'] })
      setModalOpen(false)
    },
    onError: (e) => toast.error(fmtErr(e.response?.data)),
  })

  const bulkMut = useMutation({
    mutationFn: (body) => api.post('/students/bulk/', body),
    onSuccess: (r) => {
      toast.success(`${r.data.count} ta o'quvchiga amal qo'llandi`)
      qc.invalidateQueries({ queryKey: ['students'] })
      setSelected([])
      setBulkModal(null)
    },
    onError: (e) => toast.error(fmtErr(e.response?.data)),
  })

  const rows = data?.results || []
  const allSelected = rows.length > 0 && rows.every(r => selected.includes(r.id))

  function toggle(id) {
    setSelected(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id])
  }
  function toggleAll() {
    if (allSelected) setSelected([])
    else setSelected(rows.map(r => r.id))
  }

  return (
    <div>
      <PageHeader
        title="O'quvchilar"
        subtitle="Barcha o'quvchilar ro'yxati"
        actions={
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Yangi o'quvchi
          </button>
        }
      />

      <div className="card">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
            <input className="input pl-10" placeholder="Ism yoki telefon bo'yicha qidiring..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Combobox value={status} onChange={setStatus} placeholder="Barcha holatlar" searchable={false}
            options={[
              { value: 'active', label: 'Faol' },
              { value: 'frozen', label: 'Muzlatilgan' },
              { value: 'archived', label: 'Arxiv' },
            ]} />
          <Combobox value={groupFilter} onChange={setGroupFilter} placeholder="Barcha guruhlar"
            options={(groups?.results || []).map(g => ({ value: g.id, label: g.name }))} />
        </div>

        {selected.length > 0 && (
          <div className="mb-3 p-3 bg-brand-50 border border-brand-200 rounded-xl flex flex-wrap items-center gap-2 justify-between">
            <div className="font-semibold text-sm text-brand-800">{selected.length} ta tanlandi</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setBulkModal('sms')} className="btn-ghost text-brand-700 text-sm"><Send className="w-4 h-4" /> SMS yuborish</button>
              <button onClick={() => setBulkModal('enroll')} className="btn-ghost text-brand-700 text-sm"><Users className="w-4 h-4" /> Guruhga qo'shish</button>
              <button onClick={() => setBulkModal('activate')} className="btn-ghost text-emerald-700 text-sm"><CheckCircle2 className="w-4 h-4" /> Faollashtirish</button>
              <button onClick={() => setBulkModal('archive')} className="btn-ghost text-rose-700 text-sm"><Archive className="w-4 h-4" /> Arxivga</button>
              <button onClick={() => setSelected([])} className="btn-ghost text-ink-500 text-sm"><X className="w-4 h-4" /> Tozalash</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead>
              <tr>
                <th className="w-10"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                <th>Ism</th>
                <th>Telefon</th>
                <th>Guruh(lar)</th>
                <th>Holat</th>
                <th>Chegirma</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="text-center py-8 text-ink-500">Yuklanmoqda...</td></tr>}
              {rows.length === 0 && !isLoading && <tr><td colSpan={7} className="text-center py-8 text-ink-500">O'quvchilar topilmadi</td></tr>}
              {rows.map((s) => (
                <tr key={s.id} className={selected.includes(s.id) ? 'bg-brand-50/40' : ''}>
                  <td><input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} /></td>
                  <td className="font-medium">{s.full_name}</td>
                  <td className="text-ink-700">{s.phone}</td>
                  <td>
                    {s.groups_detail?.length > 0
                      ? <div className="flex flex-wrap gap-1">{s.groups_detail.map(g => <span key={g.id} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded">{g.name}</span>)}</div>
                      : <span className="text-ink-300">—</span>}
                  </td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>{Number(s.discount_percent) > 0 ? `${s.discount_percent}%` : '—'}</td>
                  <td className="text-right">
                    <Link to={`/admin/students/${s.id}`} className="text-brand-600 hover:underline text-sm font-medium">Batafsil</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={data?.count || 0}
          onChange={setPage}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Yangi o'quvchi" size="lg">
        <StudentForm groups={groups?.results || []} onSubmit={(body) => createMut.mutate(body)} loading={createMut.isPending} />
      </Modal>

      <BulkModal
        open={!!bulkModal}
        onClose={() => setBulkModal(null)}
        kind={bulkModal}
        count={selected.length}
        groups={groups?.results || []}
        onSubmit={(extra) => bulkMut.mutate({ ids: selected, action: bulkModal, ...extra })}
        loading={bulkMut.isPending}
      />
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    active: { cls: 'badge-success', label: 'Faol' },
    frozen: { cls: 'badge-info', label: 'Muzlatilgan' },
    archived: { cls: 'badge-muted', label: 'Arxiv' },
  }
  const { cls, label } = map[status] || map.active
  return <span className={cls}>{label}</span>
}

function StudentForm({ groups, onSubmit, loading }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', password: '', group: '', groups: [],
    referrer_student: null, referrer_teacher: null, referrer_source: '',
    parent_phone: '', parent_name: '',
  })
  const handle = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const { data: studentsAll } = useQuery({
    queryKey: ['students-all-lite'],
    queryFn: () => api.get('/students/', { params: { status: 'active' } }).then(r => r.data),
  })
  const { data: teachersAll } = useQuery({
    queryKey: ['teachers-all-lite'],
    queryFn: () => api.get('/teachers/').then(r => r.data),
  })

  function toggleGroup(id) {
    setForm(f => ({
      ...f,
      groups: f.groups.includes(id) ? f.groups.filter(g => g !== id) : [...f.groups, id]
    }))
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          ...form,
          group: form.group || null,
          referrer_student: form.referrer_student || null,
          referrer_teacher: form.referrer_teacher || null,
        })
      }}
      className="grid md:grid-cols-2 gap-4"
    >
      <div><label className="label">Ism *</label><input className="input" value={form.first_name} onChange={handle('first_name')} required /></div>
      <div><label className="label">Familiya *</label><input className="input" value={form.last_name} onChange={handle('last_name')} required /></div>
      <div><label className="label">Telefon *</label>
        <PhoneInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
      </div>
      <div><label className="label">Parol *</label><input className="input" type="text" value={form.password} onChange={handle('password')} required minLength={4} /></div>
      <div className="md:col-span-2 border-t border-ink-100 pt-3 mt-1">
        <div className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">Ota-ona (ixtiyoriy)</div>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="label">Telefon raqam</label>
            <PhoneInput value={form.parent_phone} onChange={(v) => setForm({ ...form, parent_phone: v })} />
          </div>
          <div><label className="label">Ism</label><input className="input" value={form.parent_name} onChange={handle('parent_name')} placeholder="Otaning/Onaning ismi" /></div>
        </div>
        <p className="text-xs text-ink-500 mt-2">Ota-ona bu telefon orqali login qiladi. Parolni o'quvchining "Batafsil" sahifasida o'rnatishingiz mumkin.</p>
      </div>
      <div className="md:col-span-2">
        <label className="label">Asosiy guruh</label>
        <Combobox value={form.group} onChange={(v) => setForm({ ...form, group: v })}
          options={groups.map(g => ({ value: g.id, label: g.name }))} placeholder="Tanlang (ixtiyoriy)..." />
      </div>
      <div className="md:col-span-2">
        <label className="label">Qo'shimcha guruhlar</label>
        <div className="flex flex-wrap gap-2 p-2 border border-ink-200 rounded-xl min-h-[48px]">
          {groups.length === 0 && <span className="text-sm text-ink-400 px-2 py-1">Guruhlar yo'q</span>}
          {groups.map(g => {
            const active = form.groups.includes(g.id) || form.group === g.id
            return (
              <button type="button" key={g.id} onClick={() => toggleGroup(g.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${active ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200'}`}>
                {g.name}
              </button>
            )
          })}
        </div>
      </div>
      <div className="md:col-span-2 border-t border-ink-100 pt-3 mt-1">
        <div className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">Kim taklif qildi (ixtiyoriy)</div>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="label">O'quvchi</label>
            <Combobox value={form.referrer_student} onChange={(v) => setForm({ ...form, referrer_student: v, referrer_teacher: v ? null : form.referrer_teacher })}
              options={(studentsAll?.results || []).map(s => ({ value: s.id, label: s.full_name }))} placeholder="—" />
          </div>
          <div>
            <label className="label">O'qituvchi</label>
            <Combobox value={form.referrer_teacher} onChange={(v) => setForm({ ...form, referrer_teacher: v, referrer_student: v ? null : form.referrer_student })}
              options={(teachersAll?.results || []).map(t => ({ value: t.id, label: t.full_name }))} placeholder="—" />
          </div>
          <div>
            <label className="label">Yoki tashqi manba</label>
            <input className="input" placeholder="Instagram, reklama..." value={form.referrer_source} onChange={handle('referrer_source')} />
          </div>
        </div>
      </div>
      <div className="md:col-span-2 flex justify-end gap-2 pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saqlanmoqda...' : "Saqlash"}
        </button>
      </div>
    </form>
  )
}

function BulkModal({ open, onClose, kind, count, groups, onSubmit, loading }) {
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [group, setGroup] = useState('')

  const titles = {
    archive: 'Arxivga ko\'chirish',
    activate: 'Faollashtirish',
    sms: 'SMS yuborish',
    enroll: 'Guruhga qo\'shish',
  }

  function submit() {
    if (kind === 'archive') onSubmit({ reason })
    else if (kind === 'activate') onSubmit({})
    else if (kind === 'sms') { if (!message) return toast.error("Xabar matnini kiriting"); onSubmit({ message }) }
    else if (kind === 'enroll') { if (!group) return toast.error("Guruhni tanlang"); onSubmit({ group }) }
  }

  return (
    <Modal open={open} onClose={onClose} title={titles[kind] || ''}>
      <div className="space-y-3">
        <div className="p-3 bg-brand-50 rounded-xl text-sm">
          <span className="font-bold text-brand-700">{count}</span> ta o'quvchiga qo'llaniladi
        </div>
        {kind === 'archive' && (
          <div><label className="label">Sabab</label><textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        )}
        {kind === 'sms' && (
          <div><label className="label">Xabar</label><textarea className="input" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
        )}
        {kind === 'enroll' && (
          <div><label className="label">Guruh</label>
            <Combobox value={group} onChange={setGroup} options={groups.map(g => ({ value: g.id, label: g.name }))} placeholder="Tanlang..." />
          </div>
        )}
        {kind === 'activate' && <div className="text-sm text-ink-600">Barcha tanlanganlar faol holatga o'tkaziladi.</div>}
        <button onClick={submit} disabled={loading} className="btn-primary w-full">
          {loading ? 'Bajarilmoqda...' : 'Tasdiqlash'}
        </button>
      </div>
    </Modal>
  )
}
