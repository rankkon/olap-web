export type OlapDimension = 'time' | 'store' | 'product' | 'customer'

export interface OlapLevelOption {
  label: string
}

export const OLAP_LEVEL_OPTIONS: Record<OlapDimension, OlapLevelOption[]> = {
  time: [{ label: 'Nam' }, { label: 'Quy' }, { label: 'Thang' }],
  store: [{ label: 'Bang' }, { label: 'Thanh pho' }, { label: 'Ma cua hang' }],
  product: [{ label: 'Mat hang' }],
  customer: [{ label: 'Thanh pho' }, { label: 'Ten khach hang' }],
}

export interface OlapQueryState {
  measure: string
  rowDimension: OlapDimension
  columnDimension: OlapDimension
  rowLevelIndex: number
  columnLevelIndex: number
}

export interface PivotRow {
  label: string
  values: number[]
}

export interface OlapPivotResult {
  rowHeader: string
  columnHeader: string
  rowLevelLabel: string
  columnLevelLabel: string
  columnHeaders: string[]
  rows: PivotRow[]
  total: number
}
