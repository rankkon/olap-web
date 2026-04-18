import PageHeader from '../components/common/PageHeader'
import MultiSelectFilter from '../components/common/MultiSelectFilter'
import PivotTable from '../components/tables/PivotTable'
import { useFilters } from '../hooks/useFilters'
import { useOlap } from '../hooks/useOlap'
import {
  CITY_OPTIONS,
  CUSTOMER_OPTIONS,
  DIMENSION_OPTIONS,
  HIERARCHY_LEVELS,
  MEASURE_OPTIONS,
  PRODUCT_OPTIONS,
  STORE_OPTIONS,
  TIME_OPTIONS,
} from '../utils/constants'
import { formatNumber } from '../utils/format'

export default function OlapExplorerPage() {
  const { query, result, lastAction, canDrillDown, canRollUp, drillDown, rollUp, pivot, updateQuery } =
    useOlap()
  const { filters, updateFilter, resetFilters, activeFilterCount } = useFilters({
    time: [TIME_OPTIONS[0].value],
  })

  return (
    <div className="page-stack">
      <PageHeader
        title="OLAP Explorer"
        description="Khung thao tác drill-down, roll-up, pivot và b? l?c d? chu?n b? n?i tr?c ti?p cube/SSAS."
        action={<span className="badge-note">Last action: {lastAction}</span>}
      />

      <section className="content-card">
        <div className="card-header">
          <h3>C?u hình truy v?n</h3>
          <div className="header-action-row">
            <span className="badge-note">Active filters: {activeFilterCount}</span>
            <button className="btn-secondary" type="button" onClick={resetFilters}>
              Reset filters
            </button>
          </div>
        </div>

        <div className="explorer-config-grid">
          <label>
            Measure
            <select value={query.measure} onChange={(event) => updateQuery({ measure: event.target.value })}>
              {MEASURE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Row Dimension
            <select
              value={query.rowDimension}
              onChange={(event) => updateQuery({ rowDimension: event.target.value })}
            >
              {DIMENSION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Column Dimension
            <select
              value={query.columnDimension}
              onChange={(event) => updateQuery({ columnDimension: event.target.value })}
            >
              {DIMENSION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Hierarchy Level
            <select
              value={query.hierarchyLevel}
              onChange={(event) => updateQuery({ hierarchyLevel: event.target.value })}
            >
              {HIERARCHY_LEVELS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="action-row">
          <button className="btn-primary" disabled={!canDrillDown} type="button" onClick={drillDown}>
            Drill Down
          </button>
          <button className="btn-secondary" disabled={!canRollUp} type="button" onClick={rollUp}>
            Roll Up
          </button>
          <button className="btn-secondary" type="button" onClick={pivot}>
            Pivot Axis
          </button>
        </div>
      </section>

      <section className="content-card">
        <h3>B? l?c dimension</h3>
        <div className="filters-grid">
          <MultiSelectFilter
            id="olap-time-filter"
            label="K? th?i gian"
            options={TIME_OPTIONS}
            value={filters.time}
            onChange={(next) => updateFilter('time', next)}
          />
          <MultiSelectFilter
            id="olap-city-filter"
            label="Thành ph?"
            options={CITY_OPTIONS}
            value={filters.city}
            onChange={(next) => updateFilter('city', next)}
          />
          <MultiSelectFilter
            id="olap-store-filter"
            label="C?a hàng"
            options={STORE_OPTIONS}
            value={filters.store}
            onChange={(next) => updateFilter('store', next)}
          />
          <MultiSelectFilter
            id="olap-product-filter"
            label="S?n ph?m"
            options={PRODUCT_OPTIONS}
            value={filters.product}
            onChange={(next) => updateFilter('product', next)}
          />
          <MultiSelectFilter
            id="olap-customer-filter"
            label="Khách hàng"
            options={CUSTOMER_OPTIONS}
            value={filters.customer}
            onChange={(next) => updateFilter('customer', next)}
          />
        </div>
      </section>

      <section className="content-card">
        <div className="card-header">
          <h3>K?t qu? pivot mock</h3>
          <span className="badge-note">Total: {formatNumber(result.total)}</span>
        </div>
        <PivotTable rowHeader="Dimension Member" columnHeaders={result.columnHeaders} rows={result.rows} />
        <p className="card-note">
          TODO: Khi cube hoàn t?t, thay block mock này b?ng API OLAP th?t t? backend.
        </p>
      </section>
    </div>
  )
}


