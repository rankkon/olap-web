import EmptyState from '../common/EmptyState'
import type { ChartPoint } from '../../types/report'
import { formatNumber } from '../../utils/format'

interface BarChartCardProps {
  title: string
  points: ChartPoint[]
}

export default function BarChartCard({ title, points }: BarChartCardProps) {
  if (points.length === 0) {
    return <EmptyState title={title} />
  }

  const maxValue = Math.max(...points.map((point) => point.value), 1)

  return (
    <section className="chart-card">
      <h3>{title}</h3>
      <div className="bar-chart">
        {points.map((point) => {
          const ratio = Math.max(8, Math.round((point.value / maxValue) * 100))
          const valueText = formatNumber(point.value)

          return (
            <div className="bar-row" key={`${point.label}-${point.value}`}>
              <div className="bar-row-meta">
                <span className="bar-label" title={point.label}>
                  {point.label}
                </span>
                <strong className="bar-value" title={valueText}>
                  {valueText}
                </strong>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${ratio}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
