import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Reusable pagination control for DRF PageNumberPagination responses.
 *
 * Props:
 *   page         current page number (1-based)
 *   pageSize     items per page (default 20 — DRF PAGE_SIZE)
 *   total        total item count (from `count` field)
 *   onChange     (newPage: number) => void
 *   className    optional extra wrapper classes
 */
export default function Pagination({ page, pageSize = 20, total = 0, onChange, className = '' }) {
  const pages = Math.max(1, Math.ceil((total || 0) / pageSize))
  if (total <= pageSize) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  // Compute a compact page list with ellipses
  const window = []
  const push = (v) => { if (window[window.length - 1] !== v) window.push(v) }
  push(1)
  for (let p = page - 1; p <= page + 1; p++) {
    if (p > 1 && p < pages) {
      if (p > (window[window.length - 1] || 0) + 1) push('…')
      push(p)
    }
  }
  if (pages > 1) {
    if (pages > (window[window.length - 1] || 0) + 1) push('…')
    push(pages)
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 mt-4 ${className}`}>
      <div className="text-xs text-ink-500">
        <b className="text-ink-800">{from}</b>–<b className="text-ink-800">{to}</b> / {total}
      </div>
      <div className="flex items-center gap-1">
        <button type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="w-8 h-8 grid place-items-center rounded-lg bg-ink-100 hover:bg-ink-200 text-ink-600 disabled:opacity-40 disabled:cursor-not-allowed transition">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {window.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="w-8 h-8 grid place-items-center text-ink-400 text-sm">…</span>
          ) : (
            <button type="button" key={p}
              onClick={() => onChange(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                p === page
                  ? 'bg-brand-600 text-white shadow-soft'
                  : 'bg-ink-100 hover:bg-ink-200 text-ink-700'
              }`}>
              {p}
            </button>
          )
        )}
        <button type="button"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="w-8 h-8 grid place-items-center rounded-lg bg-ink-100 hover:bg-ink-200 text-ink-600 disabled:opacity-40 disabled:cursor-not-allowed transition">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
