import { useState, useRef, useEffect, useMemo } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import clsx from 'clsx'

/**
 * Searchable dropdown replacement for <select>.
 * Props:
 *   value, onChange
 *   options: [{ value, label, hint? }]
 *   placeholder
 *   searchable (default true)
 *   clearable (default true)
 *   disabled
 */
export default function Combobox({
  value,
  onChange,
  options = [],
  placeholder = 'Tanlang...',
  searchable = true,
  clearable = true,
  disabled = false,
  className,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const inputRef = useRef(null)

  const selected = useMemo(() => options.find(o => String(o.value) === String(value)), [options, value])

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter(o => String(o.label).toLowerCase().includes(q) || String(o.hint || '').toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (open && searchable) setTimeout(() => inputRef.current?.focus(), 30)
    if (!open) setQuery('')
  }, [open, searchable])

  return (
    <div ref={rootRef} className={clsx('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={clsx(
          'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 border rounded-xl bg-white text-sm transition-all',
          disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-brand-300',
          open ? 'border-brand-500 ring-2 ring-brand-100' : 'border-ink-200',
        )}
      >
        <span className={clsx('truncate text-left flex-1', !selected && 'text-ink-400')}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {clearable && selected && !disabled && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="p-0.5 hover:bg-ink-100 rounded"
            >
              <X className="w-3.5 h-3.5 text-ink-500" />
            </span>
          )}
          <ChevronDown className={clsx('w-4 h-4 text-ink-500 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="absolute z-40 mt-1.5 w-full bg-white border border-ink-200 rounded-xl shadow-lift overflow-hidden animate-fade-in">
          {searchable && (
            <div className="relative border-b border-ink-100">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Qidirish..."
                className="w-full pl-9 pr-3 py-2.5 text-sm outline-none"
              />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-ink-400">Topilmadi</div>
            )}
            {filtered.map(opt => {
              const isSelected = String(opt.value) === String(value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={clsx(
                    'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-brand-50 transition',
                    isSelected && 'bg-brand-50',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className={clsx('truncate', isSelected && 'font-semibold text-brand-700')}>{opt.label}</div>
                    {opt.hint && <div className="text-[11px] text-ink-500 truncate">{opt.hint}</div>}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
