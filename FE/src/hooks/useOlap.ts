import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchOlapPivot } from '../api/olapApi'
import type { OlapMemberFilterDto } from '../types/api'
import type { FilterState } from '../types/filter'
import type {
  OlapDimension,
  OlapLevelOption,
  OlapMeasureMetadata,
  OlapPivotResult,
  OlapQueryState,
} from '../types/olap'
import { OLAP_LEVEL_OPTIONS } from '../types/olap'

interface UseOlapInput {
  topRows: number
  topColumns: number
  filters: FilterState
  filterLevels: Record<OlapDimension, number>
  measureMetadataMap?: Record<string, OlapMeasureMetadata>
  thirdDimension?: OlapDimension | null
  thirdLevelIndex?: number
  refreshToken?: number
  enabled?: boolean
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
  secondaryRowHeader: null,
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

function clampLevelIndex(
  dimension: OlapDimension,
  index: number,
  levelOptionsByDimension: Record<OlapDimension, OlapLevelOption[]>,
): number {
  const max = (levelOptionsByDimension[dimension] ?? OLAP_LEVEL_OPTIONS[dimension]).length - 1
  return Math.min(Math.max(index, 0), max)
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
  const normalizedMeasure = query.measure.trim().toLowerCase()

  const activeMeasureMetadata = useMemo(
    () => input.measureMetadataMap?.[normalizedMeasure] ?? null,
    [input.measureMetadataMap, normalizedMeasure],
  )

  const levelOptionsByDimension = useMemo<Record<OlapDimension, OlapLevelOption[]>>(() => {
    const fallback: Record<OlapDimension, OlapLevelOption[]> = {
      ...OLAP_LEVEL_OPTIONS,
    }

    if (!activeMeasureMetadata) {
      return fallback
    }

    activeMeasureMetadata.dimensions.forEach((dimension) => {
      fallback[dimension.key] = dimension.levels.map((level) => ({ label: level.label }))
    })

    return fallback
  }, [activeMeasureMetadata])

  const availableDimensions = useMemo(() => {
    if (activeMeasureMetadata?.dimensions?.length) {
      return activeMeasureMetadata.dimensions.map((dimension) => dimension.key)
    }

    return dimensionsForMeasure(query.measure)
  }, [activeMeasureMetadata, query.measure])

  const availableMeasureKeys = useMemo(
    () => Object.keys(input.measureMetadataMap ?? {}),
    [input.measureMetadataMap],
  )

  const sanitizeQuery = useCallback((next: OlapQueryState): OlapQueryState => {
    const normalizedMeasure = next.measure.trim().toLowerCase()
    const measure = availableMeasureKeys.length > 0 && !availableMeasureKeys.includes(normalizedMeasure)
      ? availableMeasureKeys[0]
      : next.measure

    const allowed = availableDimensions
    const rowDimension = allowed.includes(next.rowDimension) ? next.rowDimension : allowed[0]
    let columnDimension = allowed.includes(next.columnDimension) ? next.columnDimension : allowed[0]

    if (columnDimension === rowDimension) {
      columnDimension = allowed.find((item) => item !== rowDimension) ?? rowDimension
    }

    return {
      ...next,
      measure,
      rowDimension,
      columnDimension,
      rowLevelIndex: clampLevelIndex(rowDimension, next.rowLevelIndex, levelOptionsByDimension),
      columnLevelIndex: clampLevelIndex(columnDimension, next.columnLevelIndex, levelOptionsByDimension),
    }
  }, [availableDimensions, availableMeasureKeys, levelOptionsByDimension])

  const rowLevelOptions = useMemo(
    () => levelOptionsByDimension[query.rowDimension] ?? OLAP_LEVEL_OPTIONS[query.rowDimension],
    [levelOptionsByDimension, query.rowDimension],
  )
  const columnLevelOptions = useMemo(
    () => levelOptionsByDimension[query.columnDimension] ?? OLAP_LEVEL_OPTIONS[query.columnDimension],
    [levelOptionsByDimension, query.columnDimension],
  )
  const isEnabled = input.enabled ?? true

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
  }, [query, sanitizeQuery])

  useEffect(() => {
    if (!isEnabled) {
      setIsLoading(false)
      setError(null)
      setResult(defaultResult)
      return
    }

    let isActive = true

    const run = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const filterDimensions = uniqueDimensions([
          ...availableDimensions,
          query.rowDimension,
          query.columnDimension,
          ...(input.thirdDimension ? [input.thirdDimension] : []),
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
              : input.thirdDimension && dimension === input.thirdDimension
                ? clampLevelIndex(
                    dimension,
                    input.thirdLevelIndex ?? input.filterLevels[dimension],
                    levelOptionsByDimension,
                  )
              : clampLevelIndex(dimension, input.filterLevels[dimension], levelOptionsByDimension)

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
          thirdDimension: input.thirdDimension ?? undefined,
          thirdLevelIndex: input.thirdDimension
            ? clampLevelIndex(
                input.thirdDimension,
                input.thirdLevelIndex ?? input.filterLevels[input.thirdDimension],
                levelOptionsByDimension,
              )
            : undefined,
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
          secondaryRowHeader: response.secondaryRowHeader ?? null,
          columnHeader: response.columnHeader,
          rowLevelLabel: response.rowLevelLabel,
          columnLevelLabel: response.columnLevelLabel,
          columnHeaders: response.columnHeaders,
          rows: response.rows.map((row) => ({
            label: row.label,
            secondaryLabel: row.secondaryLabel ?? null,
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
    isEnabled,
    input.filterLevels,
    input.filters,
    levelOptionsByDimension,
    input.refreshToken,
    input.thirdDimension,
    input.thirdLevelIndex,
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
