import { requestApi } from './client'
import type { OlapMemberFilterDto, OlapPivotResponseDto, QueryResultDto } from '../types/api'

export interface OlapPivotApiRequest {
  measure: string
  rowDimension: string
  columnDimension: string
  rowLevelIndex: number
  columnLevelIndex: number
  year?: number
  topRows?: number
  topColumns?: number
  filters?: OlapMemberFilterDto[]
}

export function fetchOlapPivot(payload: OlapPivotApiRequest): Promise<OlapPivotResponseDto> {
  return requestApi<OlapPivotResponseDto>('/api/olap/pivot', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function executeOlapQuery(cube: string, mdx: string): Promise<QueryResultDto> {
  return requestApi<QueryResultDto>('/api/olap/query', {
    method: 'POST',
    body: JSON.stringify({
      cube,
      mdx,
    }),
  })
}
