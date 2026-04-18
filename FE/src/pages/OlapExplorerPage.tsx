import { useEffect, useMemo, useState } from 'react'
import ErrorState from '../components/common/ErrorState'
import Loading from '../components/common/Loading'
import MultiSelectFilter from '../components/common/MultiSelectFilter'
import PageHeader from '../components/common/PageHeader'
import PivotTable from '../components/tables/PivotTable'
import { useOlap } from '../hooks/useOlap'
import { useOlapFilterOptions } from '../hooks/useOlapFilterOptions'
import { useOlapMetadata } from '../hooks/useOlapMetadata'
import type { FilterState } from '../types/filter'
import type { OlapDimension, OlapLevelOption, OlapMeasureMetadata } from '../types/olap'
import { OLAP_LEVEL_OPTIONS } from '../types/olap'
import { formatNumber } from '../utils/format'

const ALL_DIMENSIONS: OlapDimension[] = ['time', 'store', 'product', 'customer']

const EMPTY_FILTERS: FilterState = {
  time: [],
  store: [],
  product: [],
  customer: [],
}

const DEFAULT_FILTER_LEVELS: Record<OlapDimension, number> = {
  time: 0,
  store: 2,
  product: 0,
  customer: 1,
}

const DIMENSION_LABELS: Record<OlapDimension, string> = {
  time: 'Thoi gian',
  store: 'Cua hang',
  product: 'Mat hang',
  customer: 'Khach hang',
}

const DEFAULT_TOP_ROWS = 20
const DEFAULT_TOP_COLUMNS = 12
const MAX_DIMENSION_COUNT = 3

function sameStringArray(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false
  }

  return left.every((value, index) => value === right[index])
}

function safeInt(value: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(Math.max(parsed, min), max)
}

function clampDimensionCount(value: number, maxAllowed: number): number {
  return Math.min(Math.max(value, 0), Math.min(MAX_DIMENSION_COUNT, maxAllowed))
}

function toLevelOptionsMap(measure: OlapMeasureMetadata | null): Record<OlapDimension, OlapLevelOption[]> {
  const fallback: Record<OlapDimension, OlapLevelOption[]> = {
    ...OLAP_LEVEL_OPTIONS,
  }

  if (!measure) {
    return fallback
  }

  measure.dimensions.forEach((dimension) => {
    fallback[dimension.key] = dimension.levels.map((level) => ({ label: level.label }))
  })

  return fallback
}

