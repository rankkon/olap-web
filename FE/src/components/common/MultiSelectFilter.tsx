import type { ChangeEvent } from 'react'
import type { SelectOption } from '../../types/filter'

interface MultiSelectFilterProps {
  id: string
  label: string
  options: SelectOption[]
  value: string[]
  onChange: (next: string[]) => void
}

function handleMultiSelectChange(
  event: ChangeEvent<HTMLSelectElement>,
  onChange: (next: string[]) => void,
) {
  const next = Array.from(event.target.selectedOptions, (item) => item.value)
  onChange(next)
}

export default function MultiSelectFilter({
  id,
  label,
  options,
  value,
  onChange,
}: MultiSelectFilterProps) {
  return (
    <div className="filter-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        multiple
        onChange={(event) => handleMultiSelectChange(event, onChange)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
