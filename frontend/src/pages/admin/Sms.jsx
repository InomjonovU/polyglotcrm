import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Send, FileText, History, Edit, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import Combobox from '../../components/Combobox'
import Pagination from '../../components/Pagination'
import { formatDateTime } from '../../utils/format'

export default function AdminSms() {
  const [tab, setTab] = useState('send')

  return (
    <div>
      <PageHeader title="SMS boshqaruvi" subtitle="Shablonlar, yuborish, tarix" />

      <div className="flex gap-1 p-1 bg-ink-100 rounded-xl mb-5 w-fit flex-wrap">
        <TabBtn active={tab === 'send'} onClick={() => setTab('send')} icon={Send}>Yuborish</TabBtn>
        <TabBtn active={tab === 'templates'} onClick={() => setTab('templates')} icon={FileText}>Shablonlar</TabBtn>
        <TabBtn active={tab === 'history'} onClick={() => setTab('history')} icon={History}>Tarix</TabBtn>
      </div>

      {tab === 'send' && <SendPanel />}
      {tab === 'templates' && <TemplatesPanel />}
      {tab === 'history' && <HistoryPanel />}
    </div>
  )
}

function TabBtn({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
        active ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-600 hover:text-ink-900'
      }`}
    >
      <Icon className="w-4 h-4" /> {children}
    </button>
  )
}

function SendPanel() {
  const [audience, setAudience] = useState('all-students')
  const [templateId, setTemplateId] = useState('')
  const [message, setMessage] = useState('')
  const [customPhones, setCustomPhones] = useState('')

  const { data: students } = useQuery({ queryKey: ['sms-students'], queryFn: () => api.get('/students/').then(r => r.data) })
  const { data: teachers } = useQuery({ queryKey: ['sms-teachers'], queryFn: () => api.get('/teachers/').then(r => r.data) })
  const { data: templates } = useQuery({ queryKey: ['sms-templates'], queryFn: () => api.get('/sms/templates/').then(r => r.data) })

  const templateOptions = (templates?.results || []).map(t => ({ value: t.id, label: t.name, hint: t.code }))

  function applyTemplate(id) {
    setTemplateId(id)
    const t = (templates?.results || []).find(x => x.id === id)
    if (t) setMessage(t.body)
  }

  const audienceOptions = [
    { value: 'all-students', label: "Barcha o'quvchilar" },
    { value: 'active-students', label: "Faol o'quvchilar" },
    { value: 'debtors', label: 'Qarzdorlar' },
    { value: 'all-teachers', label: "Barcha o'qituvchilar" },
    { value: 'custom', label: "Telefon raqamlar ro'yxati" },
  ]

  const mut = useMutation({
    mutationFn: (body) => api.post('/sms/bulk-send/', body),
    onSuccess: (r) => { toast.success(`${r.data.queued} ta SMS navbatga qo'yildi`); setMessage('') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Xatolik'),
  })

  function computePhones() {
    if (audience === 'custom') {
      return customPhones.split(/[\s,;\n]+/).filter(Boolean)
    }
    if (audience === 'all-students') return (students?.results || []).map(s => s.phone).filter(Boolean)
    if (audience === 'active-students') return (students?.results || []).filter(s => s.status === 'active').map(s => s.phone).filter(Boolean)
    if (audience === 'debtors') return (students?.results || []).filter(s => s.has_debt).map(s => s.phone).filter(Boolean)
    if (audience === 'all-teachers') return (teachers?.results || []).map(t => t.phone).filter(Boolean)
    return []
  }

  const phones = computePhones()

  function send() {
    if (!message.trim()) return toast.error('Xabar kiriting')
    if (phones.length === 0) return toast.error('Qabul qiluvchilar yo\'q')
    mut.mutate({ phones, message })
  }

  return (
    <div className="card max-w-3xl">
      <div className="space-y-4">
        <div>
          <label className="label">Qabul qiluvchilar</label>
          <Combobox value={audience} onChange={setAudience} options={audienceOptions} searchable={false} clearable={false} />
        </div>
        {audience === 'custom' && (
          <div>
            <label className="label">Telefon raqamlar (vergul yoki yangi qator bilan)</label>
            <textarea className="input" rows={3} value={customPhones} onChange={(e) => setCustomPhones(e.target.value)} placeholder="998901234567, 998909876543" />
          </div>
        )}
        <div>
          <label className="label">Shablon (ixtiyoriy)</label>
          <Combobox value={templateId} onChange={applyTemplate} options={templateOptions} placeholder="Shablondan foydalanish..." />
        </div>
        <div>
          <label className="label">Xabar matni</label>
          <textarea className="input" rows={5} value={message} onChange={(e) => { setMessage(e.target.value); setTemplateId('') }} placeholder="SMS matni..." />
          <div className="text-xs text-ink-500 mt-1">{message.length} belgi</div>
        </div>
        <div className="p-3 bg-brand-50 rounded-xl text-sm">
          <span className="font-semibold text-brand-700">{phones.length}</span> ta qabul qiluvchiga yuboriladi
        </div>
        <button onClick={send} disabled={mut.isPending || phones.length === 0} className="btn-primary w-full">
          <Send className="w-4 h-4" /> {mut.isPending ? 'Yuborilmoqda...' : 'SMS yuborish'}
        </button>
      </div>
    </div>
  )
}

