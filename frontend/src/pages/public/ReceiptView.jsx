import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import axios from 'axios'
import Logo from '../../components/Logo'
import PaymentReceipt from '../../components/PaymentReceipt'

const publicApi = axios.create({ baseURL: '/api' })

export default function ReceiptView() {
  const { code } = useParams()
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    publicApi.get(`/payments/lookup/${encodeURIComponent(code)}/`)
      .then(({ data }) => { setReceipt(data); setError(null) })
      .catch((err) => {
        setError(err.response?.status === 404 ? 'Bunday kodli chek topilmadi' : 'Xatolik')
      })
      .finally(() => setLoading(false))
  }, [code])

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-brand-50/40 to-brand-100/60">
      <header className="px-6 py-5 flex items-center justify-between max-w-3xl mx-auto print:hidden">
        <Logo />
        <Link to="/chek" className="text-sm text-ink-600 hover:text-brand-700 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Boshqa chek
        </Link>
      </header>

      <main className="max-w-xl mx-auto px-6 pb-20">
        {loading && <div className="card text-center py-10 text-ink-500">Yuklanmoqda...</div>}

        {error && (
          <div className="card animate-slide-up">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-rose-50 grid place-items-center shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg">{error}</h2>
                <p className="text-sm text-ink-500 mt-1">Kod: <b className="font-mono">{code}</b></p>
                <Link to="/chek" className="inline-block mt-4 text-brand-600 font-medium">← Qayta tekshirish</Link>
              </div>
            </div>
          </div>
        )}

        {receipt && <PaymentReceipt data={receipt} />}
      </main>

      <style>{`@media print { body { background: white; } }`}</style>
    </div>
  )
}
