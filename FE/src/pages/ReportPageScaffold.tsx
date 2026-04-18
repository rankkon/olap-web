import BarChartCard from '../components/charts/BarChartCard'
import LineChartCard from '../components/charts/LineChartCard'
import PieChartCard from '../components/charts/PieChartCard'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import Loading from '../components/common/Loading'
import PageHeader from '../components/common/PageHeader'
import MultiSelectFilter from '../components/common/MultiSelectFilter'
import ReportTable from '../components/tables/ReportTable'
import { useFilters } from '../hooks/useFilters'
import { useReport } from '../hooks/useReport'
import {
  CITY_OPTIONS,
  CUSTOMER_OPTIONS,
  PRODUCT_OPTIONS,
  STORE_OPTIONS,
  TIME_OPTIONS,
} from '../utils/constants'

interface ReportPageScaffoldProps {
  reportId: number
  title: string
  description: string
}

export default function ReportPageScaffold({
  reportId,
  title,
  description,
}: ReportPageScaffoldProps) {
  const { data, isLoading, error, refetch } = useReport(reportId)
  const { filters, updateFilter, resetFilters, activeFilterCount } = useFilters({
    time: [TIME_OPTIONS[0].value],
  })

  return (
    <div className="page-stack">
      <PageHeader
        title={title}
        description={description}
        action={
          <div className="header-action-row">
            <span className="badge-note">Filters: {activeFilterCount}</span>
            <button className="btn-primary" type="button" onClick={refetch}>
              Refresh Mock
            </button>
          </div>
        }
      />

      <section className="content-card">
        <div className="card-header">
          <h3>B? l?c báo cáo</h3>
          <button className="btn-secondary" type="button" onClick={resetFilters}>
            Reset
          </button>
        </div>
        <div className="filters-grid">
          <MultiSelectFilter
            id="time-filter"
            label="K? th?i gian"
            options={TIME_OPTIONS}
            value={filters.time}
            onChange={(next) => updateFilter('time', next)}
          />
          <MultiSelectFilter
            id="city-filter"
            label="Thành ph?"
            options={CITY_OPTIONS}
            value={filters.city}
            onChange={(next) => updateFilter('city', next)}
          />
          <MultiSelectFilter
            id="store-filter"
            label="C?a hàng"
            options={STORE_OPTIONS}
            value={filters.store}
            onChange={(next) => updateFilter('store', next)}
          />
          <MultiSelectFilter
            id="product-filter"
            label="S?n ph?m"
            options={PRODUCT_OPTIONS}
            value={filters.product}
            onChange={(next) => updateFilter('product', next)}
          />
          <MultiSelectFilter
            id="customer-filter"
            label="Khách hàng"
            options={CUSTOMER_OPTIONS}
            value={filters.customer}
            onChange={(next) => updateFilter('customer', next)}
          />
        </div>
      </section>

      {isLoading ? <Loading /> : null}
      {!isLoading && error ? <ErrorState message={error} onRetry={refetch} /> : null}

      {!isLoading && !error && data.kpis.length === 0 ? <EmptyState /> : null}

      {!isLoading && !error && data.kpis.length > 0 ? (
        <>
          <section className="kpi-grid">
            {data.kpis.map((kpi) => (
              <article className="kpi-card" key={kpi.label}>
                <p>{kpi.label}</p>
                <h3>{kpi.value}</h3>
                <small>{kpi.trend ?? 'TODO: tính trend t? cube'}</small>
              </article>
            ))}
          </section>

          <section className="charts-grid">
            <BarChartCard title="Phân b? chính" points={data.barSeries} />
            <LineChartCard title="Xu hu?ng theo th?i gian" points={data.lineSeries} />
            <PieChartCard title="T? tr?ng danh m?c" points={data.pieSeries} />
          </section>

          <ReportTable title="B?ng d? li?u chi ti?t" columns={data.columns} rows={data.rows} />
        </>
      ) : null}
    </div>
  )
}


