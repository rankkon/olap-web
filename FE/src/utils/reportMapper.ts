import type { ReportResponseDto } from '../types/api'
import type { ChartPoint, KpiMetric, ReportData, TableColumn, TableRow } from '../types/report'

function toNumber(value: string | number | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (!value) {
    return 0
  }

  const raw = String(value).trim()
  if (!raw) {
    return 0
  }

  const invariant = Number.parseFloat(raw.replace(/,/g, ''))
  if (Number.isFinite(invariant)) {
    return invariant
  }

  const viStyle = Number.parseFloat(raw.replace(/\./g, '').replace(',', '.'))
  if (Number.isFinite(viStyle)) {
    return viStyle
  }

  return 0
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)
}

function normalizeColumnLabel(raw: string): string {
  const parts = [...raw.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1])
  if (parts.length === 0) {
    return raw
  }

  const last = parts[parts.length - 1]
  if (last.toUpperCase() === 'MEMBER_CAPTION' && parts.length >= 2) {
    return parts[parts.length - 2]
  }

  return last
}

function toTableColumns(sourceColumns: string[]): TableColumn[] {
  return sourceColumns.map((sourceColumn, index) => ({
    key: `c${index}`,
    label: normalizeColumnLabel(sourceColumn),
    align: 'center',
  }))
}

function toTableRows(sourceColumns: string[], sourceRows: Record<string, string>[]): TableRow[] {
  return sourceRows.map((sourceRow) => {
    const targetRow: TableRow = {}
    sourceColumns.forEach((sourceColumn, index) => {
      const key = `c${index}`
      const rawValue = sourceRow[sourceColumn] ?? ''
      targetRow[key] = index === 0 ? rawValue : toNumber(rawValue)
    })
    return targetRow
  })
}

function buildKpis(series: ChartPoint[]): KpiMetric[] {
  if (series.length === 0) {
    return []
  }

  const total = series.reduce((sum, point) => sum + point.value, 0)
  const average = total / series.length
  const maxPoint = series.reduce((max, current) => (current.value > max.value ? current : max), series[0])

  return [
    {
      label: 'Tổng giá trị',
      value: formatNumber(total),
      trend: `${series.length} điểm dữ liệu`,
    },
    {
      label: 'Giá trị trung bình',
      value: formatNumber(average),
    },
    {
      label: 'Giá trị lớn nhất',
      value: formatNumber(maxPoint.value),
      trend: maxPoint.label,
    },
  ]
}

function toChartSeries(series: { label: string; value: number }[]): {
  barSeries: ChartPoint[]
  lineSeries: ChartPoint[]
  pieSeries: ChartPoint[]
} {
  const normalized = series.map((item) => ({
    label: item.label,
    value: toNumber(item.value),
  }))

  const sorted = [...normalized].sort((a, b) => b.value - a.value)
  return {
    barSeries: sorted.slice(0, 10),
    lineSeries: normalized.slice(0, 12),
    pieSeries: sorted.slice(0, 5),
  }
}

export function mapReportResponseToReportData(reportId: number, source: ReportResponseDto): ReportData {
  const columns = toTableColumns(source.table.columns)
  const rows = toTableRows(source.table.columns, source.table.rows)
  const chartSeries = toChartSeries(source.series)
  const kpis = buildKpis(source.series)

  return {
    id: reportId,
    title: source.title,
    description: `Dữ liệu từ cube ${source.cube}`,
    kpis,
    barSeries: chartSeries.barSeries,
    lineSeries: chartSeries.lineSeries,
    pieSeries: chartSeries.pieSeries,
    columns,
    rows,
  }
}
