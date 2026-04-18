import { useMemo, useState } from 'react'
import type { OlapPivotResult, OlapQueryState } from '../types/olap'
import { HIERARCHY_LEVELS, MOCK_OLAP_PIVOT } from '../utils/constants'

const defaultQuery: OlapQueryState = {
  measure: 'revenue',
  rowDimension: 'city',
  columnDimension: 'time',
  hierarchyLevel: 'quarter',
}

function calculateScale(measure: string): number {
  if (measure === 'orderCount') {
    return 0.25
  }
  if (measure === 'inventory') {
    return 0.62
  }
  if (measure === 'profit') {
    return 0.41
  }
  return 1
}

function buildResult(query: OlapQueryState): OlapPivotResult {
  const scale = calculateScale(query.measure)
  const rows = MOCK_OLAP_PIVOT.rows.map((row) => ({
    ...row,
    values: row.values.map((value) => Math.round(value * scale)),
  }))
  const total = rows.reduce(
    (sum, row) => sum + row.values.reduce((inner, current) => inner + current, 0),
    0,
  )

  return {
    ...MOCK_OLAP_PIVOT,
    rows,
    total,
  }
}

export function useOlap() {
  const [query, setQuery] = useState<OlapQueryState>(defaultQuery)
  const [levelIndex, setLevelIndex] = useState(1)
  const [lastAction, setLastAction] = useState('Pivot initialized')

  const result = useMemo(() => buildResult(query), [query])

  const canDrillDown = levelIndex < HIERARCHY_LEVELS.length - 1
  const canRollUp = levelIndex > 0

  const drillDown = () => {
    if (!canDrillDown) {
      return
    }

    const next = levelIndex + 1
    setLevelIndex(next)
    setQuery((prev) => ({ ...prev, hierarchyLevel: HIERARCHY_LEVELS[next].value }))
    setLastAction('Drill down')
  }

  const rollUp = () => {
    if (!canRollUp) {
      return
    }

    const next = levelIndex - 1
    setLevelIndex(next)
    setQuery((prev) => ({ ...prev, hierarchyLevel: HIERARCHY_LEVELS[next].value }))
    setLastAction('Roll up')
  }

  const pivot = () => {
    setQuery((prev) => ({
      ...prev,
      rowDimension: prev.columnDimension,
      columnDimension: prev.rowDimension,
    }))
    setLastAction('Pivot axis')
  }

  const updateQuery = (patch: Partial<OlapQueryState>) => {
    if (patch.hierarchyLevel) {
      const nextIndex = HIERARCHY_LEVELS.findIndex((item) => item.value === patch.hierarchyLevel)
      if (nextIndex >= 0) {
        setLevelIndex(nextIndex)
      }
    }

    setQuery((prev) => ({ ...prev, ...patch }))
    setLastAction('Filter updated')
  }

  return {
    query,
    result,
    lastAction,
    canDrillDown,
    canRollUp,
    drillDown,
    rollUp,
    pivot,
    updateQuery,
  }
}
