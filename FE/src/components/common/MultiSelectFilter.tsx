import { useEffect, useMemo, useRef, useState } from 'react'
import type { SelectOption } from '../../types/filter'

interface MultiSelectFilterProps {
  id: string
  label: string
  options: SelectOption[]
  value: string[]
  onChange: (next: string[]) => void
  embedded?: boolean
}

function toggleValue(current: string[], item: string): string[] {
  if (current.includes(item)) {
    return current.filter((value) => value !== item)
  }

  return [...current, item]
}

function buildSummary(options: SelectOption[], selectedValues: string[]): string {
  if (selectedValues.length === 0) {
    return 'Chọn bộ lọc'
  }

  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label)

  if (selectedLabels.length <= 2) {
    return selectedLabels.join(', ')
  }

  return `${selectedLabels.length} giá trị đã chọn`
}

function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export default function MultiSelectFilter({
  id,
  label,
  options,
  value,
  onChange,
  embedded = false,
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) {
        return
      }

      setIsOpen(false)
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onEscape)
    }
  }, [])

  const summary = useMemo(() => buildSummary(options, value), [options, value])
  const filteredOptions = useMemo(() => {
    const keyword = normalizeForSearch(searchText.trim())
    if (!keyword) {
      return options
    }

    return options.filter((option) => {
      const normalizedLabel = normalizeForSearch(option.label)
      const normalizedValue = normalizeForSearch(option.value)
      return normalizedLabel.includes(keyword) || normalizedValue.includes(keyword)
    })
  }, [options, searchText])

  useEffect(() => {
    if (!isOpen) {
      setSearchText('')
    }
  }, [isOpen])

  const content = (
    <div className="multi-select-wrapper" ref={containerRef}>
      <label htmlFor={`${id}-trigger`}>{label}</label>

      <button
        aria-controls={`${id}-panel`}
        aria-expanded={isOpen}
        className="multi-select-trigger"
        id={`${id}-trigger`}
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
      >
        <span className="multi-select-summary">{summary}</span>
        <span className="multi-select-caret">{isOpen ? '\u25B2' : '\u25BC'}</span>
      </button>

      {isOpen ? (
        <div className="multi-select-panel" id={`${id}-panel`} role="listbox" aria-multiselectable="true">
          <div className="multi-select-search-wrap">
            <input
              aria-label="Tìm kiếm bộ lọc"
              className="multi-select-search"
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Tìm kiếm bộ lọc..."
              type="search"
              value={searchText}
            />
          </div>

          {options.length === 0 ? (
            <p className="multi-select-empty">Không có dữ liệu.</p>
          ) : filteredOptions.length === 0 ? (
            <p className="multi-select-empty">Không tìm thấy giá trị phù hợp.</p>
          ) : (
            filteredOptions.map((option) => {
              const checked = value.includes(option.value)
              return (
                <button
                  aria-selected={checked}
                  className={`multi-select-option ${checked ? 'is-selected' : ''}`}
                  key={option.value}
                  onClick={() => onChange(toggleValue(value, option.value))}
                  type="button"
                >
                  <span className="multi-select-check">{checked ? '\u2713' : ''}</span>
                  <span>{option.label}</span>
                </button>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )

  if (embedded) {
    return content
  }

  return (
    <div className="filter-field">
      {content}
    </div>
  )
}
