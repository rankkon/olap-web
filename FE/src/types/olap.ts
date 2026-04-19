export type OlapDimension = 'time' | 'store' | 'product' | 'customer'

export interface OlapLevelOption {
  label: string
}

export interface OlapLevelMetadata {
  key: string
  label: string
  levelExpression: string
  hierarchyKey?: string | null
  hierarchyLabel?: string | null
  hierarchyOrder?: number | null
}

export interface OlapDimensionMetadata {
  key: OlapDimension
  label: string
  levels: OlapLevelMetadata[]
}

export interface OlapMeasureMetadata {
  key: string
  label: string
  cubeType: string
  cubeName: string
  measureExpression: string
  dimensions: OlapDimensionMetadata[]
}

export interface OlapMetadata {
  measures: OlapMeasureMetadata[]
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
  secondaryLabel?: string | null
  values: number[]
}

export interface OlapPivotResult {
  rowHeader: string
  secondaryRowHeader?: string | null
  columnHeader: string
  rowLevelLabel: string
  columnLevelLabel: string
  columnHeaders: string[]
  rows: PivotRow[]
  total: number
}