export default function OlapExplorerPage() {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [filterLevels, setFilterLevels] = useState<Record<OlapDimension, number>>(DEFAULT_FILTER_LEVELS)
  const [topRows, setTopRows] = useState(DEFAULT_TOP_ROWS)
  const [topColumns, setTopColumns] = useState(DEFAULT_TOP_COLUMNS)
  const [dimensionCount, setDimensionCount] = useState(2)
  const [thirdDimension, setThirdDimension] = useState<OlapDimension | null>('product')
  const {
    metadata: olapMetadata,
    isLoading: isMetadataLoading,
    error: metadataError,
  } = useOlapMetadata()

  const measureMetadataMap = useMemo(() => {
    const map: Record<string, OlapMeasureMetadata> = {}
    olapMetadata.measures.forEach((measure) => {
      map[measure.key.trim().toLowerCase()] = measure
    })
    return map
  }, [olapMetadata.measures])

  const measureOptions = useMemo(
    () => olapMetadata.measures.map((measure) => ({ label: measure.label, value: measure.key })),
    [olapMetadata.measures],
  )

  const olapInput = useMemo(
    () => ({
      topRows,
      topColumns,
      filters,
      filterLevels,
      measureMetadataMap,
      thirdDimension: dimensionCount >= 3 ? thirdDimension : null,
      thirdLevelIndex: dimensionCount >= 3 && thirdDimension ? filterLevels[thirdDimension] : undefined,
      enabled: dimensionCount >= 2,
    }),
    [dimensionCount, filterLevels, filters, measureMetadataMap, thirdDimension, topColumns, topRows],
  )

  const {
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
  } = useOlap(olapInput)

  const selectedMeasureMetadata = useMemo(
    () => measureMetadataMap[query.measure.trim().toLowerCase()] ?? null,
    [measureMetadataMap, query.measure],
  )

  const levelOptionsByDimension = useMemo(
    () => toLevelOptionsMap(selectedMeasureMetadata),
    [selectedMeasureMetadata],
  )

  const dimensionOptions = useMemo(
    () =>
      (selectedMeasureMetadata?.dimensions ?? [])
        .filter((dimension) => availableDimensions.includes(dimension.key))
        .map((dimension) => ({ label: dimension.label, value: dimension.key })),
    [availableDimensions, selectedMeasureMetadata],
  )

  const maxDimensionCount = Math.min(MAX_DIMENSION_COUNT, availableDimensions.length)
  const dimensionCountOptions = useMemo(
    () => Array.from({ length: maxDimensionCount + 1 }, (_, index) => index),
    [maxDimensionCount],
  )

  const dimensionLabelMap = useMemo(() => {
    const next: Record<string, string> = {}
    dimensionOptions.forEach((option) => {
      next[option.value] = option.label
    })
    return next
  }, [dimensionOptions])

  const dimensionDisplayLabel = (dimension: OlapDimension): string =>
    dimensionLabelMap[dimension] ?? DIMENSION_LABELS[dimension]

  useEffect(() => {
    setDimensionCount((prev) => clampDimensionCount(prev, maxDimensionCount))
  }, [maxDimensionCount])

  useEffect(() => {
    const fallback = availableDimensions.find(
      (dimension) => dimension !== query.rowDimension && dimension !== query.columnDimension,
    ) ?? null

    setThirdDimension((prev) => {
      if (fallback === null) {
        return null
      }

      if (!prev) {
        return fallback
      }

      if (
        !availableDimensions.includes(prev)
        || prev === query.rowDimension
        || prev === query.columnDimension
      ) {
        return fallback
      }

      return prev
    })
  }, [availableDimensions, query.columnDimension, query.rowDimension])

  const selectedFilterDimensions = useMemo(
    () => {
      const next: OlapDimension[] = []
      if (dimensionCount >= 1) {
        next.push(query.rowDimension)
      }

      if (dimensionCount >= 2) {
        next.push(query.columnDimension)
      }

      if (dimensionCount >= 3 && thirdDimension) {
        next.push(thirdDimension)
      }

      return [...new Set(next)] as OlapDimension[]
    },
    [dimensionCount, query.columnDimension, query.rowDimension, thirdDimension],
  )

  const effectiveFilterLevels = useMemo(() => {
    const next: Record<OlapDimension, number> = {
      ...filterLevels,
    }
    next[query.rowDimension] = query.rowLevelIndex
    next[query.columnDimension] = query.columnLevelIndex
    return next
  }, [
    filterLevels,
    query.columnDimension,
    query.columnLevelIndex,
    query.rowDimension,
    query.rowLevelIndex,
  ])

  const {
    options: cubeOptions,
    isLoading: isFilterLoading,
    error: filterError,
  } = useOlapFilterOptions({
    measureMetadata: selectedMeasureMetadata,
    dimensions: selectedFilterDimensions,
    levels: effectiveFilterLevels,
  })

  useEffect(() => {
    setFilters((prev) => {
      let changed = false
      const next: FilterState = {
        ...EMPTY_FILTERS,
        ...prev,
      }

      selectedFilterDimensions.forEach((key) => {
        const options = cubeOptions[key]
        const allowed = new Set(options.map((option) => option.value))
        const normalized = prev[key].filter((item) => allowed.has(item))
        if (!sameStringArray(prev[key], normalized)) {
          next[key] = normalized
          changed = true
        }
      })

      ALL_DIMENSIONS
        .filter((dimension) => !selectedFilterDimensions.includes(dimension))
        .forEach((key) => {
          if (next[key].length > 0) {
            next[key] = []
            changed = true
          }
        })

      return changed ? next : prev
    })
  }, [
    selectedFilterDimensions,
    cubeOptions.customer,
    cubeOptions.product,
    cubeOptions.store,
    cubeOptions.time,
  ])

  const activeFilterCount = useMemo(
    () =>
      selectedFilterDimensions.reduce((count, key) => {
        if (filters[key].length > 0) {
          return count + 1
        }

        return count
      }, 0),
    [selectedFilterDimensions, filters],
  )

  const selectableRowDimensions = useMemo(() => {
    const blocked = new Set<OlapDimension>()
    if (dimensionCount >= 2) {
      blocked.add(query.columnDimension)
    }
    if (dimensionCount >= 3 && thirdDimension) {
      blocked.add(thirdDimension)
    }

    return availableDimensions.filter(
      (dimension) => dimension === query.rowDimension || !blocked.has(dimension),
    )
  }, [availableDimensions, dimensionCount, query.columnDimension, query.rowDimension, thirdDimension])

  const selectableColumnDimensions = useMemo(() => {
    const blocked = new Set<OlapDimension>([query.rowDimension])
    if (dimensionCount >= 3 && thirdDimension) {
      blocked.add(thirdDimension)
    }

    return availableDimensions.filter(
      (dimension) => dimension === query.columnDimension || !blocked.has(dimension),
    )
  }, [availableDimensions, dimensionCount, query.columnDimension, query.rowDimension, thirdDimension])

  const selectableThirdDimensions = useMemo(() => {
    return availableDimensions.filter(
      (dimension) =>
        dimension === thirdDimension
        || (dimension !== query.rowDimension && dimension !== query.columnDimension),
    )
  }, [availableDimensions, query.columnDimension, query.rowDimension, thirdDimension])

  const updateFilterMembers = (key: OlapDimension, values: string[]) => {
    setFilters((prev) => ({ ...prev, [key]: values }))
  }

  const updateFilterLevel = (dimension: OlapDimension, nextLevel: number) => {
    if (dimension === query.rowDimension || dimension === query.columnDimension) {
      return
    }

    setFilterLevels((prev) => ({
      ...prev,
      [dimension]: nextLevel,
    }))
    setFilters((prev) => ({
      ...prev,
      [dimension]: [],
    }))
  }

  const resetWorkspace = () => {
    setFilters(EMPTY_FILTERS)
    setFilterLevels(DEFAULT_FILTER_LEVELS)
    setTopRows(DEFAULT_TOP_ROWS)
    setTopColumns(DEFAULT_TOP_COLUMNS)
    setDimensionCount(2)
    setThirdDimension('product')
    updateQuery({
      measure: 'inventory',
      rowDimension: 'store',
      columnDimension: 'time',
      rowLevelIndex: 2,
      columnLevelIndex: 1,
    })
  }

  const updateDimensionCountValue = (rawValue: string) => {
    const next = safeInt(rawValue, 2, 0, MAX_DIMENSION_COUNT)
    setDimensionCount(clampDimensionCount(next, maxDimensionCount))
  }

  const updateRowDimension = (nextRowDimension: OlapDimension) => {
    let nextColumnDimension = query.columnDimension
    if (dimensionCount >= 2 && nextColumnDimension === nextRowDimension) {
      nextColumnDimension = availableDimensions.find(
        (dimension) => dimension !== nextRowDimension && (dimensionCount < 3 || dimension !== thirdDimension),
      ) ?? nextColumnDimension
    }

    updateQuery({
      rowDimension: nextRowDimension,
      columnDimension: nextColumnDimension,
    })
  }

  const updateColumnDimension = (nextColumnDimension: OlapDimension) => {
    let finalColumnDimension = nextColumnDimension
    if (finalColumnDimension === query.rowDimension) {
      finalColumnDimension = availableDimensions.find(
        (dimension) => dimension !== query.rowDimension && (dimensionCount < 3 || dimension !== thirdDimension),
      ) ?? finalColumnDimension
    }

    updateQuery({
      columnDimension: finalColumnDimension,
    })
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="OLAP Explorer - Quan tri kho linh hoat"
        description="Truy van da chieu cho quan ly kho: chon measure, xoay truc, drill/roll theo hierarchy va loc nghiep vu tren tung dimension."
        action={<span className="badge-note">Last action: {lastAction}</span>}
      />

      <section className="content-card">
        <div className="card-header">
          <h3>Workspace truy van</h3>
          <div className="header-action-row">
            <span className="badge-note">Active filters: {activeFilterCount}</span>
            <button className="btn-secondary" type="button" onClick={resetWorkspace}>
              Reset workspace
            </button>
          </div>
        </div>
        {isMetadataLoading ? <p className="card-note">Dang dong bo metadata measure/dimension tu cube...</p> : null}
        {!isMetadataLoading && metadataError ? <p className="card-note">{metadataError}</p> : null}

        <div className="explorer-config-grid">
          <div className="dimension-control-field">
            <label htmlFor="dimension-count-input">So chieu du lieu (0-{maxDimensionCount})</label>
            <select
              id="dimension-count-input"
              className="workspace-control"
              value={String(dimensionCount)}
              onChange={(event) => updateDimensionCountValue(event.target.value)}
            >
              {dimensionCountOptions.map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
            <p className="card-note">Nhap so chieu ban muon hien thi trong workspace.</p>
          </div>

          <div className="dimension-control-field">
            <label htmlFor="measure-select">Measure</label>
            <select
              className="workspace-control"
              id="measure-select"
              value={query.measure}
              disabled={measureOptions.length === 0}
              onChange={(event) => updateQuery({ measure: event.target.value })}
            >
              {measureOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="dimension-control-field">
            <label htmlFor="top-rows-input">Top rows</label>
            <input
              id="top-rows-input"
              className="workspace-control"
              max={250}
              min={1}
              type="number"
              value={topRows}
              onChange={(event) => setTopRows(safeInt(event.target.value, DEFAULT_TOP_ROWS, 1, 250))}
            />
          </div>

          <div className="dimension-control-field">
            <label htmlFor="top-columns-input">Top columns</label>
            <input
              id="top-columns-input"
              className="workspace-control"
              max={48}
              min={1}
              type="number"
              value={topColumns}
              onChange={(event) => setTopColumns(safeInt(event.target.value, DEFAULT_TOP_COLUMNS, 1, 48))}
            />
          </div>

          {dimensionCount >= 1 ? (
            <div className="dimension-control-field">
              <label htmlFor="row-dimension">Chieu 1 - Truc dong (Row Axis)</label>
              <div className="dimension-control-line">
                <select
                  className="workspace-control"
                  id="row-dimension"
                  value={query.rowDimension}
                  onChange={(event) => updateRowDimension(event.target.value as OlapDimension)}
                >
                  {selectableRowDimensions.map((dimension) => (
                    <option key={dimension} value={dimension}>
                      {dimensionDisplayLabel(dimension)}
                    </option>
                  ))}
                </select>
                <div className="axis-arrow-controls">
                  <button
                    className="btn-secondary axis-arrow-button"
                    disabled={!canRowRollUp}
                    onClick={rollUpRow}
                    title="Roll up row axis"
                    type="button"
                  >
                    {'\u2191'}
                  </button>
                  <button
                    className="btn-secondary axis-arrow-button"
                    disabled={!canRowDrillDown}
                    onClick={drillDownRow}
                    title="Drill down row axis"
                    type="button"
                  >
                    {'\u2193'}
                  </button>
                </div>
              </div>
              <p className="card-note">Level hien tai: {rowLevelOptions[query.rowLevelIndex]?.label ?? '-'}</p>
            </div>
          ) : null}

          {dimensionCount >= 2 ? (
            <div className="dimension-control-field">
              <label htmlFor="column-dimension">Chieu 2 - Truc cot (Column Axis)</label>
              <div className="dimension-control-line">
                <select
                  className="workspace-control"
                  id="column-dimension"
                  value={query.columnDimension}
                  onChange={(event) => updateColumnDimension(event.target.value as OlapDimension)}
                >
                  {selectableColumnDimensions.map((dimension) => (
                    <option key={dimension} value={dimension}>
                      {dimensionDisplayLabel(dimension)}
                    </option>
                  ))}
                </select>
                <div className="axis-arrow-controls">
                  <button
                    className="btn-secondary axis-arrow-button"
                    disabled={!canColumnRollUp}
                    onClick={rollUpColumn}
                    title="Roll up column axis"
                    type="button"
                  >
                    {'\u2191'}
                  </button>
                  <button
                    className="btn-secondary axis-arrow-button"
                    disabled={!canColumnDrillDown}
                    onClick={drillDownColumn}
                    title="Drill down column axis"
                    type="button"
                  >
                    {'\u2193'}
                  </button>
                </div>
              </div>
              <p className="card-note">Level hien tai: {columnLevelOptions[query.columnLevelIndex]?.label ?? '-'}</p>
            </div>
          ) : null}

          {dimensionCount >= 3 && thirdDimension ? (
            <div className="dimension-control-field">
              <label htmlFor="slicer-dimension">Chieu 3 - Slicer</label>
              <select
                className="workspace-control"
                id="slicer-dimension"
                value={thirdDimension}
                onChange={(event) => setThirdDimension(event.target.value as OlapDimension)}
              >
                {selectableThirdDimensions.map((dimension) => (
                  <option key={dimension} value={dimension}>
                    {dimensionDisplayLabel(dimension)}
                  </option>
                ))}
              </select>
              <p className="card-note">Chieu bo sung duoc dung de loc nghiep vu (slice/dice).</p>
            </div>
          ) : null}
        </div>

        <div className="action-row">
          {dimensionCount >= 2 ? (
            <button className="btn-secondary" type="button" onClick={pivot}>
              Pivot Axis
            </button>
          ) : (
            <p className="card-note">Can chon it nhat 2 chieu de truy van pivot.</p>
          )}
        </div>
      </section>

      <section className="content-card">
        <h3>Bo loc nghiep vu</h3>
        {selectedFilterDimensions.length > 0 ? (
          <div className="filters-grid">
            {selectedFilterDimensions.map((dimension) => {
              const isAxisDimension = dimension === query.rowDimension || dimension === query.columnDimension
              const levelIndex = effectiveFilterLevels[dimension]

              return (
                <div className="filter-field" key={dimension}>
                  <label htmlFor={`olap-filter-level-${dimension}`}>
                    {dimensionDisplayLabel(dimension)} - {levelOptionsByDimension[dimension][levelIndex]?.label ?? '-'}
                  </label>

                  {!isAxisDimension ? (
                    <select
                      id={`olap-filter-level-${dimension}`}
                      value={String(filterLevels[dimension])}
                      onChange={(event) => updateFilterLevel(dimension, Number(event.target.value))}
                    >
                      {levelOptionsByDimension[dimension].map((option, index) => (
                        <option key={`${dimension}-${option.label}`} value={index}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="card-note">Level nay dang dong bo theo truc Row/Column.</p>
                  )}

                  <MultiSelectFilter
                    embedded
                    id={`olap-filter-members-${dimension}`}
                    label="Select members (click de chon nhieu)"
                    onChange={(next) => updateFilterMembers(dimension, next)}
                    options={cubeOptions[dimension]}
                    value={filters[dimension]}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <p className="card-note">Chon so chieu lon hon 0 de hien thi bo loc.</p>
        )}
        {isFilterLoading ? <p className="card-note">Dang tai members tu cube...</p> : null}
        {!isFilterLoading && filterError ? <p className="card-note">{filterError}</p> : null}
      </section>

      {isLoading ? <Loading /> : null}
      {!isLoading && error ? <ErrorState message={error} /> : null}

      {dimensionCount < 2 ? (
        <section className="content-card">
          <p className="card-note">Ket qua pivot chi hien thi khi ban chon tu 2 den 3 chieu du lieu.</p>
        </section>
      ) : null}

      {dimensionCount >= 2 && !isLoading && !error ? (
        <section className="content-card">
          <div className="card-header">
            <h3>Ket qua pivot tu API</h3>
            <span className="badge-note">Total: {formatNumber(result.total)}</span>
          </div>
          <PivotTable
            rowHeader={result.rowHeader}
            secondaryRowHeader={result.secondaryRowHeader}
            columnHeaders={result.columnHeaders}
            rows={result.rows}
          />
          <p className="card-note">
            Cot hien tai: {result.columnHeader}. Row level: {result.rowLevelLabel}. Column level:{' '}
            {result.columnLevelLabel}.
          </p>
        </section>
      ) : null}
    </div>
  )
}
