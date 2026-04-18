import { useEffect, useMemo, useState } from 'react'
import type { ReportData } from '../types/report'
import { EMPTY_REPORT_DATA, MOCK_REPORT_DATA } from '../utils/constants'

export function useReport(reportId: number) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ReportData | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    const timer = window.setTimeout(() => {
      const nextData = MOCK_REPORT_DATA[reportId]

      if (!nextData) {
        setError('Không tìm thấy dữ liệu mock cho report này.')
        setData(null)
      } else {
        setData(nextData)
      }

      setIsLoading(false)
    }, 260)

    return () => window.clearTimeout(timer)
  }, [reloadKey, reportId])

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
