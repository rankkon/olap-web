import { useEffect, useMemo, useState } from 'react'
import { fetchReportById } from '../api/reportApi'
import type { ReportData } from '../types/report'
import { mapReportResponseToReportData } from '../utils/reportMapper'

const EMPTY_REPORT_DATA: ReportData = {
  id: 0,
  title: 'No data',
  description: 'No report data returned.',
  kpis: [],
  barSeries: [],
  lineSeries: [],
  pieSeries: [],
  columns: [],
  rows: [],
}

export function useReport(reportId: number, year?: number) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ReportData | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isActive = true

    const run = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const report = await fetchReportById(reportId, year)
        if (!isActive) {
          return
        }

        setData(mapReportResponseToReportData(reportId, report))
      } catch (err) {
        if (!isActive) {
          return
        }

        const message = err instanceof Error ? err.message : 'Không thể tải dữ liệu từ backend.'
        setError(message)
        setData(null)
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void run()
    return () => {
      isActive = false
    }
  }, [reloadKey, reportId, year])

  const resolvedData = useMemo(() => data ?? EMPTY_REPORT_DATA, [data])

  const refetch = () => {
    setReloadKey((prev) => prev + 1)
  }

  return {
    data: resolvedData,
    isLoading,
    error,
    refetch,
  }
}
