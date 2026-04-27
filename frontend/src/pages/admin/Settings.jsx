import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'

export default function AdminSettings() {
  const [tab, setTab] = useState('sms-config')
  const tabs = [
    ['sms-config', 'SMS ulanish'],
    ['templates', 'SMS shablonlar'],
    ['courses', 'Kurslar'],
    ['levels', 'Darajalar'],
    ['password', 'Parol'],
  ]

  return (
    <div>
      <PageHeader title="Sozlamalar" />
      <div className="flex gap-1 p-1 bg-ink-100 rounded-xl w-fit mb-6 overflow-x-auto max-w-full">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${tab === k ? 'bg-white shadow-soft text-brand-700' : 'text-ink-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'sms-config' && <SmsConfig />}
      {tab === 'templates' && <SmsTemplates />}
      {tab === 'courses' && <SimpleCRUD endpoint="/groups/courses/" label="Kurs" />}
      {tab === 'levels' && <SimpleCRUD endpoint="/groups/levels/" label="Daraja" extra={{ order: 0 }} />}
      {tab === 'password' && <ChangePassword />}
    </div>
  )
}

function SmsConfig() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['sms-settings'], queryFn: () => api.get('/sms/settings/').then(r => r.data) })
  const [f, setF] = useState({ provider: 'eskiz', eskiz_email: '', eskiz_password: '', eskiz_sender: '4546', is_enabled: false })

  useEffect(() => {
    if (data) setF({
      provider: data.provider || 'eskiz',
      eskiz_email: data.eskiz_email || '',
      eskiz_password: '',
      eskiz_sender: data.eskiz_sender || '4546',
      is_enabled: data.is_enabled || false,
    })
  }, [data])

  const mut = useMutation({
    mutationFn: (body) => api.put('/sms/settings/', body),
    onSuccess: () => { toast.success('Saqlandi'); qc.invalidateQueries({ queryKey: ['sms-settings'] }) },
    onError: (e) => toast.error(e.response?.data?.detail || 'Xatolik'),
  })

  return (
    <div className="card max-w-xl">
      <h3 className="font-display font-bold text-lg mb-4">SMS provayderi (Eskiz.uz)</h3>
      <div className="space-y-3">
        <div>
          <label className="label">Login (email)</label>
          <input className="input" value={f.eskiz_email} onChange={(e) => setF({ ...f, eskiz_email: e.target.value })} placeholder="your@email.com" />
        </div>
        <div>
          <label className="label">Parol {data?.eskiz_email && <span className="text-xs text-ink-400 font-normal">(bo'sh qoldirsangiz o'zgarmaydi)</span>}</label>
          <input type="password" className="input" value={f.eskiz_password} onChange={(e) => setF({ ...f, eskiz_password: e.target.value })} placeholder="••••••••" />
        </div>
        <div>
          <label className="label">Sender (nick)</label>
          <input className="input" value={f.eskiz_sender} onChange={(e) => setF({ ...f, eskiz_sender: e.target.value })} placeholder="4546" />
        </div>
        <label className="flex items-center gap-2 p-3 bg-ink-50 rounded-xl cursor-pointer">
          <input type="checkbox" checked={f.is_enabled} onChange={(e) => setF({ ...f, is_enabled: e.target.checked })} />
          <div>
            <div className="text-sm font-medium">SMS yuborishni yoqish</div>
            <div className="text-xs text-ink-500">O'chirilgan bo'lsa, SMSlar haqiqiy yuborilmaydi (log qilinadi)</div>
          </div>
        </label>
        <button onClick={() => mut.mutate(f)} disabled={mut.isPending} className="btn-primary w-full">
          {mut.isPending ? 'Saqlanmoqda...' : <><Check className="w-4 h-4" /> Saqlash</>}
        </button>
      </div>
    </div>
  )
}

