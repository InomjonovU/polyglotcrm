import clsx from 'clsx'

export default function StatCard({ icon: Icon, label, value, hint, tone = 'brand' }) {
  const tones = {
    brand: 'from-brand-500 to-brand-700',
    emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-700',
  }
  return (
    <div className="card hover:shadow-lift transition-all animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-ink-500">{label}</div>
          <div className="mt-2 font-display text-3xl font-bold text-ink-900">{value}</div>
          {hint && <div className="mt-1 text-xs text-ink-500">{hint}</div>}
        </div>
        {Icon && (
          <div className={clsx('w-11 h-11 rounded-xl grid place-items-center text-white bg-gradient-to-br', tones[tone])}>
            <Icon className="w-5 h-5" strokeWidth={2.2} />
          </div>
        )}
      </div>
    </div>
  )
}
