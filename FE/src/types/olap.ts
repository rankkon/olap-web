export interface OlapQueryState {
  measure: string
  rowDimension: string
  columnDimension: string
  hierarchyLevel: string
}

export interface PivotRow {
  label: string
  values: number[]
}

export interface OlapPivotResult {
  columnHeaders: string[]
  rows: PivotRow[]
  total: number
}
