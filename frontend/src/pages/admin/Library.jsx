import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, BookOpen, Edit, Trash2, ShoppingCart, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import Combobox from '../../components/Combobox'
import { formatDateTime, formatMoney } from '../../utils/format'

const LANGS = [
  { value: 'uz', label: "O'zbek" },
  { value: 'ru', label: 'Rus' },
  { value: 'en', label: 'Ingliz' },
  { value: 'other', label: 'Boshqa' },
]

function fmtErr(d) {
  if (!d) return 'Xatolik'
  if (typeof d === 'string') return d
  if (d.detail) return d.detail
  return Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ')
}

export default function Library() {
  const [tab, setTab] = useState('books')
  return (
    <div>
      <PageHeader title="Kutubxona" subtitle="Kitoblar va sotuvlar" />
      <div className="flex gap-1 p-1 bg-ink-100 rounded-xl mb-5 w-fit">
        <button onClick={() => setTab('books')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab==='books' ? 'bg-white shadow-soft text-brand-700' : 'text-ink-600'}`}>
          Kitoblar
        </button>
        <button onClick={() => setTab('sales')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab==='sales' ? 'bg-white shadow-soft text-brand-700' : 'text-ink-600'}`}>
          Sotuvlar
        </button>
        <button onClick={() => setTab('unpaid')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab==='unpaid' ? 'bg-white shadow-soft text-brand-700' : 'text-ink-600'}`}>
          To'lanmagan
        </button>
      </div>
      {tab === 'books' && <BooksTab />}
      {tab === 'sales' && <SalesTab type="all" />}
      {tab === 'unpaid' && <SalesTab type="unpaid" />}
    </div>
  )
}

function BooksTab() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [edit, setEdit] = useState(null)
  const [sell, setSell] = useState(null)

  const { data } = useQuery({
    queryKey: ['books', q],
    queryFn: () => api.get('/library/books/', { params: q ? { search: q } : {} }).then(r => r.data),
  })
  const books = data?.results || data || []

  const delMut = useMutation({
    mutationFn: (id) => api.delete(`/library/books/${id}/`),
    onSuccess: () => { toast.success("O'chirildi"); qc.invalidateQueries({ queryKey: ['books'] }) },
    onError: (e) => toast.error(fmtErr(e.response?.data)),
  })

  return (
    <div>
      <div className="card mb-5 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Kitob nomi, muallif yoki ISBN..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Yangi kitob</button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {books.length === 0 && (
          <div className="card col-span-full text-center py-10 text-ink-500">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" /> Kitoblar yo'q
          </div>
        )}
        {books.map(b => (
          <div key={b.id} className="card hover:shadow-lift transition flex flex-col">
            <div className="flex gap-3">
              <div className="w-14 h-20 bg-brand-50 grid place-items-center rounded shrink-0">
                <BookOpen className="w-6 h-6 text-brand-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-display font-bold text-sm leading-tight line-clamp-2">{b.title}</h4>
                {b.author && <div className="text-xs text-ink-500 mt-0.5 line-clamp-1">{b.author}</div>}
                <div className="text-xs text-ink-500 mt-1">{b.language_display}{b.category ? ` · ${b.category}` : ''}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-ink-100 flex items-end justify-between">
              <div className="text-xs">
                <div className="font-semibold text-ink-800 text-sm">{formatMoney(b.price)}</div>
                <div className="text-ink-500 mt-0.5">
                  Qoldiq: <span className={b.stock > 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>{b.stock}</span>
                  {b.sold_count > 0 && <span className="ml-2">· Sotilgan: {b.sold_count}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setSell(b)}
                  className="p-1.5 hover:bg-brand-50 text-brand-600 rounded" title="Sotish">
                  <ShoppingCart className="w-4 h-4" />
                </button>
                <button onClick={() => setEdit(b)} className="p-1.5 hover:bg-ink-100 text-ink-600 rounded">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => { if (confirm("Kitobni o'chirish?")) delMut.mutate(b.id) }}
                  className="p-1.5 hover:bg-rose-50 text-rose-600 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <BookFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {edit && <BookFormModal open={true} onClose={() => setEdit(null)} book={edit} />}
      {sell && <SellModal book={sell} onClose={() => setSell(null)} />}
    </div>
  )
}

function BookFormModal({ open, onClose, book }) {
  const qc = useQueryClient()
  const [f, setF] = useState(() => book ? {
    title: book.title || '',
    author: book.author || '',
    language: book.language || 'en',
    category: book.category || '',
    isbn: book.isbn || '',
    price: book.price || 0,
    stock: book.stock || 0,
    shelf_location: book.shelf_location || '',
    description: book.description || '',
  } : {
    title: '', author: '', language: 'en', category: '', isbn: '',
    price: 0, stock: 0, shelf_location: '', description: '',
  })

  const mut = useMutation({
    mutationFn: () => {
      const body = { ...f }
      return book ? api.patch(`/library/books/${book.id}/`, body) : api.post('/library/books/', body)
    },
    onSuccess: () => { toast.success('Saqlandi'); qc.invalidateQueries({ queryKey: ['books'] }); onClose() },
    onError: (e) => toast.error(fmtErr(e.response?.data)),
  })

  return (
    <Modal open={open} onClose={onClose} title={book ? 'Kitobni tahrirlash' : 'Yangi kitob'} size="md">
      <div className="space-y-3">
        <div>
          <label className="label">Kitob nomi *</label>
          <input className="input" autoFocus value={f.title} onChange={(e) => setF({...f, title: e.target.value})} placeholder="English File Elementary" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Muallif</label>
            <input className="input" value={f.author} onChange={(e) => setF({...f, author: e.target.value})} />
          </div>
          <div>
            <label className="label">Til</label>
            <select className="input" value={f.language} onChange={(e) => setF({...f, language: e.target.value})}>
              {LANGS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Kategoriya</label>
            <input className="input" value={f.category} onChange={(e) => setF({...f, category: e.target.value})} placeholder="Coursebook" />
          </div>
          <div>
            <label className="label">ISBN</label>
            <input className="input" value={f.isbn} onChange={(e) => setF({...f, isbn: e.target.value})} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Narxi (so'm)</label>
            <input type="number" min="0" className="input" value={f.price}
              onChange={(e) => setF({...f, price: e.target.value})} />
          </div>
          <div>
            <label className="label">Omborda (nusxa)</label>
            <input type="number" min="0" className="input" value={f.stock}
              onChange={(e) => setF({...f, stock: parseInt(e.target.value) || 0})} />
          </div>
        </div>
        <div>
          <label className="label">Javon</label>
          <input className="input" value={f.shelf_location} onChange={(e) => setF({...f, shelf_location: e.target.value})} placeholder="A-3-12" />
        </div>
        <div>
          <label className="label">Tavsif</label>
          <textarea className="input min-h-[60px]" value={f.description} onChange={(e) => setF({...f, description: e.target.value})} />
        </div>
        <button onClick={() => mut.mutate()} disabled={!f.title || mut.isPending} className="btn-primary w-full">
          {mut.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </div>
    </Modal>
  )
}

function SellModal({ book, onClose }) {
  const qc = useQueryClient()
  const [studentId, setStudentId] = useState(null)
  const [price, setPrice] = useState(book.price || 0)
  const [paid, setPaid] = useState(false)
  const [note, setNote] = useState('')

  const { data: students } = useQuery({
    queryKey: ['students-active'],
    queryFn: () => api.get('/students/', { params: { status: 'active' } }).then(r => r.data),
  })

  const mut = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/library/sales/', {
        book: book.id, student: studentId, price, note,
      })
      if (paid && !data.paid) {
        await api.post(`/library/sales/${data.id}/mark_paid/`)
      }
      return data
    },
    onSuccess: () => { toast.success('Sotildi'); qc.invalidateQueries(); onClose() },
    onError: (e) => toast.error(fmtErr(e.response?.data)),
  })

  return (
    <Modal open={true} onClose={onClose} title={`"${book.title}" ni sotish`} size="md">
      <div className="space-y-3">
        <div className="p-3 bg-brand-50 rounded-lg text-sm flex justify-between">
          <span>Narxi: <b>{formatMoney(book.price)}</b></span>
          <span>Omborda: <b className={book.stock > 0 ? 'text-emerald-600' : 'text-rose-600'}>{book.stock}</b></span>
        </div>
        <div>
          <label className="label">O'quvchi *</label>
          <Combobox value={studentId} onChange={setStudentId}
            options={(students?.results || []).map(s => ({ value: s.id, label: `${s.full_name} (+${s.phone})` }))}
            placeholder="O'quvchini tanlang..." />
        </div>
        <div>
          <label className="label">Sotuv narxi (so'm)</label>
          <input type="number" min="0" className="input" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 select-none cursor-pointer">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="w-4 h-4" />
          <span className="text-sm">Pul to'langan</span>
        </label>
        <div>
          <label className="label">Izoh</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button onClick={() => mut.mutate()} disabled={!studentId || mut.isPending} className="btn-primary w-full">
          {mut.isPending ? 'Saqlanmoqda...' : 'Sotish'}
        </button>
      </div>
    </Modal>
  )
}

function SalesTab({ type }) {
  const qc = useQueryClient()
  const url = type === 'unpaid' ? '/library/sales/unpaid/' : '/library/sales/'
  const { data } = useQuery({
    queryKey: ['book-sales', type],
    queryFn: () => api.get(url).then(r => r.data),
  })
  const sales = Array.isArray(data) ? data : (data?.results || [])

  const payMut = useMutation({
    mutationFn: (id) => api.post(`/library/sales/${id}/mark_paid/`),
    onSuccess: () => { toast.success("To'langan deb belgilandi"); qc.invalidateQueries() },
    onError: (e) => toast.error(fmtErr(e.response?.data)),
  })
  const unpayMut = useMutation({
    mutationFn: (id) => api.post(`/library/sales/${id}/mark_unpaid/`),
    onSuccess: () => { toast.success("To'lanmagan deb belgilandi"); qc.invalidateQueries() },
  })
  const delMut = useMutation({
    mutationFn: (id) => api.delete(`/library/sales/${id}/`),
    onSuccess: () => { toast.success("O'chirildi"); qc.invalidateQueries() },
  })

  const totalRevenue = sales.filter(s => s.paid).reduce((acc, s) => acc + Number(s.price || 0), 0)
  const totalDebt = sales.filter(s => !s.paid).reduce((acc, s) => acc + Number(s.price || 0), 0)

  return (
    <div>
      {type === 'unpaid' && sales.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4 flex gap-2 items-start">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            {sales.length} ta sotuv to'lanmagan · jami qarz: <b>{formatMoney(totalDebt)}</b>
          </div>
        </div>
      )}
      {type === 'all' && sales.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 grid place-items-center rounded-lg"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
            <div><div className="text-xs text-ink-500">To'langan</div><div className="font-bold text-emerald-700">{formatMoney(totalRevenue)}</div></div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 grid place-items-center rounded-lg"><AlertCircle className="w-5 h-5 text-rose-600" /></div>
            <div><div className="text-xs text-ink-500">Qarz</div><div className="font-bold text-rose-700">{formatMoney(totalDebt)}</div></div>
          </div>
        </div>
      )}
      <div className="card p-0">
        <table className="table-clean">
          <thead><tr><th>Kitob</th><th>O'quvchi</th><th>Sana</th><th>Narx</th><th>Holat</th><th></th></tr></thead>
          <tbody>
            {sales.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-ink-500">Yozuv yo'q</td></tr>}
            {sales.map(s => (
              <tr key={s.id}>
                <td className="font-medium">{s.book_title}{s.book_author && <div className="text-xs text-ink-500">{s.book_author}</div>}</td>
                <td>{s.student_name}<div className="text-xs text-ink-500">+{s.student_phone}</div></td>
                <td className="text-xs">{formatDateTime(s.sold_at)}</td>
                <td className="font-medium">{formatMoney(s.price)}</td>
                <td>
                  {s.paid
                    ? <span className="badge-success">To'langan</span>
                    : <span className="badge-warning">To'lanmagan</span>}
                </td>
                <td className="text-right whitespace-nowrap">
                  {s.paid
                    ? <button onClick={() => unpayMut.mutate(s.id)} className="btn-outline py-1 px-2 text-xs mr-1">Bekor</button>
                    : <button onClick={() => payMut.mutate(s.id)} className="btn-primary py-1 px-2 text-xs mr-1">To'landi</button>}
                  <button onClick={() => { if (confirm("O'chirish?")) delMut.mutate(s.id) }}
                    className="p-1.5 hover:bg-rose-50 text-rose-600 rounded inline-flex align-middle"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