function SmsTemplates() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['templates'], queryFn: () => api.get('/sms/templates/').then(r => r.data) })
  const [editing, setEditing] = useState(null)

  const saveMut = useMutation({
    mutationFn: (t) => t.id ? api.patch(`/sms/templates/${t.id}/`, t) : api.post('/sms/templates/', t),
    onSuccess: () => { toast.success('Saqlandi'); qc.invalidateQueries({ queryKey: ['templates'] }); setEditing(null) },
  })
  const delMut = useMutation({
    mutationFn: (id) => api.delete(`/sms/templates/${id}/`),
    onSuccess: () => { toast.success("O'chirildi"); qc.invalidateQueries({ queryKey: ['templates'] }) },
  })

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setEditing({ code: '', name: '', body: '', is_active: true })} className="btn-primary">
          <Plus className="w-4 h-4" /> Yangi shablon
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {data?.results?.map(t => (
          <div key={t.id} className="card">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="text-xs text-brand-600 font-mono">{t.code}</div>
                <h4 className="font-display font-semibold truncate">{t.name}</h4>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(t)} className="p-1.5 hover:bg-ink-100 rounded"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => delMut.mutate(t.id)} className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="text-sm text-ink-600 whitespace-pre-wrap bg-ink-50 rounded-lg p-2">{t.body}</div>
          </div>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Shablon" size="lg">
        {editing && (
          <form onSubmit={(e) => { e.preventDefault(); saveMut.mutate(editing) }} className="space-y-3">
            <div><label className="label">Kod</label><input className="input" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} required /></div>
            <div><label className="label">Nomi</label><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required /></div>
            <div><label className="label">Matn</label>
              <textarea className="input" rows={5} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} required />
              <div className="text-xs text-ink-500 mt-1">Placeholder'lar: {'{first_name}'}, {'{amount}'}, {'{month}'}, {'{year}'}, {'{group}'}</div>
            </div>
            <button className="btn-primary w-full">Saqlash</button>
          </form>
        )}
      </Modal>
    </div>
  )
}

function SimpleCRUD({ endpoint, label, extra = {} }) {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: [endpoint], queryFn: () => api.get(endpoint).then(r => r.data) })
  const [name, setName] = useState('')
  const items = data?.results || data || []

  const createMut = useMutation({
    mutationFn: (body) => api.post(endpoint, { name: body, ...extra }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [endpoint] }); setName('') },
  })
  const delMut = useMutation({
    mutationFn: (id) => api.delete(`${endpoint}${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [endpoint] }),
  })

  return (
    <div className="card max-w-xl">
      <form onSubmit={(e) => { e.preventDefault(); if (name) createMut.mutate(name) }} className="flex gap-2 mb-5">
        <input className="input flex-1" placeholder={`${label} nomi`} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn-primary"><Plus className="w-4 h-4" /> Qo'shish</button>
      </form>
      <ul className="divide-y divide-ink-100">
        {items.map(i => (
          <li key={i.id} className="flex justify-between items-center py-3">
            <span>{i.name}</span>
            <button onClick={() => delMut.mutate(i.id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="w-4 h-4" /></button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChangePassword() {
  const [f, setF] = useState({ old_password: '', new_password: '' })
  const mut = useMutation({
    mutationFn: (body) => api.post('/auth/change-password/', body),
    onSuccess: () => { toast.success("Parol o'zgartirildi"); setF({ old_password: '', new_password: '' }) },
    onError: (e) => toast.error(e.response?.data?.detail || 'Xatolik'),
  })
  return (
    <div className="card max-w-md">
      <form onSubmit={(e) => { e.preventDefault(); mut.mutate(f) }} className="space-y-4">
        <div><label className="label">Eski parol</label><input type="password" className="input" value={f.old_password} onChange={(e) => setF({ ...f, old_password: e.target.value })} required /></div>
        <div><label className="label">Yangi parol</label><input type="password" className="input" value={f.new_password} onChange={(e) => setF({ ...f, new_password: e.target.value })} required minLength={4} /></div>
        <button className="btn-primary w-full">O'zgartirish</button>
      </form>
    </div>
  )
}
