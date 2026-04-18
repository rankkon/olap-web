import EmptyState from '../common/EmptyState'
import type { ChartPoint } from '../../types/report'

interface PieChartCardProps {
  title: string
  points: ChartPoint[]
}

const palette = ['#0f766e', '#ea580c', '#0284c7', '#84cc16', '#f59e0b']

function buildGradient(points: ChartPoint[]): string {
  const total = points.reduce((sum, point) => sum + point.value, 0)

  if (total <= 0) {
    return 'conic-gradient(#d7dfdc 0deg 360deg)'
  }

  let cursor = 0
  const chunks = points.map((point, index) => {
    const start = cursor
    const size = (point.value / total) * 360
    cursor += size
    const color = palette[index % palette.length]
    return `${color} ${start}deg ${cursor}deg`
  })

  return `conic-gradient(${chunks.join(', ')})`
}

export default function PieChartCard({ title, points }: PieChartCardProps) {
  if (points.length === 0) {
    return <EmptyState title={title} />
  }

  const gradient = buildGradient(points)
  const total = points.reduce((sum, point) => sum + point.value, 0)

  return (
    <section className="chart-card">
      <h3>{title}</h3>
      <div className="pie-wrap">
        <div aria-hidden className="pie-chart" style={{ background: gradient }} />
        <ul className="pie-legend">
          {points.map((point, index) => {
            const color = palette[index % palette.length]
            const ratio = total > 0 ? Math.round((point.value / total) * 100) : 0
            return (
              <li key={point.label}>
                <span style={{ backgroundColor: color }} />
                <b>{point.label}</b>
                <small>{ratio}%</small>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
