import { useEffect, useRef, useState } from 'react'
import '../styles/CustomSelect.css'

/**
 * CustomSelect - Reusable theme-styled dropdown component (supports single & multi select)
 *
 * @param {Array<{value: string, label: string}>} options - Array of select options
 * @param {string|Array<string>} value - Currently selected value (string for single, Array for multiple)
 * @param {function} onChange - Callback function when option is chosen (value) => void
 * @param {boolean} [multiple=false] - Optional parameter to enable multi-select with checkboxes
 * @param {string} [placeholder] - Default placeholder text
 * @param {string} [className] - Optional container class name
 * @param {object} [style] - Custom inline styles for trigger
 */
export default function CustomSelect({
  options = [],
  value,
  onChange,
  multiple = false,
  placeholder = 'Select option...',
  className = '',
  style = {},
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Helper to determine if an option value is selected
  function isSelected(optValue) {
    if (multiple) {
      const arr = Array.isArray(value) ? value : []
      return arr.includes(optValue)
    }
    return String(value) === String(optValue)
  }

  // Handle option click
  function handleSelect(optValue) {
    if (!onChange) return

    if (!multiple) {
      onChange(optValue)
      setIsOpen(false)
      return
    }

    // Multi-select logic
    const currentValues = Array.isArray(value) ? [...value] : []

    if (optValue === 'all') {
      onChange(['all'])
      return
    }

    // Remove 'all' if specific items are chosen
    let newValues = currentValues.filter((v) => v !== 'all')

    if (newValues.includes(optValue)) {
      newValues = newValues.filter((v) => v !== optValue)
    } else {
      newValues.push(optValue)
    }

    // Fallback to 'all' if empty
    if (newValues.length === 0) {
      newValues = ['all']
    }

    onChange(newValues)
  }

  // Derive trigger label
  function renderLabel() {
    if (!multiple) {
      const selectedOption = options.find((opt) => String(opt.value) === String(value))
      return selectedOption ? selectedOption.label : placeholder
    }

    const arr = Array.isArray(value) ? value : []
    if (arr.includes('all') || arr.length === 0) {
      const allOpt = options.find((opt) => opt.value === 'all')
      return allOpt ? allOpt.label : 'All Selected'
    }

    if (arr.length === 1) {
      const singleOpt = options.find((opt) => String(opt.value) === String(arr[0]))
      return singleOpt ? singleOpt.label : `${arr.length} Selected`
    }

    return `${arr.length} Selected`
  }

  return (
    <div
      className={`custom-select-container ${isOpen ? 'open' : ''} ${className}`}
      ref={containerRef}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        style={style}
      >
        <span className="custom-select-label">{renderLabel()}</span>
        <svg
          className={`custom-select-arrow ${isOpen ? 'open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="custom-select-dropdown">
          <div className="custom-select-options-list">
            {options.map((opt) => {
              const active = isSelected(opt.value)
              return (
                <div
                  key={opt.value}
                  className={`custom-select-option ${active ? 'selected' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  <div className="rowx" style={{ gap: 8, alignItems: 'center' }}>
                    {multiple && (
                      <div className={`custom-select-checkbox ${active ? 'checked' : ''}`}>
                        {active && '✓'}
                      </div>
                    )}
                    <span>{opt.label}</span>
                  </div>
                  {!multiple && active && <span className="custom-select-check">✓</span>}
                </div>
              )
            })}
            {options.length === 0 && (
              <div className="custom-select-empty">No options available</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
