import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Receipt as ReceiptIcon, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import Modal from '../../components/Modal'
import PaymentReceipt from '../../components/PaymentReceipt'
import { formatMoney, formatDateTime, MONTHS_UZ } from '../../utils/format'

export default function StudentPayments() {
  const [receipt, setReceipt] = useState(null)
  const [lookupCode, setLookupCode] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)

  const { data: charges } = useQuery({
    queryKey: ['my-charges-all'],
    queryFn: () => api.get('/payments/charges/').then(r => r.data),
  })
  const { data: payments } = useQuery({
    queryKey: ['my-payments'],
    queryFn: () => api.get('/payments/').then(r => r.data),
  })

  async function lookup(e) {
    e.preventDefault()
    const code = lookupCode.trim().toUpperCase()
    if (!code) return
    setLookupLoading(true)
    try {
      const { data } = await api.get(`/payments/lookup/${encodeURIComponent(code)}/`)
      setReceipt(data)
    } catch (err) {
      toast.error(err.response?.status === 404 ? 'Bunday kodli chek topilmadi' : 'Xatolik')
    } finally {
      setLookupLoading(false)
    }
  }

  function showReceipt(p) {
    setReceipt({
      receipt_code: p.receipt_code,
      student_name: p.student_name,
      amount: p.amount,
      method: p.method,
      method_display: p.method_display,
      paid_at: p.paid_at,
      year: p.charge_year,
      month: p.charge_month,
      group_name: p.group_name,
      received_by_name: p.received_by_name,
      note: p.note,
    })
  }

  return (
    <div>
      <PageHeader title="To'lovlarim" />

      <div className="card mb-5">
        <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-brand-600" /> Chekni tekshirish
        </h3>
        <form onSubmit={lookup} className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="label">Chek kodi</label>
            <input
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
              placeholder="ABC23456"
              maxLength={12}
              className="input font-mono tracking-wider uppercase"
            />
          </div>
          <button type="submit" disabled={!lookupCode.trim() || lookupLoading} className="btn-primary">
            {lookupLoading ? 'Qidirilmoqda...' : 'Tekshirish'}
          </button>
        </form>
      </div>

      <div className="card mb-5">
        <h3 className="font-display font-semibold text-lg mb-4">Oylik hisoblar</h3>
        <table className="table-clean">
          <thead><tr><th>Davr</th><th>Hisoblangan</th><th>To'langan</th><th>Qoldiq</th><th>Holat</th></tr></thead>
          <tbody>
            {charges?.results?.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-ink-500">Hisoblar yo'q</td></tr>}
            {charges?.results?.map(c => {
              const balance = Number(c.balance)
              const paid = Number(c.paid_total)
              return (
                <tr key={c.id}>
                  <td className="font-medium">{MONTHS_UZ[c.month - 1]} {c.year}</td>
                  <td>{formatMoney(c.amount)}</td>
                  <td>{formatMoney(paid)}</td>
                  <td className={balance > 0 ? 'text-rose-600 font-medium' : 'text-emerald-600'}>{formatMoney(balance)}</td>
                  <td>
                    {balance <= 0 ? <span className="badge-success">To'langan</span>
                      : paid > 0 ? <span className="badge-warning">Qisman</span>
                      : <span className="badge-danger">To'lanmagan</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 className="font-display font-semibold text-lg mb-4">To'lov tarixi</h3>
        <table className="table-clean">
          <thead><tr><th>Sana</th><th>Summa</th><th>Usul</th><th>Chek</th><th></th></tr></thead>
          <tbody>
            {payments?.results?.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-ink-500">To'lov yo'q</td></tr>}
            {payments?.results?.map(p => (
              <tr key={p.id}>
                <td>{formatDateTime(p.paid_at)}</td>
                <td className="font-medium">{formatMoney(p.amount)}</td>
                <td>{p.method_display}</td>
                <td className="font-mono text-xs text-brand-700">{p.receipt_code}</td>
                <td className="text-right">
                  <button onClick={() => showReceipt(p)} className="text-brand-600 hover:underline text-sm inline-flex items-center gap-1">
                    <ReceiptIcon className="w-4 h-4" /> Chekni ko'rish
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="To'lov cheki">
        {receipt && <PaymentReceipt data={receipt} />}
      </Modal>
    </div>
  )
}
