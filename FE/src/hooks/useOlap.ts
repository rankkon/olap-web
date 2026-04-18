import { useEffect, useMemo, useState } from 'react'
import { fetchOlapPivot } from '../api/olapApi'
import type { OlapMemberFilterDto } from '../types/api'
import type { FilterState } from '../types/filter'
import type { OlapDimension, OlapPivotResult, OlapQueryState } from '../types/olap'
import { OLAP_LEVEL_OPTIONS } from '../types/olap'

interface UseOlapInput {
  topRows: number
  topColumns: number
  filters: FilterState
  filterLevels: Record<OlapDimension, number>
}

const defaultQuery: OlapQueryState = {
  measure: 'inventory',
  rowDimension: 'store',
  columnDimension: 'time',
  rowLevelIndex: 2,
  columnLevelIndex: 1,
}

const defaultResult: OlapPivotResult = {
  rowHeader: 'Dimension Member',
  columnHeader: 'Dimension',
  rowLevelLabel: '',
  columnLevelLabel: '',
  columnHeaders: [],
  rows: [],
  total: 0,
}

function dimensionsForMeasure(measure: string): OlapDimension[] {
  if (measure === 'inventory') {
    return ['time', 'store', 'product']
  }

  return ['time', 'customer', 'product']
}

function clampLevelIndex(dimension: OlapDimension, index: number): number {
  const max = OLAP_LEVEL_OPTIONS[dimension].length - 1
  return Math.min(Math.max(index, 0), max)
}

function sanitizeQuery(next: OlapQueryState): OlapQueryState {
  const allowed = dimensionsForMeasure(next.measure)
  const rowDimension = allowed.includes(next.rowDimension) ? next.rowDimension : allowed[0]
  let columnDimension = allowed.includes(next.columnDimension) ? next.columnDimension : 'time'

  if (columnDimension === rowDimension) {
    columnDimension = allowed.find((item) => item !== rowDimension) ?? 'time'
  }

  return {
    ...next,
    rowDimension,
    columnDimension,
    rowLevelIndex: clampLevelIndex(rowDimension, next.rowLevelIndex),
    columnLevelIndex: clampLevelIndex(columnDimension, next.columnLevelIndex),
  }
}

function uniqueDimensions(source: OlapDimension[]): OlapDimension[] {
  return [...new Set(source)]
}

export function useOlap(input: UseOlapInput) {
  const [query, setQuery] = useState<OlapQueryState>(defaultQuery)
  const [lastAction, setLastAction] = useState('Pivot initialized')
  const [result, setResult] = useState<OlapPivotResult>(defaultResult)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const availableDimensions = useMemo(() => dimensionsForMeasure(query.measure), [query.measure])
  const rowLevelOptions = useMemo(() => OLAP_LEVEL_OPTIONS[query.rowDimension], [query.rowDimension])
  const columnLevelOptions = useMemo(() => OLAP_LEVEL_OPTIONS[query.columnDimension], [query.columnDimension])

  useEffect(() => {
    const next = sanitizeQuery(query)
    if (
      next.rowDimension !== query.rowDimension
      || next.columnDimension !== query.columnDimension
      || next.measure !== query.measure
      || next.rowLevelIndex !== query.rowLevelIndex
      || next.columnLevelIndex !== query.columnLevelIndex
    ) {
      setQuery(next)
    }
  }, [query])

  useEffect(() => {
    let isActive = true

    const run = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const filterDimensions = uniqueDimensions([
          ...availableDimensions,
          query.rowDimension,
          query.columnDimension,
        ])
        const filtersPayload: OlapMemberFilterDto[] = []

        filterDimensions.forEach((dimension) => {
          const members = input.filters[dimension]
          if (!members || members.length === 0) {
            return
          }

          const levelIndex = dimension === query.rowDimension
            ? query.rowLevelIndex
            : dimension === query.columnDimension
              ? query.columnLevelIndex
              : clampLevelIndex(dimension, input.filterLevels[dimension])

          filtersPayload.push({
            dimension,
            levelIndex,
            members,
          })
        })

        const payload = {
          measure: query.measure,
          rowDimension: query.rowDimension,
          columnDimension: query.columnDimension,
          rowLevelIndex: query.rowLevelIndex,
          columnLevelIndex: query.columnLevelIndex,
          topRows: input.topRows,
          topColumns: input.topColumns,
          filters: filtersPayload,
        }
        const response = await fetchOlapPivot(payload)

        if (!isActive) {
          return
        }

        setResult({
          rowHeader: response.rowHeader,
          columnHeader: response.columnHeader,
          rowLevelLabel: response.rowLevelLabel,
          columnLevelLabel: response.columnLevelLabel,
          columnHeaders: response.columnHeaders,
          rows: response.rows.map((row) => ({
            label: row.label,
            values: row.values.map((value) => Number(value)),
          })),
          total: Number(response.total),
        })
      } catch (err) {
        if (!isActive) {
          return
        }

        const message = err instanceof Error ? err.message : 'Khong the lay du lieu OLAP tu backend.'
        setError(message)
        setResult(defaultResult)
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void run()
    return () => {
      isActive = false
    }
  }, [
    availableDimensions,
    input.filterLevels,
    input.filters,
    input.topColumns,
    input.topRows,
    query,
  ])

  const canRowDrillDown = query.rowLevelIndex < rowLevelOptions.length - 1
  const canRowRollUp = query.rowLevelIndex > 0
  const canColumnDrillDown = query.columnLevelIndex < columnLevelOptions.length - 1
  const canColumnRollUp = query.columnLevelIndex > 0

  const drillDownRow = () => {
    if (!canRowDrillDown) {
      return
    }

    setQuery((prev) => sanitizeQuery({ ...prev, rowLevelIndex: prev.rowLevelIndex + 1 }))
    setLastAction('Row drill down')
  }

  const rollUpRow = () => {
    if (!canRowRollUp) {
      return
    }

    setQuery((prev) => sanitizeQuery({ ...prev, rowLevelIndex: prev.rowLevelIndex - 1 }))
    setLastAction('Row roll up')
  }

  const drillDownColumn = () => {
    if (!canColumnDrillDown) {
      return
    }

    setQuery((prev) => sanitizeQuery({ ...prev, columnLevelIndex: prev.columnLevelIndex + 1 }))
    setLastAction('Column drill down')
  }

  const rollUpColumn = () => {
    if (!canColumnRollUp) {
      return
    }

    setQuery((prev) => sanitizeQuery({ ...prev, columnLevelIndex: prev.columnLevelIndex - 1 }))
    setLastAction('Column roll up')
  }

  const pivot = () => {
    setQuery((prev) =>
      sanitizeQuery({
        ...prev,
        rowDimension: prev.columnDimension,
        columnDimension: prev.rowDimension,
        rowLevelIndex: prev.columnLevelIndex,
        columnLevelIndex: prev.rowLevelIndex,
      }),
    )
    setLastAction('Pivot axis')
  }

  const updateQuery = (patch: Partial<OlapQueryState>) => {
    setQuery((prev) => sanitizeQuery({ ...prev, ...patch }))
    setLastAction('Filter updated')
  }

  return {
    query,
    result,
    lastAction,
    isLoading,
    error,
    availableDimensions,
    rowLevelOptions,
    columnLevelOptions,
    canRowDrillDown,
    canRowRollUp,
    canColumnDrillDown,
    canColumnRollUp,
    drillDownRow,
    rollUpRow,
    drillDownColumn,
    rollUpColumn,
    pivot,
    updateQuery,
  }
}
