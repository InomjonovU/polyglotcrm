import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import Combobox from '../../components/Combobox'
import Pagination from '../../components/Pagination'
import { formatDate, MONTHS_UZ } from '../../utils/format'

export default function StudentAttendance() {
  const now = new Date()
  const [statusF, setStatusF] = useState('')
  const [year, setYear] = useState('')   // '' = barcha
  const [month, setMonth] = useState('') // '' = barcha
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  // Statistika uchun barcha yozuvlar (filtersiz)
  const { data: allData } = useQuery({
    queryKey: ['my-att-all'],
    queryFn: () => api.get('/attendance/', { params: { page_size: 200 } }).then(r => r.data),
  })

  // Filtrlangan ro'yxat
  const allRows = allData?.results || []

  const filtered = useMemo(() => {
    let list = allRows
    if (statusF) list = list.filter(r => r.status === statusF)
    if (year) list = list.filter(r => r.date?.startsWith(String(year)))
    if (month) {
      const m = String(month).padStart(2, '0')
      list = list.filter(r => r.date?.slice(5, 7) === m)
    }
    return list
  }, [allRows, statusF, year, month])

  useEffect(() => { setPage(1) }, [statusF, year, month])

  const total = filtered.length
  const slice = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  // Statistika — filterga ko'ra
  const present = filtered.filter(r => r.status === 'present').length
  const late = filtered.filter(r => r.status === 'late').length
  const absent = filtered.filter(r => r.status === 'absent').length
  const percent = total ? Math.round(((present + late) / total) * 100) : 0

  // Yillarni yozuvlardan chiqaramiz
  const years = useMemo(() => {
    const ys = new Set(allRows.map(r => r.date?.slice(0, 4)).filter(Boolean))
    return Array.from(ys).sort().reverse()
  }, [allRows])

  return (
    <div>
      <PageHeader title="Davomatim" />

      <div className="card mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-lg">Statistika</h3>
          <div className="text-right">
            <div className="font-display text-4xl font-bold text-brand-600">{percent}%</div>
            <div className="text-xs text-ink-500">davomat</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-emerald-50 rounded-xl text-center">
            <div className="text-2xl font-bold text-emerald-700">{present}</div>
            <div className="text-xs text-emerald-600">Keldi</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-center">
            <div className="text-2xl font-bold text-amber-700">{late}</div>
            <div className="text-xs text-amber-600">Kech</div>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-center">
            <div className="text-2xl font-bold text-rose-700">{absent}</div>
            <div className="text-xs text-rose-600">Kelmadi</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-display font-semibold text-lg">Kunlik tarix</h3>
        </div>

        {/* Filterlar */}
        <div className="grid sm:grid-cols-3 gap-2 mb-4">
          <Combobox
            value={statusF} onChange={setStatusF}
            placeholder="Barcha holatlar"
            searchable={false}
            options={[
              { value: 'present', label: 'Keldi' },
              { value: 'late', label: 'Kech qoldi' },
              { value: 'absent', label: 'Kelmadi' },
            ]}
          />
          <Combobox
            value={year} onChange={setYear}
            placeholder="Barcha yillar"
            searchable={false}
            options={years.map(y => ({ value: y, label: y }))}
          />
          <Combobox
            value={month} onChange={setMonth}
            placeholder="Barcha oylar"
            searchable={false}
            options={MONTHS_UZ.map((m, i) => ({ value: i + 1, label: m }))}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead><tr><th>Sana</th><th>Holat</th></tr></thead>
            <tbody>
              {total === 0 && (
                <tr><td colSpan={2} className="text-center py-8 text-ink-500">Yozuvlar topilmadi</td></tr>
              )}
              {slice.map(r => (
                <tr key={r.id}>
                  <td>{formatDate(r.date)}</td>
                  <td>
                    <span className={
                      r.status === 'present' ? 'badge-success'
                      : r.status === 'late' ? 'badge-warning'
                      : 'badge-danger'
                    }>{r.status_display}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onChange={setPage}
        />
      </div>
    </div>
  )
}
