import { useRef } from 'react'
import '../styles/Quotes.css'

/**
 * DateInput - Custom themed date picker input that guarantees YYYY-MM-DD format
 * regardless of operating system or browser locale, and opens the date picker
 * when clicking anywhere on the input.
 */
export default function DateInput({
  value,
  onChange,
  min,
  max,
  disabled = false,
  placeholder = 'YYYY-MM-DD',
  hasError = false,
  clearable = false,
  className = '',
  style = {},
}) {
  const pickerRef = useRef(null)

  const handleContainerClick = () => {
    if (disabled) return
    try {
      pickerRef.current?.showPicker?.()
    } catch {
      pickerRef.current?.focus()
    }
  }

  const cleanVal = value ? String(value).split('T')[0] : ''

  return (
    <div
      className={`quotes-date-picker-wrap ${hasError ? 'has-error' : ''} ${disabled ? 'disabled' : ''} ${className}`}
      style={style}
      onClick={handleContainerClick}
    >
      <span className={`quotes-date-display-val ${!cleanVal ? 'placeholder' : ''}`}>
        {cleanVal || placeholder}
      </span>

      <div className="quotes-date-picker-actions" style={{ display: 'inline-flex', alignItems: 'center' }}>
        {clearable && cleanVal && !disabled && (
          <button
            type="button"
            className="quotes-date-clear-btn"
            onClick={(e) => {
              e.stopPropagation()
              onChange?.('')
            }}
            title="Clear date"
          >
            ✕
          </button>
        )}
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="quotes-date-calendar-icon"
          style={{ color: hasError ? '#EF4444' : 'var(--mut, #64748B)' }}
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>

      <input
        ref={pickerRef}
        type="date"
        className="quotes-hidden-date-picker"
        value={cleanVal}
        min={min ? String(min).split('T')[0] : undefined}
        max={max ? String(max).split('T')[0] : undefined}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          onChange?.(e.target.value)
        }}
      />
    </div>
  )
}
