import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Search, Receipt as ReceiptIcon } from 'lucide-react'
import Logo from '../../components/Logo'

export default function ReceiptLookup() {
  const [code, setCode] = useState('')
  const navigate = useNavigate()

  function submit(e) {
    e.preventDefault()
    const c = code.trim().toUpperCase()
    if (!c) return
    navigate(`/chek/${encodeURIComponent(c)}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-brand-50/40 to-brand-100/60 relative overflow-hidden">
      <div className="absolute top-0 -left-24 w-96 h-96 bg-brand-200/40 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-brand-300/30 rounded-full blur-3xl" />

      <div className="relative min-h-screen flex flex-col">
        <header className="px-8 py-6 flex items-center justify-between">
          <Logo />
          <Link to="/login" className="text-sm text-ink-600 hover:text-brand-700">Kirish</Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-3xl border border-ink-100 shadow-soft p-8 animate-slide-up">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center">
                  <ReceiptIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-display font-bold text-xl">Chekni tekshirish</h1>
                  <p className="text-xs text-ink-500">To'lov chek kodini kiriting</p>
                </div>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="label">Chek kodi</label>
                  <input
                    type="text"
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ABC23456"
                    maxLength={12}
                    className="input text-center font-mono text-xl tracking-[0.4em] uppercase"
                  />
                </div>
                <button type="submit" disabled={!code.trim()} className="btn-primary w-full py-3">
                  <Search className="w-4 h-4" /> Tekshirish
                </button>
              </form>

              <p className="text-center text-xs text-ink-500 mt-6 pt-6 border-t border-ink-100">
                Chek kodi to'lov amalga oshirilgandan so'ng beriladi
              </p>
            </div>
          </div>
        </main>

        <footer className="text-center py-6 text-xs text-ink-500">
          © {new Date().getFullYear()} PolyglotLC
        </footer>
      </div>
    </div>
  )
}
