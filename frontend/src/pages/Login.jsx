import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, BookOpen, Users, ArrowLeft, Sparkles, Briefcase } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import Logo from '../components/Logo'
import PhoneInput from '../components/PhoneInput'

// Boshlang'ich: 2 ta asosiy tanlov
const TOP_CHOICES = [
  {
    key: 'staff',
    title: 'Xodim',
    subtitle: 'Admin yoki o\'qituvchi',
    icon: Briefcase,
  },
  {
    key: 'client',
    title: "O'quvchi yoki Ota-ona",
    subtitle: 'Shaxsiy kabinet',
    icon: Users,
  },
]

// Xodim ichki tanlovi
const STAFF_ROLES = [
  { key: 'admin',   title: 'Admin',      icon: ShieldCheck, hint: 'Username va parol' },
  { key: 'teacher', title: "O'qituvchi", icon: BookOpen,    hint: 'Telefon va parol' },
]

export default function Login() {
  const [step, setStep] = useState('top') // top | staff | admin | teacher | client
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function submitStaff(e, roleKey) {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(roleKey, identifier, password)
      toast.success(`Xush kelibsiz, ${user.first_name || user.username}!`)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login yoki parol noto'g'ri")
    } finally {
      setLoading(false)
    }
  }

  async function submitClient(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login-client/', { identifier, password })
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      toast.success(`Xush kelibsiz, ${data.user.first_name || data.user.username}!`)
      // AuthContext'ni yangilashi uchun to'liq qayta yuklash
      window.location.href = '/'
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login yoki parol noto'g'ri")
    } finally {
      setLoading(false)
    }
  }

  function goBack() {
    if (step === 'staff' || step === 'client') setStep('top')
    else if (step === 'admin' || step === 'teacher') setStep('staff')
    setIdentifier('')
    setPassword('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-brand-50/40 to-brand-100/60 relative overflow-hidden">
      <div className="absolute top-0 -left-24 w-96 h-96 bg-brand-200/40 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-brand-300/30 rounded-full blur-3xl" />

      <div className="relative min-h-screen flex flex-col">
        <header className="px-8 py-6">
          <Logo />
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-3xl">
            {step === 'top' && (
              <div className="animate-slide-up">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/60 backdrop-blur border border-brand-100 rounded-full text-xs text-brand-700 mb-4">
                    <Sparkles className="w-3.5 h-3.5" />
                    O'quv markaz boshqaruvi
                  </div>
                  <h1 className="font-display text-4xl md:text-5xl font-bold text-ink-900 tracking-tight">
                    Tizimga kirish
                  </h1>
                  <p className="mt-3 text-ink-500">Kim sifatida kirishni tanlang</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
                  {TOP_CHOICES.map((r) => {
                    const Icon = r.icon
                    return (
                      <button
                        key={r.key}
                        onClick={() => setStep(r.key)}
                        className="group relative overflow-hidden bg-white rounded-3xl p-7 border border-ink-100 shadow-soft hover:shadow-lift hover:-translate-y-1 transition-all text-left"
                      >
                        <div className="absolute -top-8 -right-8 w-40 h-40 bg-brand-50 rounded-full opacity-60 group-hover:scale-150 transition-transform duration-500" />
                        <div className="relative">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center shadow-lift mb-5">
                            <Icon className="w-8 h-8 text-white" strokeWidth={2} />
                          </div>
                          <h3 className="font-display text-2xl font-bold text-ink-900">{r.title}</h3>
                          <p className="text-sm text-ink-500 mt-1">{r.subtitle}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="text-center mt-10">
                  <a href="/chek" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                    Chekni tekshirish →
                  </a>
                </div>
              </div>
            )}

            {step === 'staff' && (
              <div className="max-w-xl mx-auto animate-slide-up">
                <button onClick={goBack} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600 mb-6">
                  <ArrowLeft className="w-4 h-4" /> Orqaga
                </button>
                <div className="text-center mb-6">
                  <h2 className="font-display text-3xl font-bold">Xodim sifatida kirish</h2>
                  <p className="text-sm text-ink-500 mt-2">Lavozimingizni tanlang</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {STAFF_ROLES.map(r => {
                    const Icon = r.icon
                    return (
                      <button
                        key={r.key}
                        onClick={() => setStep(r.key)}
                        className="group relative overflow-hidden bg-white rounded-3xl p-6 border border-ink-100 shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all text-left"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center mb-4">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-display text-xl font-semibold">{r.title}</h3>
                        <p className="text-xs text-ink-500 mt-0.5">{r.hint}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {(step === 'admin' || step === 'teacher') && (
              <div className="max-w-md mx-auto animate-slide-up">
                <button onClick={goBack} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600 mb-6">
                  <ArrowLeft className="w-4 h-4" /> Orqaga
                </button>
                <div className="bg-white rounded-3xl border border-ink-100 shadow-soft p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center">
                      {step === 'admin'
                        ? <ShieldCheck className="w-6 h-6 text-white" />
                        : <BookOpen className="w-6 h-6 text-white" />}
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-xl">
                        {step === 'admin' ? 'Admin kirish' : "O'qituvchi kirish"}
                      </h2>
                      <p className="text-xs text-ink-500">
                        {step === 'admin' ? 'Username va parol' : 'Telefon raqam va parol'}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={(e) => submitStaff(e, step)} className="space-y-4">
                    <div>
                      <label className="label">{step === 'admin' ? 'Username' : 'Telefon raqam'}</label>
                      {step === 'admin' ? (
                        <input type="text" autoFocus className="input"
                          value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="admin" required />
                      ) : (
                        <PhoneInput autoFocus value={identifier} onChange={setIdentifier} required />
                      )}
                    </div>
                    <div>
                      <label className="label">Parol</label>
                      <input type="password" className="input"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••" required />
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
                      {loading ? 'Kirilmoqda...' : 'Kirish'}
                    </button>
                    <p className="text-center text-xs text-ink-500 pt-4 border-t border-ink-100">
                      Parolni unutdingizmi? <span className="text-brand-600">Administrator bilan bog'laning</span>
                    </p>
                  </form>
                </div>
              </div>
            )}

            {step === 'client' && (
              <div className="max-w-md mx-auto animate-slide-up">
                <button onClick={goBack} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600 mb-6">
                  <ArrowLeft className="w-4 h-4" /> Orqaga
                </button>
                <div className="bg-white rounded-3xl border border-ink-100 shadow-soft p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-xl">Shaxsiy kabinet</h2>
                      <p className="text-xs text-ink-500">O'quvchi yoki ota-ona</p>
                    </div>
                  </div>

                  <form onSubmit={submitClient} className="space-y-4">
                    <div>
                      <label className="label">Telefon raqam</label>
                      <PhoneInput autoFocus value={identifier} onChange={setIdentifier} required />
                    </div>
                    <div>
                      <label className="label">Parol</label>
                      <input type="password" className="input"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••" required />
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
                      {loading ? 'Kirilmoqda...' : 'Kirish'}
                    </button>
                    <p className="text-center text-xs text-ink-500 pt-4 border-t border-ink-100">
                      Parolni unutdingizmi? <span className="text-brand-600">Administrator bilan bog'laning</span>
                    </p>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="text-center py-6 text-xs text-ink-500">
          © {new Date().getFullYear()} PolyglotLC · Barcha huquqlar himoyalangan
        </footer>
      </div>
    </div>
  )
}