function TemplatesPanel() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(null)
  const { data } = useQuery({ queryKey: ['sms-templates'], queryFn: () => api.get('/sms/templates/').then(r => r.data) })

  const saveMut = useMutation({
    mutationFn: (body) => body.id ? api.patch(`/sms/templates/${body.id}/`, body) : api.post('/sms/templates/', body),
    onSuccess: () => { toast.success('Saqlandi'); qc.invalidateQueries({ queryKey: ['sms-templates'] }); setEditing(null) },
  })

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setEditing({ code: '', title: '', body: '' })} className="btn-primary">Yangi shablon</button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {data?.results?.map(t => (
          <div key={t.id} className="card hover:shadow-lift transition-shadow">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="text-xs text-brand-600 font-mono">{t.code}</div>
                <h4 className="font-display font-semibold">{t.title}</h4>
              </div>
              <button onClick={() => setEditing(t)} className="p-1.5 hover:bg-ink-100 rounded">
                <Edit className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-ink-600 whitespace-pre-wrap bg-ink-50 rounded-lg p-2">{t.body}</div>
          </div>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Shablon" size="lg">
        {editing && (
          <div className="space-y-3">
            <div>
              <label className="label">Kod</label>
              <input className="input" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
            </div>
            <div>
              <label className="label">Sarlavha</label>
              <input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Matn</label>
              <textarea rows={5} className="input" value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
              <div className="text-xs text-ink-500 mt-1">{'{first_name}, {amount}, {month}'} kabi o'zgaruvchilar</div>
            </div>
            <button onClick={() => saveMut.mutate(editing)} className="btn-primary w-full">Saqlash</button>
          </div>
        )}
      </Modal>
    </div>
  )
}

function HistoryPanel() {
  const [page, setPage] = useState(1)
  const [statusF, setStatusF] = useState('')
  const [q, setQ] = useState('')
  useEffect(() => { setPage(1) }, [statusF, q])

  const { data, isLoading } = useQuery({
    queryKey: ['sms-logs', page, statusF, q],
    queryFn: () => api.get('/sms/logs/', {
      params: {
        page,
        status: statusF || undefined,
        search: q || undefined,
      },
    }).then(r => r.data),
    keepPreviousData: true,
  })

  const rows = data?.results || []

  return (
    <div className="card">
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Telefon yoki matn bo'yicha qidirish..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Combobox
          value={statusF}
          onChange={setStatusF}
          placeholder="Barcha holatlar"
          searchable={false}
          options={[
            { value: 'sent', label: 'Yuborildi' },
            { value: 'failed', label: 'Xato' },
            { value: 'pending', label: 'Kutmoqda' },
          ]}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="table-clean">
          <thead><tr><th>Vaqt</th><th>Telefon</th><th>Xabar</th><th>Holat</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="text-center py-6 text-ink-500">Yuklanmoqda...</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-ink-500">Yozuvlar yo'q</td></tr>}
            {rows.map(l => (
              <tr key={l.id}>
                <td className="whitespace-nowrap text-xs">{formatDateTime(l.created_at)}</td>
                <td className="font-mono text-sm">{l.phone}</td>
                <td className="text-sm max-w-md truncate">{l.message}</td>
                <td><span className={l.status === 'sent' ? 'badge-success' : l.status === 'failed' ? 'badge-danger' : 'badge-warning'}>{l.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        total={data?.count || 0}
        onChange={setPage}
        className="mt-3"
      />
    </div>
  )
}
