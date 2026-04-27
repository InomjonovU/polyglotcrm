export default function Logo({ size = 40, withText = true, compact = false }) {
  if (compact) { size = 32; withText = false }
  return (
    <div className="flex items-center gap-2.5">
      <div
        style={{ width: size, height: size }}
        className="relative grid place-items-center"
      >
        <svg viewBox="0 0 40 40" className="w-full h-full">
          <defs>
            <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="36" height="36" rx="11" fill="url(#pg)" />
          <path
            d="M13 27 V13 H20 a5 5 0 0 1 0 10 H15"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="28" cy="15" r="2.2" fill="white" />
        </svg>
      </div>
      {withText && (
        <div className="leading-tight">
          <div className="font-display font-bold text-[17px] tracking-tight text-ink-900">
            Polyglot<span className="text-brand-600">LC</span>
          </div>
          <div className="text-[10px] font-medium text-ink-500 uppercase tracking-widest -mt-0.5">
            Language Center
          </div>
        </div>
      )}
    </div>
  )
}
