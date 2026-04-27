import { useState } from 'react'
import toast from 'react-hot-toast'
import { formatMoney, formatDateTime, MONTHS_UZ } from '../utils/format'

/**
 * PaymentReceipt — qora-oq, qog'ozga chiqaradigan kichik chek.
 * Hech qanday ikon yoki rang yo'q — toza tipografiya.
 *
 * Backenddan keladi:
 *   receipt_code, student_name, amount, method, method_display,
 *   paid_at, year, month, group_name, received_by_name, note, center_name
 */
export default function PaymentReceipt({ data, showPrint = true }) {
  const [copied, setCopied] = useState(false)
  if (!data) return null

  function copyCode() {
    navigator.clipboard.writeText(data.receipt_code)
    setCopied(true)
    toast.success('Kod nusxalandi')
    setTimeout(() => setCopied(false), 1500)
  }

  const monthLabel = data.month ? `${MONTHS_UZ[(data.month - 1) % 12]} ${data.year}` : null
  const center = data.center_name || 'PolyglotLC'

  return (
    <div className="receipt-paper mx-auto max-w-[360px] bg-white text-black border border-black/80 font-mono text-[12px] leading-[1.55] p-5 print:border-0 print:shadow-none print:max-w-none">
      {/* Logo / brand — toza tipografiya */}
      <div className="text-center pb-3 mb-3 border-b border-dashed border-black/60">
        <div className="font-display font-extrabold text-[18px] tracking-[0.18em] uppercase">
          {center}
        </div>
        <div className="text-[10px] tracking-[0.2em] uppercase mt-0.5 text-black/70">
          Til o'rganish markazi
        </div>
      </div>

      {/* Sarlavha */}
      <div className="text-center mb-3">
        <div className="text-[10px] uppercase tracking-[0.25em] text-black/60">To'lov cheki</div>
        <div className="text-[11px] mt-0.5">{formatDateTime(data.paid_at)}</div>
      </div>

      {/* Ma'lumot qatorlari — punktirli ajratuvchi */}
      <Sep />
      <Row label="O'quvchi" value={data.student_name} />
      {data.group_name && <Row label="Guruh" value={data.group_name} />}
      {monthLabel && <Row label="Oy" value={monthLabel} />}
      <Row label="To'lov turi" value={data.method_display} />
      {data.received_by_name && <Row label="Qabul qildi" value={data.received_by_name} />}
      <Sep />

      {/* Summa — diqqatda, lekin rangsiz */}
      <div className="flex items-baseline justify-between py-2">
        <span className="text-[11px] uppercase tracking-wider">Jami</span>
        <span className="font-display font-extrabold text-[20px]">
          {formatMoney(data.amount)}
        </span>
      </div>
      <Sep />

      {/* Chek kodi */}
      <button
        onClick={copyCode}
        type="button"
        className="w-full mt-3 py-2 border border-black/80 hover:bg-black hover:text-white transition print:hover:bg-transparent print:hover:text-black"
        title="Nusxa olish"
      >
        <div className="text-[9px] uppercase tracking-[0.3em]">Chek kodi</div>
        <div className="font-mono font-bold text-[18px] tracking-[0.4em] mt-0.5">
          {data.receipt_code}
        </div>
        <div className="text-[9px] uppercase tracking-widest mt-0.5 opacity-60">
          {copied ? 'Nusxalandi' : 'Bosib nusxalang'}
        </div>
      </button>

      {/* Izoh */}
      {data.note && (
        <div className="mt-3 pt-3 border-t border-dashed border-black/60">
          <div className="text-[9px] uppercase tracking-widest text-black/60">Izoh</div>
          <div className="text-[11px] mt-0.5">{data.note}</div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-dashed border-black/60 text-center">
        <div className="text-[10px]">Chekni saqlab qo'ying</div>
        <div className="text-[9px] mt-1 tracking-[0.25em] uppercase text-black/70">
          Rahmat — {center}
        </div>
      </div>

      {/* Chop etish tugmasi (faqat ekranda ko'rinadi) */}
      {showPrint && (
        <button
          onClick={() => window.print()}
          className="mt-4 w-full py-1.5 text-[11px] uppercase tracking-[0.25em] border border-black/40 hover:bg-black hover:text-white transition print:hidden"
        >
          Chop etish
        </button>
      )}
    </div>
  )
}

function Sep() {
  return (
    <div
      className="border-t border-dashed border-black/60 my-1.5"
      aria-hidden="true"
    />
  )
}

function Row({ label, value }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[10px] uppercase tracking-wider text-black/70 shrink-0">{label}</span>
      <span className="text-[11px] text-right font-semibold break-words">{value}</span>
    </div>
  )
}
