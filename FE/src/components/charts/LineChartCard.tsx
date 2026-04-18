import EmptyState from '../common/EmptyState'
import type { ChartPoint } from '../../types/report'

interface LineChartCardProps {
  title: string
  points: ChartPoint[]
}

function createPolyline(points: ChartPoint[]): string {
  if (points.length <= 1) {
    return '0,70 100,70'
  }

  const maxValue = Math.max(...points.map((point) => point.value), 1)
  const minValue = Math.min(...points.map((point) => point.value), 0)
  const range = Math.max(maxValue - minValue, 1)

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100
      const y = 70 - ((point.value - minValue) / range) * 60
      return `${x},${y}`
    })
    .join(' ')
}

export default function LineChartCard({ title, points }: LineChartCardProps) {
  if (points.length === 0) {
    return <EmptyState title={title} />
  }

  const polyline = createPolyline(points)

  return (
    <section className="chart-card">
      <h3>{title}</h3>
      <svg className="line-chart" viewBox="0 0 100 72" preserveAspectRatio="none" role="img">
        <polyline points={polyline} />
      </svg>
      <div className="line-labels">
        {points.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </section>
  )
}
