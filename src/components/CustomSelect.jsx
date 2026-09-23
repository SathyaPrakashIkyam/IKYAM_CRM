import { useEffect, useId, useRef, useState } from 'react'
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
  const [openUpward, setOpenUpward] = useState(false)
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState(200)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const optionRefs = useRef([])
  const listboxId = useId()

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

  // Auto-detect whether dropdown should open upwards or downwards, constraining inside container
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const modalParent = containerRef.current.closest(
        '.lead-modal-card, .activity-modal-dialog, [role="dialog"], .modal-card'
      )
      const bottomBoundary = modalParent ? modalParent.getBoundingClientRect().bottom : window.innerHeight
      const topBoundary = modalParent ? modalParent.getBoundingClientRect().top : 0

      const spaceBelow = bottomBoundary - rect.bottom - 12
      const spaceAbove = rect.top - topBoundary - 12

      if (spaceBelow < 190 && spaceAbove > spaceBelow) {
        setOpenUpward(true)
        setDropdownMaxHeight(Math.max(100, Math.min(220, Math.floor(spaceAbove - 16))))
      } else {
        setOpenUpward(false)
        setDropdownMaxHeight(Math.max(100, Math.min(220, Math.floor(spaceBelow - 16))))
      }
    }
  }, [isOpen])

  // Helper to determine if an option value is selected
  function isSelected(optValue) {
    if (multiple) {
      const arr = Array.isArray(value) ? value : []
      return arr.includes(optValue)
    }
    return String(value) === String(optValue)
  }

  // Initialize highlighted index when opened
  useEffect(() => {
    if (isOpen) {
      if (options.length > 0) {
        const selectedIdx = options.findIndex((opt) => isSelected(opt.value))
        setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0)
      } else {
        setHighlightedIndex(-1)
      }
    } else {
      setHighlightedIndex(-1)
    }
  }, [isOpen, options, value])

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex].scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      })
    }
  }, [highlightedIndex, isOpen])

  // Handle option selection
  function handleSelect(optValue) {
    if (!onChange) return

    if (!multiple) {
      onChange(optValue)
      setIsOpen(false)
      triggerRef.current?.focus()
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

  // Handle keyboard navigation
  function handleKeyDown(e) {
    if (!options || options.length === 0) return

    // When dropdown is CLOSED
    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        setIsOpen(true)
        const selectedIdx = options.findIndex((opt) => isSelected(opt.value))
        if (e.key === 'ArrowUp') {
          setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : options.length - 1)
        } else {
          setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0)
        }
      }
      return
    }

    // When dropdown is OPEN
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1))
    } else if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1))
      } else {
        setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0))
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (highlightedIndex >= 0 && highlightedIndex < options.length) {
        handleSelect(options[highlightedIndex].value)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      setHighlightedIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setHighlightedIndex(options.length - 1)
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      // Typeahead: jump to option starting with typed character
      const char = e.key.toLowerCase()
      const startIdx = highlightedIndex + 1
      let matchIdx = -1

      for (let i = 0; i < options.length; i++) {
        const checkIdx = (startIdx + i) % options.length
        const label = String(options[checkIdx].label || '').toLowerCase()
        if (label.startsWith(char)) {
          matchIdx = checkIdx
          break
        }
      }

      if (matchIdx >= 0) {
        e.preventDefault()
        setHighlightedIndex(matchIdx)
      }
    }
  }

  function handleBlur(e) {
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget)) {
      setIsOpen(false)
    }
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
      style={{
        ...(style?.width ? { width: style.width } : {}),
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={handleBlur}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        style={style}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={isOpen && highlightedIndex >= 0 ? `${listboxId}-opt-${highlightedIndex}` : undefined}
      >
        <span
          className="custom-select-label"
          title={typeof renderLabel() === 'string' ? renderLabel() : undefined}
        >
          {renderLabel()}
        </span>
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
        <div className={`custom-select-dropdown ${openUpward ? 'drop-up' : ''}`}>
          <div
            id={listboxId}
            role="listbox"
            className="custom-select-options-list"
            style={{ maxHeight: dropdownMaxHeight }}
          >
            {options.map((opt, idx) => {
              const active = isSelected(opt.value)
              const isHighlighted = highlightedIndex === idx
              return (
                <div
                  key={opt.value}
                  id={`${listboxId}-opt-${idx}`}
                  ref={(el) => (optionRefs.current[idx] = el)}
                  role="option"
                  aria-selected={active}
                  className={`custom-select-option ${active ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(opt.value)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  <div className="rowx" style={{ gap: 8, alignItems: 'center', minWidth: 0, flex: 1 }}>
                    {multiple && (
                      <div className={`custom-select-checkbox ${active ? 'checked' : ''}`}>
                        {active && '✓'}
                      </div>
                    )}
                    <span title={typeof opt.label === 'string' ? opt.label : undefined}>{opt.label}</span>
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
