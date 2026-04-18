import { useEffect, useMemo, useState } from 'react'
import ErrorState from '../components/common/ErrorState'
import Loading from '../components/common/Loading'
import MultiSelectFilter from '../components/common/MultiSelectFilter'
import PageHeader from '../components/common/PageHeader'
import PivotTable from '../components/tables/PivotTable'
import { useOlap } from '../hooks/useOlap'
import { useOlapFilterOptions } from '../hooks/useOlapFilterOptions'
import type { FilterState } from '../types/filter'
import type { OlapDimension } from '../types/olap'
import { OLAP_LEVEL_OPTIONS } from '../types/olap'
import { DIMENSION_OPTIONS, MEASURE_OPTIONS } from '../utils/constants'
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

export default function OlapExplorerPage() {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [filterLevels, setFilterLevels] = useState<Record<OlapDimension, number>>(DEFAULT_FILTER_LEVELS)
  const [topRows, setTopRows] = useState(DEFAULT_TOP_ROWS)
  const [topColumns, setTopColumns] = useState(DEFAULT_TOP_COLUMNS)

  const olapInput = useMemo(
    () => ({
      topRows,
      topColumns,
      filters,
      filterLevels,
    }),
    [filterLevels, filters, topColumns, topRows],
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

  const dimensionOptions = DIMENSION_OPTIONS.filter((option) =>
    availableDimensions.includes(option.value as OlapDimension),
  )

  const selectedFilterDimensions = useMemo(
    () => [query.rowDimension, query.columnDimension] as OlapDimension[],
    [query.columnDimension, query.rowDimension],
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
    measure: query.measure,
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
    updateQuery({
      measure: 'inventory',
      rowDimension: 'store',
      columnDimension: 'time',
      rowLevelIndex: 2,
      columnLevelIndex: 1,
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

        <div className="explorer-config-grid">
          <div className="dimension-control-field">
            <label htmlFor="measure-select">Measure</label>
            <select
              className="workspace-control"
              id="measure-select"
              value={query.measure}
              onChange={(event) => updateQuery({ measure: event.target.value })}
            >
              {MEASURE_OPTIONS.map((option) => (
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

          <div className="dimension-control-field">
            <label htmlFor="row-dimension">Truc dong (Row Axis)</label>
            <div className="dimension-control-line">
                <select
                  className="workspace-control"
                  id="row-dimension"
                  value={query.rowDimension}
                  onChange={(event) =>
                  updateQuery({ rowDimension: event.target.value as OlapDimension })
                }
              >
                {dimensionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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

          <div className="dimension-control-field">
            <label htmlFor="column-dimension">Truc cot (Column Axis)</label>
            <div className="dimension-control-line">
                <select
                  className="workspace-control"
                  id="column-dimension"
                  value={query.columnDimension}
                  onChange={(event) =>
                  updateQuery({ columnDimension: event.target.value as OlapDimension })
                }
              >
                {dimensionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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
        </div>

        <div className="action-row">
          <button className="btn-secondary" type="button" onClick={pivot}>
            Pivot Axis
          </button>
        </div>
      </section>

      <section className="content-card">
        <h3>Bo loc nghiep vu</h3>
        <div className="filters-grid">
          {selectedFilterDimensions.map((dimension) => {
            const isAxisDimension = dimension === query.rowDimension || dimension === query.columnDimension
            const levelIndex = effectiveFilterLevels[dimension]

            return (
              <div className="filter-field" key={dimension}>
                <label htmlFor={`olap-filter-level-${dimension}`}>
                  {DIMENSION_LABELS[dimension]} - {OLAP_LEVEL_OPTIONS[dimension][levelIndex]?.label ?? '-'}
                </label>

                {!isAxisDimension ? (
                  <select
                    id={`olap-filter-level-${dimension}`}
                    value={String(filterLevels[dimension])}
                    onChange={(event) => updateFilterLevel(dimension, Number(event.target.value))}
                  >
                    {OLAP_LEVEL_OPTIONS[dimension].map((option, index) => (
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
        {isFilterLoading ? <p className="card-note">Dang tai members tu cube...</p> : null}
        {!isFilterLoading && filterError ? <p className="card-note">{filterError}</p> : null}
      </section>

      {isLoading ? <Loading /> : null}
      {!isLoading && error ? <ErrorState message={error} /> : null}

      {!isLoading && !error ? (
        <section className="content-card">
          <div className="card-header">
            <h3>Ket qua pivot tu API</h3>
            <span className="badge-note">Total: {formatNumber(result.total)}</span>
          </div>
          <PivotTable rowHeader={result.rowHeader} columnHeaders={result.columnHeaders} rows={result.rows} />
          <p className="card-note">
            Cot hien tai: {result.columnHeader}. Row level: {result.rowLevelLabel}. Column level:{' '}
            {result.columnLevelLabel}.
          </p>
        </section>
      ) : null}
    </div>
  )
}
