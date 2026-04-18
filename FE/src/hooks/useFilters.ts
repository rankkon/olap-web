import { useMemo, useState } from 'react'
import type { FilterKey, FilterState } from '../types/filter'

const defaultFilters: FilterState = {
  time: [],
  city: [],
  store: [],
  product: [],
  customer: [],
}

export function useFilters(initial?: Partial<FilterState>) {
  const [filters, setFilters] = useState<FilterState>({
    ...defaultFilters,
    ...initial,
  })

  const activeFilterCount = useMemo(
    () =>
      Object.values(filters).reduce((count, current) => {
        if (current.length > 0) {
          return count + 1
        }
        return count
      }, 0),
    [filters],
  )

  const updateFilter = (key: FilterKey, next: string[]) => {
    setFilters((prev) => ({ ...prev, [key]: next }))
  }

  const resetFilters = () => {
    setFilters(defaultFilters)
  }

  return {
    filters,
    activeFilterCount,
    updateFilter,
    resetFilters,
  }
}
