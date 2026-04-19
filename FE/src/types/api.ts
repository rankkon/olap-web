export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T | null
  timestampUtc: string
}

export interface QueryResultDto {
  columns: string[]
  rows: Record<string, string>[]
  rowCount: number
}

export interface MetricPointDto {
  label: string
  value: number
}

export interface ReportResponseDto {
  reportKey: string
  title: string
  cube: string
  mdx: string
  table: QueryResultDto
  series: MetricPointDto[]
}

export interface OlapPivotRowDto {
  label: string
  secondaryLabel?: string | null
  values: number[]
}

export interface OlapMemberFilterDto {
  dimension: string
  levelIndex: number
  members: string[]
}

export interface OlapPivotResponseDto {
  cube: string
  measure: string
  rowDimension: string
  columnDimension: string
  rowLevelLabel: string
  columnLevelLabel: string
  rowHeader: string
  secondaryRowHeader?: string | null
  columnHeader: string
  columnHeaders: string[]
  rows: OlapPivotRowDto[]
  total: number
  mdx: string
}

export interface OlapLevelMetadataDto {
  key: string
  label: string
  levelExpression: string
  hierarchyKey?: string | null
  hierarchyLabel?: string | null
  hierarchyOrder?: number | null
}

export interface OlapDimensionMetadataDto {
  key: string
  label: string
  levels: OlapLevelMetadataDto[]
}

export interface OlapMeasureMetadataDto {
  key: string
  label: string
  cubeType: string
  cubeName: string
  measureExpression: string
  dimensions: OlapDimensionMetadataDto[]
}

export interface OlapMetadataResponseDto {
  measures: OlapMeasureMetadataDto[]
}
