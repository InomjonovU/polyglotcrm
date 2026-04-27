import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Phone, Percent, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'

export default function AdminTeachers() {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['teachers'], queryFn: () => api.get('/teachers/').then(r => r.data) })

  const createMut = useMutation({
    mutationFn: (body) => api.post('/teachers/', body).then(r => r.data),
    onSuccess: () => { toast.success("O'qituvchi qo'shildi"); qc.invalidateQueries(['teachers']); setOpen(false) },
    onError: (e) => toast.error(JSON.stringify(e.response?.data)),
  })

  return (
    <div>
      <PageHeader
        title="O'qituvchilar"
        actions={<button onClick={() => setOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Yangi o'qituvchi</button>}
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {data?.results?.map((t) => (
          <Link to={`/admin/teachers/${t.id}`} key={t.id} className="card hover:shadow-lift hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white font-display font-bold text-lg">
                {t.first_name[0]}{t.last_name[0]}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-semibold text-lg truncate">{t.full_name}</h3>
                  {t.type === 'support' && <span className="badge-info text-[10px]">Support</span>}
                </div>
                <div className="text-sm text-ink-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {t.phone}</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-ink-100 flex justify-between text-sm">
              <span className="flex items-center gap-1"><Percent className="w-3.5 h-3.5 text-brand-600" /> {t.percent}%</span>
              <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-brand-600" /> {t.groups_count} guruh</span>
            </div>
          </Link>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Yangi o'qituvchi">
        <TeacherForm onSubmit={(b) => createMut.mutate(b)} loading={createMut.isPending} />
      </Modal>
    </div>
  )
}

function TeacherForm({ onSubmit, loading }) {
  const [f, setF] = useState({ first_name: '', last_name: '', phone: '', password: '', percent: 30, type: 'main' })
  const h = (k) => (e) => setF({ ...f, [k]: e.target.value })
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f) }} className="grid grid-cols-2 gap-4">
      <div><label className="label">Ism</label><input className="input" value={f.first_name} onChange={h('first_name')} required /></div>
      <div><label className="label">Familiya</label><input className="input" value={f.last_name} onChange={h('last_name')} required /></div>
      <div><label className="label">Telefon</label><input className="input" placeholder="998901234567" value={f.phone} onChange={h('phone')} required /></div>
      <div><label className="label">Parol</label><input className="input" value={f.password} onChange={h('password')} required minLength={4} /></div>
      <div><label className="label">Turi</label>
        <select className="input" value={f.type} onChange={h('type')}>
          <option value="main">Asosiy o'qituvchi</option>
          <option value="support">Yordamchi (support)</option>
        </select>
      </div>
      <div><label className="label">Foiz (%)</label><input type="number" step={0.01} className="input" value={f.percent} onChange={h('percent')} required /></div>
      <div className="col-span-2 flex justify-end pt-2"><button disabled={loading} className="btn-primary">{loading ? 'Saqlanmoqda...' : 'Saqlash'}</button></div>
    </form>
  )
}
