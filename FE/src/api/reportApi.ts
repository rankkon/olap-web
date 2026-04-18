import { requestApi } from './client'
import type { ReportResponseDto } from '../types/api'

export function fetchReportById(reportId: number, year?: number): Promise<ReportResponseDto> {
  const search = new URLSearchParams()
  if (typeof year === 'number' && Number.isFinite(year) && year > 0) {
    search.set('year', String(year))
  }

  const query = search.toString()
  const suffix = query ? `?${query}` : ''
  return requestApi<ReportResponseDto>(`/api/reports/${reportId}${suffix}`)
}
