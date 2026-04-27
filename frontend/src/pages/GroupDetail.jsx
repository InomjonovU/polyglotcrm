import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Users, CheckSquare, FileText, Star, Settings as SettingsIcon,
  Info, Clock, CalendarX, Plus, Edit, Trash2, Check, X, Lock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import Modal from '../components/Modal'
import Combobox from '../components/Combobox'
import PageHeader from '../components/PageHeader'
import { formatMoney, formatDate, WEEKDAY_PATTERNS } from '../utils/format'
import { useAuth } from '../context/AuthContext'

const TABS = [
  { k: 'overview',  label: 'Umumiy',      icon: Info },
  { k: 'students',  label: "O'quvchilar", icon: Users },
  { k: 'attendance',label: 'Davomat',     icon: CheckSquare },
  { k: 'homework',  label: 'Vazifalar',   icon: FileText },
  { k: 'grades',    label: 'Baholar',     icon: Star },
  { k: 'settings',  label: 'Sozlamalar',  icon: SettingsIcon, adminOnly: true },
]

export default function GroupDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const isAdmin = user?.role === 'admin'
  const backTo = isAdmin ? '/admin/groups' : '/teacher/groups'

  const { data: group } = useQuery({ queryKey: ['group', id], queryFn: () => api.get(`/groups/${id}/`).then(r => r.data) })
  const { data: students } = useQuery({ queryKey: ['group-students', id], queryFn: () => api.get(`/groups/${id}/students/`).then(r => r.data) })

  if (!group) return <div className="card">Yuklanmoqda...</div>

  const tabs = TABS.filter(t => isAdmin || !t.adminOnly)

  return (
    <div>
      <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600 mb-3">
        <ArrowLeft className="w-4 h-4" /> Orqaga
      </Link>

      <div className="card mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-ink-500 uppercase tracking-wide">{group.course_name}</div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1 truncate">{group.name}</h1>
            <div className="mt-2 text-sm text-ink-500 flex flex-wrap gap-x-3 gap-y-1">
              <span>{group.weekday_pattern_display}</span>
              <span>·</span>
              <span>{group.lesson_time?.slice(0, 5)}</span>
              <span>·</span>
              <span>{group.teacher_name || "O'qituvchi yo'q"}</span>
              {group.support_teacher_name && (<><span>·</span><span className="text-amber-700">Yordamchi: {group.support_teacher_name}</span></>)}
              <span>·</span>
              <span>{group.active_students_count} faol o'quvchi</span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-bold text-brand-600">{formatMoney(group.monthly_fee)}</div>
            <div className="text-xs text-ink-500">oylik narx</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-ink-100 rounded-xl mb-5 overflow-x-auto">
        {tabs.map(t => {
          const Ico = t.icon
          return (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                tab === t.k ? 'bg-white shadow-soft text-brand-700' : 'text-ink-600 hover:text-ink-900'
              }`}>
              <Ico className="w-4 h-4" /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview'  && <OverviewTab group={group} students={students || []} isAdmin={isAdmin} />}
      {tab === 'students'  && <StudentsTab students={students || []} isAdmin={isAdmin} groupId={id} />}
      {tab === 'attendance'&& <AttendanceTab group={group} students={students || []} isAdmin={isAdmin} />}
      {tab === 'homework'  && <HomeworkTab group={group} students={students || []} isAdmin={isAdmin} />}
      {tab === 'grades'    && <GradesTab group={group} students={students || []} isAdmin={isAdmin} />}
      {tab === 'settings'  && isAdmin && <SettingsTab group={group} />}
    </div>
  )
}

// =====================================================================
// OVERVIEW
// =====================================================================
function OverviewTab({ group, students, isAdmin }) {
  const active = students.filter(s => s.status === 'active').length
  const frozen = students.filter(s => s.status === 'frozen').length

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Stat label="Jami o'quvchi" value={students.length} />
      <Stat label="Faol" value={active} tone="emerald" />
      <Stat label="Muzlatilgan" value={frozen} tone="amber" />
      <Stat label="Oylik tushum" value={formatMoney(group.monthly_fee * active)} tone="brand" />
    </div>
  )
}

function Stat({ label, value, tone = 'ink' }) {
  const tones = { ink: 'text-ink-900', brand: 'text-brand-600', emerald: 'text-emerald-600', amber: 'text-amber-600' }
  return (
    <div className="card">
      <div className="text-xs text-ink-500">{label}</div>
      <div className={`font-display text-2xl font-bold mt-1 ${tones[tone]}`}>{value}</div>
    </div>
  )
}

// =====================================================================
// STUDENTS
// =====================================================================
function StudentsTab({ students, isAdmin, groupId }) {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)

  const { data: allStudents } = useQuery({
    queryKey: ['all-students'],
    queryFn: () => api.get('/students/', { params: { status: 'active' } }).then(r => r.data),
    enabled: isAdmin,
  })

  const enrolledIds = new Set(students.map(s => s.id))
  const available = (allStudents?.results || []).filter(s => !enrolledIds.has(s.id))

  const enrollMut = useMutation({
    mutationFn: (ids) => api.post(`/groups/${groupId}/enroll/`, { student_ids: ids }),
    onSuccess: () => { toast.success("Qo'shildi"); qc.invalidateQueries({ queryKey: ['group-students', groupId] }); setAddOpen(false) },
    onError: (e) => toast.error(e.response?.data?.detail || 'Xatolik'),
  })
  const removeMut = useMutation({
    mutationFn: (sid) => api.post(`/groups/${groupId}/unenroll/`, { student_id: sid }),
    onSuccess: () => { toast.success("Chiqarildi"); qc.invalidateQueries({ queryKey: ['group-students', groupId] }) },
    onError: (e) => toast.error(e.response?.data?.detail || 'Xatolik'),
  })

  return (
    <div>
      {isAdmin && (
        <div className="flex justify-end mb-3">
          <button onClick={() => setAddOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> O'quvchi qo'shish</button>
        </div>
      )}
      <div className="card">
        <table className="table-clean">
          <thead><tr><th>Ism</th><th>Telefon</th><th>Holat</th><th>Chegirma</th><th></th></tr></thead>
          <tbody>
            {students.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-ink-500">O'quvchilar yo'q</td></tr>}
            {students.map(s => (
              <tr key={s.id}>
                <td className="font-medium">{s.full_name}</td>
                <td className="text-sm">{s.phone}</td>
                <td><span className={s.status === 'active' ? 'badge-success' : s.status === 'frozen' ? 'badge-info' : 'badge-muted'}>{s.status_display}</span></td>
                <td>{Number(s.discount_percent) > 0 ? `${s.discount_percent}%` : '—'}</td>
                <td className="text-right whitespace-nowrap">
                  {isAdmin && (
                    <div className="flex items-center gap-2 justify-end">
                      <Link to={`/admin/students/${s.id}`} className="text-brand-600 text-sm font-medium">Batafsil</Link>
                      <button onClick={() => { if (confirm(`${s.full_name}'ni guruhdan chiqarish?`)) removeMut.mutate(s.id) }}
                        className="p-1 hover:bg-rose-50 text-rose-500 rounded" title="Chiqarish">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EnrollModal open={addOpen} onClose={() => setAddOpen(false)} available={available} onSubmit={(ids) => enrollMut.mutate(ids)} loading={enrollMut.isPending} />
    </div>
  )
}

function EnrollModal({ open, onClose, available, onSubmit, loading }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState([])

  useEffect(() => { if (!open) { setQuery(''); setSelected([]) } }, [open])

  const filtered = available.filter(s =>
    !query || s.full_name.toLowerCase().includes(query.toLowerCase()) || s.phone?.includes(query)
  )

  function toggle(id) {
    setSelected(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id])
  }

  return (
    <Modal open={open} onClose={onClose} title="Guruhga o'quvchi qo'shish" size="lg">
      <div className="space-y-3">
        <input className="input" placeholder="Qidiring..." value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        <div className="max-h-80 overflow-y-auto border border-ink-100 rounded-xl divide-y divide-ink-100">
          {filtered.length === 0 && <div className="p-6 text-center text-ink-500 text-sm">Topilmadi</div>}
          {filtered.map(s => {
            const active = selected.includes(s.id)
            return (
              <button type="button" key={s.id} onClick={() => toggle(s.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition ${active ? 'bg-brand-50' : 'hover:bg-ink-50'}`}>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{s.full_name}</div>
                  <div className="text-xs text-ink-500">{s.phone}</div>
                </div>
                <div className={`w-5 h-5 rounded border-2 grid place-items-center shrink-0 ${active ? 'bg-brand-600 border-brand-600' : 'border-ink-300'}`}>
                  {active && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
            )
          })}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-ink-500">{selected.length} ta tanlandi</div>
          <button onClick={() => onSubmit(selected)} disabled={selected.length === 0 || loading} className="btn-primary">
            {loading ? 'Saqlanmoqda...' : "Qo'shish"}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// =====================================================================
// ATTENDANCE (grid + today marking)
// =====================================================================
function AttendanceTab({ group, students, isAdmin }) {
  const qc = useQueryClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-12
  const [marks, setMarks] = useState({})

  const { data: grid } = useQuery({
    queryKey: ['att-grid', group.id, year, month],
    queryFn: () => api.get('/attendance/grid/', { params: { group: group.id, year, month } }).then(r => r.data),
  })
  const { data: todayData } = useQuery({
    queryKey: ['att-today'],
    queryFn: () => api.get('/attendance/today/').then(r => r.data),
  })

  const todayGroup = todayData?.groups?.find(g => g.group_id === group.id)
  const canMarkToday = !!todayGroup && !todayGroup.locked

  useEffect(() => {
    if (todayGroup) {
      const initial = {}
      todayGroup.students.forEach(s => {
        if (s.status) initial[s.id] = s.status
        else if (!s.frozen) initial[s.id] = 'present'
      })
      setMarks(initial)
    }
  }, [todayGroup?.group_id])

  const saveMut = useMutation({
    mutationFn: (body) => api.post('/attendance/bulk_mark/', body),
    onSuccess: () => { toast.success('Saqlandi'); qc.invalidateQueries() },
    onError: (e) => toast.error(e.response?.data?.detail || 'Xatolik'),
  })

  function saveToday() {
    const items = todayGroup.students.filter(s => !s.frozen && marks[s.id])
      .map(s => ({ student: s.id, status: marks[s.id] }))
    saveMut.mutate({ group: group.id, date: todayData.date, items })
  }

  return (
    <div className="space-y-5">
      {/* BUGUNGI DAVOMAT */}
      {todayGroup ? (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="font-display font-bold text-lg flex items-center gap-2">
              Bugungi dars {todayGroup.locked && <Lock className="w-4 h-4 text-ink-400" />}
            </h3>
            {canMarkToday && (
              <button onClick={saveToday} disabled={saveMut.isPending} className="btn-primary">
                {saveMut.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            )}
          </div>
          {todayGroup.locked && (
            <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              Davomat belgilangan. O'zgartirish uchun adminga murojaat.
            </div>
          )}
          <div className="space-y-1.5">
            {todayGroup.students.map(s => {
              const status = todayGroup.locked ? s.status : marks[s.id]
              return (
                <div key={s.id} className={`flex items-center justify-between gap-2 p-2.5 rounded-lg ${s.frozen ? 'bg-ink-50 opacity-60' : 'hover:bg-ink-50/50'}`}>
                  <div className="min-w-0 flex-1 truncate text-sm">{s.name} {s.frozen && <span className="text-[10px] text-amber-600 ml-1">(muzlatilgan)</span>}</div>
                  {!s.frozen && (
                    <div className="flex gap-1">
                      <MBtn disabled={todayGroup.locked} active={status==='present'} onClick={() => setMarks({...marks, [s.id]: 'present'})} label="K" color="emerald" />
                      <MBtn disabled={todayGroup.locked} active={status==='late'}    onClick={() => setMarks({...marks, [s.id]: 'late'})}    label="S" color="amber" />
                      <MBtn disabled={todayGroup.locked} active={status==='absent'}  onClick={() => setMarks({...marks, [s.id]: 'absent'})}  label="Y" color="rose" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="card text-sm text-ink-500 text-center py-6">
          Bugun bu guruh uchun dars kuni emas
        </div>
      )}

      {/* TARIX (grid) */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="font-display font-bold text-lg">Tarix</h3>
          <MonthYearPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m) }} />
        </div>
        {isAdmin && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-ink-500">
            <span>Katakka bosing — status tanlang:</span>
            <span className="inline-flex items-center gap-1"><span className="w-4 h-4 rounded bg-emerald-500 text-white grid place-items-center text-[9px] font-bold">K</span> keldi</span>
            <span className="inline-flex items-center gap-1"><span className="w-4 h-4 rounded bg-amber-500 text-white grid place-items-center text-[9px] font-bold">S</span> kech</span>
            <span className="inline-flex items-center gap-1"><span className="w-4 h-4 rounded bg-rose-500 text-white grid place-items-center text-[9px] font-bold">Y</span> yo'q</span>
            <span className="inline-flex items-center gap-1"><span className="w-4 h-4 rounded bg-ink-100 text-ink-400 grid place-items-center text-[9px] font-bold">·</span> belgilanmagan</span>
          </div>
        )}
        {grid && <AttendanceGrid grid={grid} groupId={group.id} editable={isAdmin} />}
      </div>
    </div>
  )
}

const UZ_MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']

function MonthYearPicker({ year, month, onChange }) {
  const now = new Date()
  const years = []
  for (let y = now.getFullYear() - 3; y <= now.getFullYear() + 1; y++) years.push(y)
  function prev() {
    if (month === 1) onChange(year - 1, 12)
    else onChange(year, month - 1)
  }
  function next() {
    if (month === 12) onChange(year + 1, 1)
    else onChange(year, month + 1)
  }
  return (
    <div className="flex gap-1.5 items-center text-sm">
      <button type="button" onClick={prev} className="w-8 h-8 rounded-lg bg-ink-100 hover:bg-ink-200 grid place-items-center text-ink-600 font-bold">‹</button>
      <select className="input py-1.5 text-sm" value={month} onChange={(e) => onChange(year, parseInt(e.target.value))}>
        {UZ_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
      </select>
      <select className="input py-1.5 text-sm" value={year} onChange={(e) => onChange(parseInt(e.target.value), month)}>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <button type="button" onClick={next} className="w-8 h-8 rounded-lg bg-ink-100 hover:bg-ink-200 grid place-items-center text-ink-600 font-bold">›</button>
    </div>
  )
}

function MBtn({ active, onClick, label, color, disabled }) {
  const cls = {
    emerald: active ? 'bg-emerald-500 text-white' : 'bg-ink-100 text-ink-500 hover:bg-emerald-100',
    amber:   active ? 'bg-amber-500 text-white'   : 'bg-ink-100 text-ink-500 hover:bg-amber-100',
    rose:    active ? 'bg-rose-500 text-white'    : 'bg-ink-100 text-ink-500 hover:bg-rose-100',
  }[color]
  return <button disabled={disabled} onClick={onClick} className={`w-8 h-8 rounded-lg text-xs font-bold transition ${cls} ${disabled?'opacity-60':''}`}>{label}</button>
}

function AttendanceGrid({ grid, groupId, editable }) {
  const qc = useQueryClient()
  const [picker, setPicker] = useState(null) // { studentId, date, x, y, flip, currentStatus }
  const colorMap = {
    present: 'bg-emerald-500 text-white ring-emerald-200',
    late:    'bg-amber-500 text-white ring-amber-200',
    absent:  'bg-rose-500 text-white ring-rose-200',
  }
  const letters = { present: 'K', late: 'S', absent: 'Y' }

  const markMut = useMutation({
    mutationFn: ({ student, date, status }) =>
      api.post('/attendance/bulk_mark/', { group: groupId, date, items: [{ student, status: status || null }] }),
    onMutate: async ({ student, date, status }) => {
      await qc.cancelQueries({ queryKey: ['att-grid', groupId] })
      const prev = qc.getQueriesData({ queryKey: ['att-grid', groupId] })
      qc.setQueriesData({ queryKey: ['att-grid', groupId] }, (old) => {
        if (!old) return old
        return {
          ...old,
          students: old.students.map(s =>
            s.id === student ? { ...s, cells: { ...s.cells, [date]: status || null } } : s
          ),
        }
      })
      return { prev }
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([k, v]) => qc.setQueryData(k, v))
      toast.error(e.response?.data?.detail || 'Xatolik')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['att-grid', groupId] }),
  })

  function pick(student, date, status) {
    setPicker(null)
    markMut.mutate({ student, date, status })
  }

  // Tashqariga bosilsa pickerni yopish
  useEffect(() => {
    if (!picker) return
    const close = () => setPicker(null)
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [picker])

  if (grid.dates.length === 0) return <div className="text-ink-500 text-sm text-center py-6">Bu oralikda dars kunlari yo'q</div>

  return (
    <div className="relative overflow-x-auto -mx-5 px-5">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white text-left p-2 text-xs font-semibold text-ink-500 border-b border-ink-100 min-w-[160px] z-10">O'quvchi</th>
            {grid.dates.map(d => {
              const dt = new Date(d + 'T00:00:00')
              const isWeekend = dt.getDay() === 0 || dt.getDay() === 6
              return (
                <th key={d} className={`p-1 border-b border-ink-100 ${isWeekend ? 'bg-ink-50/40' : ''}`}>
                  <div className="text-[10px] text-ink-400 uppercase">{['Yak','Du','Se','Ch','Pay','Ju','Sh'][dt.getDay()]}</div>
                  <div className="text-sm font-bold text-ink-700">{dt.getDate()}</div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {grid.students.map(s => (
            <tr key={s.id} className="group/row">
              <td className="sticky left-0 bg-white group-hover/row:bg-ink-50/60 p-2 border-b border-ink-100 text-sm font-medium z-10 truncate max-w-[160px] transition">{s.name}</td>
              {grid.dates.map(d => {
                const raw = s.cells[d]
                // __before__ => o'quvchi hali guruhda bo'lmagan kun
                if (raw === '__before__') {
                  return (
                    <td key={d} className="p-0.5 border-b border-ink-100 text-center">
                      <div className="w-7 h-7 mx-auto rounded-md grid place-items-center text-[10px] text-ink-300 bg-ink-50/40"
                        title={`${d} — hali guruhda emas`}>—</div>
                    </td>
                  )
                }
                const st = raw
                const isOpen = picker && picker.studentId === s.id && picker.date === d
                const base = `w-7 h-7 mx-auto rounded-md grid place-items-center text-[10px] font-bold transition ${
                  st ? colorMap[st] : 'bg-ink-100 text-ink-400'
                }`
                const hover = editable ? 'cursor-pointer hover:ring-2 hover:scale-105' : ''
                const open = isOpen ? 'ring-2 ring-brand-400 scale-110' : ''
                return (
                  <td key={d} className="p-0.5 border-b border-ink-100 text-center relative">
                    {editable ? (
                      <button type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isOpen) { setPicker(null); return }
                          const rect = e.currentTarget.getBoundingClientRect()
                          const spaceBelow = window.innerHeight - rect.bottom
                          const flip = spaceBelow < 70
                          const x = rect.left + rect.width / 2
                          const y = flip ? rect.top : rect.bottom
                          setPicker({ studentId: s.id, date: d, x, y, flip, currentStatus: st })
                        }}
                        className="block w-full"
                        title={`${d} — ${st || 'belgilanmagan'}`}>
                        <div className={`${base} ${hover} ${open}`}>{st ? letters[st] : '·'}</div>
                      </button>
                    ) : (
                      <div className={base} title={`${d} — ${st || 'belgilanmagan'}`}>{st ? letters[st] : '·'}</div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {picker && createPortal(
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: picker.x,
            top: picker.flip ? undefined : picker.y + 6,
            bottom: picker.flip ? window.innerHeight - picker.y + 6 : undefined,
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
          className="bg-white border border-ink-200 rounded-xl shadow-lift p-1.5 flex gap-1 animate-in"
        >
          <PickBtn active={picker.currentStatus==='present'} onClick={() => pick(picker.studentId, picker.date, 'present')} label="K" title="Keldi" color="emerald" />
          <PickBtn active={picker.currentStatus==='late'}    onClick={() => pick(picker.studentId, picker.date, 'late')}    label="S" title="Kech" color="amber" />
          <PickBtn active={picker.currentStatus==='absent'}  onClick={() => pick(picker.studentId, picker.date, 'absent')}  label="Y" title="Yo'q" color="rose" />
          <div className="w-px bg-ink-100 mx-0.5" />
          <PickBtn active={!picker.currentStatus} onClick={() => pick(picker.studentId, picker.date, null)} label="·" title="Tozalash" color="ink" />
        </div>,
        document.body
      )}
    </div>
  )
}

function PickBtn({ active, onClick, label, title, color }) {
  const map = {
    emerald: active ? 'bg-emerald-500 text-white' : 'text-emerald-600 hover:bg-emerald-50',
    amber:   active ? 'bg-amber-500 text-white'   : 'text-amber-600 hover:bg-amber-50',
    rose:    active ? 'bg-rose-500 text-white'    : 'text-rose-600 hover:bg-rose-50',
    ink:     active ? 'bg-ink-800 text-white'     : 'text-ink-500 hover:bg-ink-100',
  }[color]
  return (
    <button type="button" onClick={onClick} title={title}
      className={`w-8 h-8 rounded-lg text-xs font-bold transition ${map}`}>
      {label}
    </button>
  )
}

// =====================================================================
// HOMEWORK (oddiy ko'rinish: matn + fayl, topshirish/baholash YO'Q)
// =====================================================================
function HomeworkTab({ group, students, isAdmin }) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const [showCreate, setShowCreate] = useState(false)

  const { data } = useQuery({
    queryKey: ['homework', group.id],
    queryFn: () => api.get('/homework/', { params: { group: group.id } }).then(r => r.data),
  })
  const delMut = useMutation({
    mutationFn: (id) => api.delete(`/homework/${id}/`),
    onSuccess: () => { toast.success("O'chirildi"); qc.invalidateQueries({ queryKey: ['homework', group.id] }) },
    onError: (e) => toast.error(e.response?.data?.detail || 'Xatolik'),
  })

  const canCreate = isAdmin || user?.role === 'teacher'

  return (
    <div>
      {canCreate && (
        <div className="flex justify-end mb-3">
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Yangi vazifa
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {(!data?.results || data.results.length === 0) && (
          <div className="card sm:col-span-2 xl:col-span-3 text-center text-ink-500 py-8">Vazifalar yo'q</div>
        )}
        {data?.results?.map(hw => (
          <div key={hw.id} className="card hover:shadow-lift transition flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-display font-bold leading-tight">{hw.title}</h4>
                <div className="text-xs text-ink-500 mt-0.5">Muddat: {formatDate(hw.due_date)}</div>
                {hw.created_by_name && <div className="text-[10px] text-ink-400 mt-0.5">{hw.created_by_name}</div>}
              </div>
              {canCreate && (
                <button onClick={() => { if (confirm("O'chirish?")) delMut.mutate(hw.id) }}
                  className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {hw.description && <p className="text-sm text-ink-700 whitespace-pre-wrap mb-3">{hw.description}</p>}
            {hw.attachment && (
              <a href={hw.attachment} target="_blank" rel="noopener noreferrer"
                className="mt-auto inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
                <FileText className="w-4 h-4" /> Faylni yuklab olish
              </a>
            )}
          </div>
        ))}
      </div>

      <CreateHwModal open={showCreate} onClose={() => setShowCreate(false)} groupId={group.id} />
    </div>
  )
}

function CreateHwModal({ open, onClose, groupId }) {
  const qc = useQueryClient()
  const [f, setF] = useState({ title: '', description: '', due_date: new Date().toISOString().slice(0, 10) })
  const [file, setFile] = useState(null)

  const mut = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('group', groupId)
      fd.append('title', f.title)
      fd.append('description', f.description)
      fd.append('due_date', f.due_date)
      if (file) fd.append('attachment', file)
      return api.post('/homework/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => {
      toast.success("Qo'shildi")
      qc.invalidateQueries({ queryKey: ['homework', groupId] })
      onClose()
      setF({ title: '', description: '', due_date: new Date().toISOString().slice(0, 10) })
      setFile(null)
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Xatolik'),
  })

  return (
    <Modal open={open} onClose={onClose} title="Yangi vazifa" size="lg">
      <div className="space-y-3">
        <div><label className="label">Sarlavha</label>
          <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Unit 5 — Reading" />
        </div>
        <div><label className="label">Tavsif</label>
          <textarea rows={4} className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })}
            placeholder="Uyga vazifa ta'rifi, sahifalar, mashqlar..." />
        </div>
        <div><label className="label">Muddat</label>
          <input type="date" className="input" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
        </div>
        <div><label className="label">Fayl (ixtiyoriy — PDF, rasm, h.k.)</label>
          <input type="file" className="input p-2" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {file && <div className="text-xs text-ink-500 mt-1">Tanlangan: {file.name}</div>}
        </div>
        <button onClick={() => mut.mutate()} disabled={!f.title || mut.isPending} className="btn-primary w-full">
          {mut.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </div>
    </Modal>
  )
}

// =====================================================================
// GRADES
// =====================================================================
function GradesTab({ group, students, isAdmin }) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const { data } = useQuery({
    queryKey: ['grades', group.id],
    queryFn: () => api.get('/grades/', { params: { group: group.id } }).then(r => r.data),
  })
  const delMut = useMutation({
    mutationFn: (id) => api.delete(`/grades/${id}/`),
    onSuccess: () => { toast.success("O'chirildi"); qc.invalidateQueries({ queryKey: ['grades', group.id] }) },
  })

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" /> Baho qo'yish</button>
      </div>

      <div className="card">
        <table className="table-clean">
          <thead><tr><th>Sana</th><th>O'quvchi</th><th>Tur</th><th>Sarlavha</th><th>Baho</th><th></th></tr></thead>
          <tbody>
            {(!data?.results || data.results.length === 0) && <tr><td colSpan={6} className="text-center py-8 text-ink-500">Baholar yo'q</td></tr>}
            {data?.results?.map(g => (
              <tr key={g.id}>
                <td className="text-sm whitespace-nowrap">{formatDate(g.date)}</td>
                <td className="font-medium">{g.student_name}</td>
                <td className="text-xs"><span className="badge-info">{g.type_display}</span></td>
                <td className="text-sm">{g.title || '—'}</td>
                <td><span className="font-display font-bold text-brand-600 text-lg">{g.value}</span><span className="text-ink-300 text-xs">/10</span></td>
                <td className="text-right"><button onClick={() => delMut.mutate(g.id)} className="p-1 hover:bg-rose-50 text-rose-500 rounded"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddGradeModal open={showAdd} onClose={() => setShowAdd(false)} groupId={group.id} students={students} />
    </div>
  )
}

function AddGradeModal({ open, onClose, groupId, students }) {
  const qc = useQueryClient()
  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState({ student: '', type: 'lesson', value: '', title: '', note: '' })

  const mut = useMutation({
    mutationFn: () => api.post('/grades/', { ...f, group: groupId, date: today, value: parseInt(f.value) }),
    onSuccess: () => { toast.success('Saqlandi'); qc.invalidateQueries({ queryKey: ['grades', groupId] }); onClose(); setF({ student: '', type: 'lesson', value: '', title: '', note: '' }) },
    onError: (e) => toast.error(e.response?.data?.detail || e.response?.data?.date?.[0] || 'Xatolik'),
  })

  const studentOpts = useMemo(() => students.filter(s => s.status === 'active').map(s => ({ value: s.id, label: s.full_name })), [students])

  return (
    <Modal open={open} onClose={onClose} title="Yangi baho" size="lg">
      <div className="space-y-3">
        <div><label className="label">O'quvchi</label>
          <Combobox value={f.student} onChange={(v) => setF({ ...f, student: v })} options={studentOpts} placeholder="Tanlang..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Tur</label>
            <Combobox value={f.type} onChange={(v) => setF({ ...f, type: v })} searchable={false} clearable={false}
              options={[{ value: 'lesson', label: 'Dars bahosi' }, { value: 'test', label: 'Test' }, { value: 'exam', label: 'Imtihon' }]} />
          </div>
          <div><label className="label">Baho (1-10)</label>
            <input type="number" min="1" max="10" className="input" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
          </div>
        </div>
        <div><label className="label">Sarlavha</label><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Masalan: Unit 3 quiz" /></div>
        <div><label className="label">Izoh</label><input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        <div className="text-xs text-ink-500">Sana: bugun ({formatDate(today)}) — avtomatik</div>
        <button disabled={!f.student || !f.value || mut.isPending} onClick={() => mut.mutate()} className="btn-primary w-full">Saqlash</button>
      </div>
    </Modal>
  )
}

// =====================================================================
// SETTINGS (admin only)
// =====================================================================
function SettingsTab({ group }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [f, setF] = useState({
    name: group.name,
    course: group.course,
    level: group.level || '',
    weekday_pattern: group.weekday_pattern,
    lesson_time: group.lesson_time?.slice(0, 5) || '',
    monthly_fee: group.monthly_fee,
    teacher: group.teacher || '',
    support_teacher: group.support_teacher || '',
    max_students: group.max_students || '',
    is_active: group.is_active,
  })

  const { data: courses } = useQuery({ queryKey: ['courses'], queryFn: () => api.get('/groups/courses/').then(r => r.data) })
  const { data: levels } = useQuery({ queryKey: ['levels'], queryFn: () => api.get('/groups/levels/').then(r => r.data) })
  const { data: teachers } = useQuery({ queryKey: ['teachers-list'], queryFn: () => api.get('/teachers/').then(r => r.data) })

  const saveMut = useMutation({
    mutationFn: () => api.patch(`/groups/${group.id}/`, {
      ...f,
      level: f.level || null,
      teacher: f.teacher || null,
      support_teacher: f.support_teacher || null,
      max_students: f.max_students || null,
    }),
    onSuccess: () => { toast.success('Saqlandi'); qc.invalidateQueries({ queryKey: ['group', String(group.id)] }) },
    onError: (e) => toast.error(JSON.stringify(e.response?.data || 'Xatolik')),
  })

  const delMut = useMutation({
    mutationFn: () => api.delete(`/groups/${group.id}/`),
    onSuccess: () => { toast.success("O'chirildi"); navigate('/admin/groups') },
    onError: (e) => toast.error(e.response?.data?.detail || "O'chirib bo'lmaydi"),
  })

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelF, setCancelF] = useState({ date: new Date().toISOString().slice(0, 10), reason: '' })
  const cancelMut = useMutation({
    mutationFn: () => api.post(`/groups/${group.id}/cancel_lesson/`, cancelF),
    onSuccess: () => { toast.success("Bekor qilindi, SMS yuborildi"); setCancelOpen(false) },
    onError: (e) => toast.error(e.response?.data?.detail || 'Xatolik'),
  })

  return (
    <div className="space-y-5">
      <div className="card">
        <h3 className="font-display font-bold text-lg mb-4">Guruh ma'lumotlari</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label">Nomi</label>
            <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div><label className="label">Oylik narx</label>
            <input type="number" className="input" value={f.monthly_fee} onChange={(e) => setF({ ...f, monthly_fee: e.target.value })} />
          </div>
          <div><label className="label">Kurs</label>
            <Combobox value={f.course} onChange={(v) => setF({ ...f, course: v })}
              options={(courses?.results || courses || []).map(c => ({ value: c.id, label: c.name }))} />
          </div>
          <div><label className="label">Daraja</label>
            <Combobox value={f.level} onChange={(v) => setF({ ...f, level: v })}
              options={(levels?.results || levels || []).map(l => ({ value: l.id, label: l.name }))} placeholder="—" />
          </div>
          <div><label className="label">Dars kunlari</label>
            <Combobox value={f.weekday_pattern} onChange={(v) => setF({ ...f, weekday_pattern: v })} searchable={false} clearable={false}
              options={Object.entries(WEEKDAY_PATTERNS).map(([k, v]) => ({ value: k, label: v }))} />
          </div>
          <div><label className="label">Dars vaqti</label>
            <input type="time" className="input" value={f.lesson_time} onChange={(e) => setF({ ...f, lesson_time: e.target.value })} />
          </div>
          <div><label className="label">O'qituvchi</label>
            <Combobox value={f.teacher} onChange={(v) => setF({ ...f, teacher: v })}
              options={(teachers?.results || []).filter(t => t.type !== 'support').map(t => ({ value: t.id, label: t.full_name }))} placeholder="—" />
          </div>
          <div><label className="label">Yordamchi (support) o'qituvchi</label>
            <Combobox value={f.support_teacher} onChange={(v) => setF({ ...f, support_teacher: v })}
              options={(teachers?.results || []).map(t => ({ value: t.id, label: `${t.full_name}${t.type==='support' ? ' · Support' : ''}` }))} placeholder="—" />
          </div>
          <div><label className="label">Maks. o'quvchi</label>
            <input type="number" className="input" value={f.max_students} onChange={(e) => setF({ ...f, max_students: e.target.value })} placeholder="cheklanmagan" />
          </div>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} />
            <span className="text-sm">Faol (o'chirilsa yangi darslar rejalashtirilmaydi)</span>
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-primary">
            {saveMut.isPending ? 'Saqlanmoqda...' : "O'zgarishlarni saqlash"}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="font-display font-bold text-lg mb-3">Amaliyotlar</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCancelOpen(true)} className="btn-outline"><CalendarX className="w-4 h-4" /> Darsni bekor qilish</button>
          <button onClick={() => { if (confirm("Guruhni o'chirish?")) delMut.mutate() }} className="btn-outline text-rose-600 border-rose-200 hover:bg-rose-50">
            <Trash2 className="w-4 h-4" /> Guruhni o'chirish
          </button>
        </div>
      </div>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Darsni bekor qilish">
        <div className="space-y-3">
          <div><label className="label">Sana</label><input type="date" className="input" value={cancelF.date} onChange={(e) => setCancelF({ ...cancelF, date: e.target.value })} /></div>
          <div><label className="label">Sabab</label><input className="input" value={cancelF.reason} onChange={(e) => setCancelF({ ...cancelF, reason: e.target.value })} /></div>
          <button onClick={() => cancelMut.mutate()} className="btn-primary w-full">Bekor qilish va SMS</button>
        </div>
      </Modal>
    </div>
  )
}
