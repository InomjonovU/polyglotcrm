import { forwardRef } from 'react'

/**
 * PhoneInput — O'zbekiston telefon raqami uchun.
 * Saqlanadigan qiymat: "998XXXXXXXXX" (12 belgi).
 * UI: "+998" prefiksi chap tomonda statik ko'rinadi, user faqat 9 raqamni kiritadi.
 *
 * props:
 *  - value: string (e.g. "998901234567" yoki "")
 *  - onChange: (newValue: string) => void   // doim 998... formatida
 *  - placeholder, required, disabled, autoFocus, className
 */
const PhoneInput = forwardRef(function PhoneInput(
  { value = '', onChange, placeholder = '90 123 45 67', required, disabled, autoFocus, className = '' },
  ref,
) {
  // value ichidagi faqat raqamli qismni olamiz, 998 prefiksini yechamiz
  const digits = (value || '').replace(/\D/g, '')
  const withoutPrefix = digits.startsWith('998') ? digits.slice(3) : digits
  const local = withoutPrefix.slice(0, 9)  // O'z raqami 9 raqam

  // Ko'rinishini format qilish: "90 123 45 67"
  const formatted = (() => {
    const d = local
    if (d.length <= 2) return d
    if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`
    if (d.length <= 7) return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`
    return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`
  })()

  function handleChange(e) {
    const raw = (e.target.value || '').replace(/\D/g, '')
    // Agar user 998 bilan boshlab yozgan bo'lsa — prefiksni yechamiz
    let d = raw
    if (d.startsWith('998') && d.length > 9) d = d.slice(3)
    d = d.slice(0, 9)
    onChange(d ? `998${d}` : '')
  }

  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 font-medium pointer-events-none select-none text-sm">
        +998
      </div>
      <input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={formatted}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        className="input pl-[58px] tracking-wide"
        maxLength={13}
      />
    </div>
  )
})

export default PhoneInput
