export interface KpiMetric {
  label: string
  value: string
  trend?: string
}

export interface ChartPoint {
  label: string
  value: number
  color?: string
}

export type CellAlign = 'left' | 'center' | 'right'

export interface TableColumn {
  key: string
  label: string
  align?: CellAlign
}

export type TableRow = Record<string, string | number>

export interface ReportData {
  id: number
  title: string
  description: string
  kpis: KpiMetric[]
  barSeries: ChartPoint[]
  lineSeries: ChartPoint[]
  pieSeries: ChartPoint[]
  columns: TableColumn[]
  rows: TableRow[]
}

export interface ReportRouteMeta {
  id: number
  path: string
  shortTitle: string
  fullTitle: string
  description: string
  filterMode?: 'none' | 'year'
}
