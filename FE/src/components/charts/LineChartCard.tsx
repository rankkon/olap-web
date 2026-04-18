import EmptyState from '../common/EmptyState'
import type { ChartPoint } from '../../types/report'

interface LineChartCardProps {
  title: string
  points: ChartPoint[]
}

interface ScaledPoint {
  x: number
  y: number
}

function buildScaledPoints(points: ChartPoint[]): ScaledPoint[] {
  if (points.length === 0) {
    return []
  }

  const maxValue = Math.max(...points.map((point) => point.value), 1)
  const minValue = Math.min(...points.map((point) => point.value), 0)
  const range = Math.max(maxValue - minValue, 1)

  if (points.length === 1) {
    return [{ x: 50, y: 36 }]
  }

  return points.map((point, index) => {
    const x = ((index + 0.5) / points.length) * 100
    const y = 68 - ((point.value - minValue) / range) * 56
    return { x, y }
  })
}

function toPolyline(points: ScaledPoint[]): string {
  if (points.length === 0) {
    return ''
  }

  if (points.length === 1) {
    const point = points[0]
    return `${point.x},${point.y} ${point.x},${point.y}`
  }

  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

export default function LineChartCard({ title, points }: LineChartCardProps) {
  if (points.length === 0) {
    return <EmptyState title={title} />
  }

  const minColumnWidth = 140
  const minContentWidth = points.length * minColumnWidth
  const gridTemplateColumns = `repeat(${points.length}, minmax(0, 1fr))`
  const scaledPoints = buildScaledPoints(points)
  const polyline = toPolyline(scaledPoints)

  return (
    <section className="chart-card">
      <h3>{title}</h3>
      <div className="line-scroll-wrap">
        <div className="line-content" style={{ width: `max(100%, ${minContentWidth}px)` }}>
          <div className="line-chart-shell">
            <div className="line-grid" style={{ gridTemplateColumns }}>
              {points.map((point, index) => (
                <span className="line-grid-col" key={`${point.label}-${index}`} />
              ))}
            </div>
            <svg className="line-chart" viewBox="0 0 100 72" preserveAspectRatio="none" role="img">
              <polyline points={polyline} />
              {scaledPoints.map((point, index) => (
                <circle className="line-point" cx={point.x} cy={point.y} key={`point-${index}`} r="1.2" />
              ))}
            </svg>
          </div>
          <div className="line-labels" style={{ gridTemplateColumns }}>
            {points.map((point, index) => (
              <span className="line-label" key={`${point.label}-${index}`} title={point.label}>
                {point.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
