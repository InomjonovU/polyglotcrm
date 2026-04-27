import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, BookOpen, Calendar, Clock, Wallet, UserCheck, Hash } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import Combobox from '../../components/Combobox'
import { formatMoney, formatDate, WEEKDAY_PATTERNS } from '../../utils/format'

export default function AdminGroups() {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()

  const { data } = useQuery({ queryKey: ['groups'], queryFn: () => api.get('/groups/').then(r => r.data) })
  const { data: teachers } = useQuery({ queryKey: ['teachers'], queryFn: () => api.get('/teachers/').then(r => r.data) })
  const { data: courses } = useQuery({ queryKey: ['courses'], queryFn: () => api.get('/groups/courses/').then(r => r.data) })
  const { data: levels } = useQuery({ queryKey: ['levels'], queryFn: () => api.get('/groups/levels/').then(r => r.data) })

  const createMut = useMutation({
    mutationFn: (body) => api.post('/groups/', body).then(r => r.data),
    onSuccess: () => { toast.success('Guruh yaratildi'); qc.invalidateQueries(['groups']); setOpen(false) },
    onError: (e) => toast.error(JSON.stringify(e.response?.data)),
  })

  return (
    <div>
      <PageHeader
        title="Guruhlar"
        subtitle="Barcha faol va nofaol guruhlar"
        actions={<button onClick={() => setOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Yangi guruh</button>}
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {data?.results?.map((g) => (
          <Link to={`/admin/groups/${g.id}`} key={g.id} className="card hover:shadow-lift hover:-translate-y-0.5 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-xs text-ink-500 mb-1">{g.course_name} · {g.level_name || '—'}</div>
                <h3 className="font-display font-semibold text-lg group-hover:text-brand-600 transition">{g.name}</h3>
              </div>
              <span className={g.is_active ? 'badge-success' : 'badge-muted'}>{g.is_active ? 'Faol' : 'Nofaol'}</span>
            </div>
            <div className="space-y-1.5 text-sm text-ink-700">
              <div>📅 {g.weekday_pattern_display} · {g.lesson_time?.slice(0, 5)}</div>
              {g.start_date && (
                <div className="text-xs text-ink-500">
                  {new Date(g.start_date) > new Date() ? '🚀 Boshlanadi: ' : '✅ Boshlangan: '}
                  <b className="text-ink-700">{formatDate(g.start_date)}</b>
                </div>
              )}
              <div>👨‍🏫 {g.teacher_name || 'O\'qituvchi biriktirilmagan'}</div>
              <div>💰 {formatMoney(g.monthly_fee)}/oy</div>
            </div>
            <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-ink-500"><Users className="w-4 h-4" /> {g.active_students_count} o'quvchi</span>
              <span className="text-brand-600 font-medium">Batafsil →</span>
            </div>
          </Link>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Yangi guruh" size="lg">
        <GroupForm teachers={teachers?.results || []} courses={courses?.results || courses || []} levels={levels?.results || levels || []} onSubmit={(b) => createMut.mutate(b)} loading={createMut.isPending} />
      </Modal>
    </div>
  )
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="md:col-span-2 flex items-center gap-2 mt-1">
      <Icon className="w-4 h-4 text-brand-600" />
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">{children}</span>
      <div className="flex-1 h-px bg-ink-100" />
    </div>
  )
}

function GroupForm({ teachers, courses, levels, onSubmit, loading }) {
  const [f, setF] = useState({
    name: '', course: '', level: '', weekday_pattern: 'mwf',
    lesson_time: '10:00', start_date: new Date().toISOString().slice(0, 10),
    monthly_fee: '', teacher: '', max_students: '',
  })
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }))

  const courseOptions = courses.map(c => ({ value: c.id, label: c.name }))
  const levelOptions = levels.map(l => ({ value: l.id, label: l.name }))
  const weekdayOptions = Object.entries(WEEKDAY_PATTERNS).map(([k, v]) => ({ value: k, label: v }))
  const teacherOptions = teachers.map(t => ({
    value: t.id,
    label: t.full_name,
    hint: `Ulush: ${t.percent}%`,
  }))

  function submit(e) {
    e.preventDefault()
    if (!f.name.trim()) return toast.error('Guruh nomini kiriting')
    if (!f.course) return toast.error('Kursni tanlang')
    if (!f.start_date) return toast.error('Boshlanish sanasini kiriting')
    if (!f.monthly_fee) return toast.error('Oylik narxni kiriting')
    onSubmit({
      ...f,
      level: f.level || null,
      teacher: f.teacher || null,
      max_students: f.max_students || null,
      start_date: f.start_date || null,
    })
  }

  return (
    <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
      <SectionTitle icon={BookOpen}>Asosiy ma'lumot</SectionTitle>

      <div className="md:col-span-2">
        <label className="label">Guruh nomi *</label>
        <input
          className="input"
          value={f.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Masalan: English A1 — Ertalabki"
          required
        />
      </div>

      <div>
        <label className="label">Kurs *</label>
        <Combobox
          value={f.course}
          onChange={(v) => set('course', v)}
          options={courseOptions}
          placeholder="Kursni tanlang..."
          clearable={false}
        />
      </div>

      <div>
        <label className="label">Daraja</label>
        <Combobox
          value={f.level}
          onChange={(v) => set('level', v)}
          options={levelOptions}
          placeholder="Ixtiyoriy"
        />
      </div>

      <SectionTitle icon={Calendar}>Jadval</SectionTitle>

      <div>
        <label className="label">Dars kunlari *</label>
        <Combobox
          value={f.weekday_pattern}
          onChange={(v) => set('weekday_pattern', v)}
          options={weekdayOptions}
          searchable={false}
          clearable={false}
        />
      </div>

      <div>
        <label className="label flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Dars vaqti *</label>
        <input
          type="time"
          className="input"
          value={f.lesson_time}
          onChange={(e) => set('lesson_time', e.target.value)}
          required
        />
      </div>

      <div className="md:col-span-2">
        <label className="label flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> Darslar boshlanish sanasi *
        </label>
        <input
          type="date"
          className="input"
          value={f.start_date}
          onChange={(e) => set('start_date', e.target.value)}
          required
        />
        <p className="text-xs text-ink-500 mt-1.5">
          Bu sanadan boshlab davomat va dars kuni hisoblanadi.
        </p>
      </div>

      <SectionTitle icon={Wallet}>To'lov va sig'im</SectionTitle>

      <div>
        <label className="label">Oylik narx *</label>
        <div className="relative">
          <input
            type="number"
            min="0"
            step="1000"
            className="input pr-14"
            value={f.monthly_fee}
            onChange={(e) => set('monthly_fee', e.target.value)}
            placeholder="500000"
            required
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-500 pointer-events-none">so'm</span>
        </div>
        {f.monthly_fee && Number(f.monthly_fee) > 0 && (
          <div className="text-xs text-ink-500 mt-1">≈ {formatMoney(f.monthly_fee)}</div>
        )}
      </div>

      <div>
        <label className="label flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Maksimal o'quvchi</label>
        <input
          type="number"
          min="1"
          className="input"
          value={f.max_students}
          onChange={(e) => set('max_students', e.target.value)}
          placeholder="Cheklov yo'q"
        />
      </div>

      <SectionTitle icon={UserCheck}>O'qituvchi</SectionTitle>

      <div className="md:col-span-2">
        <label className="label">Asosiy o'qituvchi</label>
        <Combobox
          value={f.teacher}
          onChange={(v) => set('teacher', v)}
          options={teacherOptions}
          placeholder="O'qituvchini tanlang (ixtiyoriy)..."
        />
        <p className="text-xs text-ink-500 mt-1.5">Yordamchi o'qituvchini guruh ochilgandan so'ng "Batafsil" sahifada qo'shishingiz mumkin.</p>
      </div>

      <div className="md:col-span-2 flex justify-end pt-3 border-t border-ink-100 mt-1">
        <button disabled={loading} className="btn-primary">
          {loading ? 'Saqlanmoqda...' : 'Guruh yaratish'}
        </button>
      </div>
    </form>
  )
}
