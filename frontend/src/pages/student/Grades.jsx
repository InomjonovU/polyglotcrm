import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import { formatDate } from '../../utils/format'

export default function StudentGrades() {
  const { data } = useQuery({
    queryKey: ['my-grades'],
    queryFn: () => api.get('/grades/').then(r => r.data),
  })

  const rows = data?.results || []
  const avg = rows.length ? (rows.reduce((s, r) => s + r.value, 0) / rows.length).toFixed(2) : '—'
  const chart = rows.slice().reverse().slice(-20).map(r => ({ date: formatDate(r.date).slice(0, 5), value: r.value }))

  return (
    <div>
      <PageHeader title="Baholarim" />

      <div className="grid md:grid-cols-3 gap-5 mb-6">
        <div className="card"><div className="text-sm text-ink-500">O'rtacha baho</div><div className="font-display text-4xl font-bold mt-2 text-brand-600">{avg}</div></div>
        <div className="card md:col-span-2">
          <div className="text-sm text-ink-500 mb-2">Baho dinamikasi</div>
          {chart.length > 0 && (
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" fontSize={10} />
                <YAxis domain={[0, 10]} fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="font-display font-semibold text-lg mb-4">Barcha baholar</h3>
        <table className="table-clean">
          <thead><tr><th>Sana</th><th>Tur</th><th>Sarlavha</th><th>Baho</th><th>Izoh</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-ink-500">Baholar yo'q</td></tr>}
            {rows.map(r => (
              <tr key={r.id}>
                <td>{formatDate(r.date)}</td>
                <td>{r.type_display}</td>
                <td>{r.title || '—'}</td>
                <td><span className="font-display text-xl font-bold text-brand-600">{r.value}</span><span className="text-ink-300 text-xs">/10</span></td>
                <td className="text-ink-500">{r.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
