import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Download, Users, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import { formatMoney, MONTHS_UZ } from '../../utils/format'

async function downloadXlsx(url, params, fallbackName) {
  try {
    const res = await api.get(url, { params, responseType: 'blob' })
    const cd = res.headers['content-disposition'] || ''
    const m = cd.match(/filename="?([^"]+)"?/)
    const name = m ? m[1] : fallbackName
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = name
    document.body.appendChild(link)
    link.click()
    setTimeout(() => {
      URL.revokeObjectURL(link.href)
      link.remove()
    }, 100)
  } catch (e) {
    toast.error("Yuklab olishda xatolik")
  }
}

export default function AdminReports() {
  const [tab, setTab] = useState('financial')
  const year = new Date().getFullYear()
  const [busy, setBusy] = useState('')
  const [payFrom, setPayFrom] = useState('')
  const [payTo, setPayTo] = useState('')

  async function handleExport(kind) {
    setBusy(kind)
    try {
      if (kind === 'students') {
        await downloadXlsx('/reports/export/students/', {}, 'oquvchilar.xlsx')
        toast.success("O'quvchilar ro'yxati yuklab olindi")
      } else if (kind === 'payments') {
        await downloadXlsx('/reports/export/payments/', {
          date_from: payFrom || undefined,
          date_to: payTo || undefined,
        }, 'tolovlar.xlsx')
        toast.success("To'lovlar tarixi yuklab olindi")
      }
    } finally {
      setBusy('')
    }
  }

  const { data: financial } = useQuery({ queryKey: ['rep-fin', year], queryFn: () => api.get('/reports/financial/', { params: { year } }).then(r => r.data) })
  const { data: teachers } = useQuery({ queryKey: ['rep-t'], queryFn: () => api.get('/reports/teachers/').then(r => r.data) })
  const { data: dynamics } = useQuery({ queryKey: ['rep-d', year], queryFn: () => api.get('/reports/students-dynamics/', { params: { year } }).then(r => r.data) })

  const finData = financial?.monthly?.map(m => ({ ...m, name: MONTHS_UZ[m.month - 1] })) || []
  const dynData = dynamics?.monthly?.map(m => ({ ...m, name: MONTHS_UZ[m.month - 1] })) || []

  return (
    <div>
      <PageHeader title="Hisobotlar" subtitle={`Yil: ${year}`} />

      <div className="flex gap-1 p-1 bg-ink-100 rounded-xl w-fit mb-6 flex-wrap">
        {[
          ['financial', 'Moliyaviy'],
          ['teachers', "O'qituvchilar"],
          ['students', "O'quvchilar dinamikasi"],
          ['export', 'Eksport'],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === k ? 'bg-white shadow-soft text-ink-900' : 'text-ink-500 hover:text-ink-900'}`}
          >{label}</button>
        ))}
      </div>

      {tab === 'financial' && (
        <div className="card">
          <h3 className="font-display font-semibold text-lg mb-5">Oyma-oy moliyaviy dinamika</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={finData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Legend />
              <Bar dataKey="charged" fill="#93C5FD" name="Hisoblangan" radius={[6, 6, 0, 0]} />
              <Bar dataKey="paid" fill="#2563EB" name="Tushgan" radius={[6, 6, 0, 0]} />
              <Bar dataKey="salary" fill="#F59E0B" name="Maosh" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <table className="table-clean mt-6">
            <thead><tr><th>Oy</th><th>Hisoblangan</th><th>Tushgan</th><th>Maosh</th><th>Sof daromad</th></tr></thead>
            <tbody>
              {finData.map(r => (
                <tr key={r.month}>
                  <td>{r.name}</td>
                  <td>{formatMoney(r.charged)}</td>
                  <td>{formatMoney(r.paid)}</td>
                  <td className="text-amber-600">{formatMoney(r.salary)}</td>
                  <td className="font-semibold text-emerald-600">{formatMoney(r.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'teachers' && (
        <div className="card">
          <h3 className="font-display font-semibold text-lg mb-5">O'qituvchi samaradorligi</h3>
          <table className="table-clean">
            <thead><tr><th>O'qituvchi</th><th>Guruhlar</th><th>Davomat yozuvlari</th><th>O'rtacha davomat</th><th>O'rtacha baho</th></tr></thead>
            <tbody>
              {teachers?.map(t => (
                <tr key={t.id}>
                  <td className="font-medium">{t.name}</td>
                  <td>{t.groups_count}</td>
                  <td>{t.attendance_entries}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-ink-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-600" style={{ width: `${t.avg_attendance_percent}%` }} />
                      </div>
                      <span>{t.avg_attendance_percent}%</span>
                    </div>
                  </td>
                  <td className="font-semibold text-brand-600">{t.avg_grade ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'export' && (
        <div className="grid md:grid-cols-2 gap-5">
          {/* O'quvchilar eksport */}
          <div className="card">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-brand-50 grid place-items-center">
                <Users className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg leading-tight">O'quvchilar ro'yxati</h3>
                <p className="text-xs text-ink-500 mt-1">
                  Barcha o'quvchilar — ism, telefon, holat, guruh(lar), chegirma, ota-ona, taklif manbai, izoh va boshqalar
                </p>
              </div>
            </div>
            <button
              onClick={() => handleExport('students')}
              disabled={busy === 'students'}
              className="btn-primary w-full"
            >
              <Download className="w-4 h-4" />
              {busy === 'students' ? 'Tayyorlanmoqda...' : 'Excel yuklab olish'}
            </button>
            <p className="text-[11px] text-ink-400 mt-2 text-center">.xlsx — Microsoft Excel formati</p>
          </div>

          {/* To'lovlar eksport */}
          <div className="card">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 grid place-items-center">
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg leading-tight">To'lovlar tarixi</h3>
                <p className="text-xs text-ink-500 mt-1">
                  Barcha to'lovlar — sana, chek kodi, o'quvchi, guruh, summa, to'lov turi, qabul qilgan xodim
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[11px] text-ink-500 uppercase tracking-wider">Boshlangan</label>
                <input type="date" className="input mt-0.5" value={payFrom} onChange={(e) => setPayFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] text-ink-500 uppercase tracking-wider">Tugagan</label>
                <input type="date" className="input mt-0.5" value={payTo} onChange={(e) => setPayTo(e.target.value)} />
              </div>
            </div>
            <button
              onClick={() => handleExport('payments')}
              disabled={busy === 'payments'}
              className="btn-primary w-full"
            >
              <Download className="w-4 h-4" />
              {busy === 'payments' ? 'Tayyorlanmoqda...' : 'Excel yuklab olish'}
            </button>
            <p className="text-[11px] text-ink-400 mt-2 text-center">
              Sana ko'rsatilmasa — barcha to'lovlar yuklanadi
            </p>
          </div>
        </div>
      )}

      {tab === 'students' && (
        <div className="space-y-5">
          <div className="card">
            <h3 className="font-display font-semibold text-lg mb-5">Yangi va ketgan o'quvchilar</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dynData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="new" stroke="#10B981" strokeWidth={2} name="Yangi" />
                <Line type="monotone" dataKey="frozen" stroke="#3B82F6" strokeWidth={2} name="Muzlatilgan" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="font-display font-semibold text-lg mb-5">Guruhlar to'ldirilganligi</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {dynamics?.groups?.map(g => (
                <div key={g.id} className="p-4 border border-ink-100 rounded-xl">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-sm text-ink-500">{g.active} / {g.capacity}</span>
                  </div>
                  <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-brand-500 to-brand-700" style={{ width: `${Math.min(g.fill_percent, 100)}%` }} />
                  </div>
                  <div className="text-xs text-ink-500 mt-1">{g.fill_percent}% band</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
