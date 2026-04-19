import { useEffect, useState } from 'react'
import BarChartCard from '../components/charts/BarChartCard'
import LineChartCard from '../components/charts/LineChartCard'
import PieChartCard from '../components/charts/PieChartCard'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import Loading from '../components/common/Loading'
import PageHeader from '../components/common/PageHeader'
import ReportTable from '../components/tables/ReportTable'
import { useReport } from '../hooks/useReport'
import { TIME_OPTIONS } from '../utils/constants'

interface ReportPageScaffoldProps {
  reportId: number
  title: string
  description: string
  filterMode?: 'none' | 'year'
}

const DEFAULT_YEAR_VALUE = TIME_OPTIONS[0]?.value ?? String(new Date().getFullYear())

function resolveYear(value: string): number {
  const parsed = Number.parseInt(value.slice(0, 4), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : new Date().getFullYear()
}

export default function ReportPageScaffold({
  reportId,
  title,
  description,
  filterMode = 'none',
}: ReportPageScaffoldProps) {
  const [selectedYear, setSelectedYear] = useState<number>(resolveYear(DEFAULT_YEAR_VALUE))
  const requiresYearFilter = filterMode === 'year'
  const yearForApi = requiresYearFilter ? selectedYear : undefined
  const { data, isLoading, error, refetch } = useReport(reportId, yearForApi)

  useEffect(() => {
    setSelectedYear(resolveYear(DEFAULT_YEAR_VALUE))
  }, [reportId, filterMode])

  const resetFilters = () => {
    setSelectedYear(resolveYear(DEFAULT_YEAR_VALUE))
  }

  return (
    <div className="page-stack">
      <PageHeader
        title={title}
        description={description}
        action={
          <div className="header-action-row">
            <span className="badge-note">Bộ lọc: {requiresYearFilter ? 1 : 0}</span>
            <button className="btn-primary" type="button" onClick={refetch}>
              Làm mới dữ liệu
            </button>
          </div>
        }
      />

      {requiresYearFilter ? (
        <section className="content-card">
          <div className="card-header">
            <h3>Bộ lọc báo cáo</h3>
            <button className="btn-secondary" type="button" onClick={resetFilters}>
              Đặt lại
            </button>
          </div>
          <div className="filters-grid">
            <div className="filter-field">
              <label htmlFor="report-year-filter">Năm</label>
              <select
                id="report-year-filter"
                className="workspace-control"
                value={String(selectedYear)}
                onChange={(event) => setSelectedYear(resolveYear(event.target.value))}
              >
                {TIME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
      ) : null}

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
                <small>{kpi.trend ?? '-'}</small>
              </article>
            ))}
          </section>

          <section className="charts-grid">
            <LineChartCard title="Xu hướng dữ liệu" points={data.lineSeries} />
            <BarChartCard title="Phân bố chính" points={data.barSeries} />
            <PieChartCard title="Tỷ trọng danh mục" points={data.pieSeries} />
          </section>

          <ReportTable title="Bảng dữ liệu chi tiết" columns={data.columns} rows={data.rows} />
        </>
      ) : null}
    </div>
  )
}
