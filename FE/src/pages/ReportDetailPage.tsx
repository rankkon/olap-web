import { Navigate, useParams } from 'react-router-dom'
import { REPORT_ROUTES } from '../utils/constants'
import ReportPageScaffold from './ReportPageScaffold'

export default function ReportDetailPage() {
  const { id } = useParams()
  const reportId = Number(id)
  const reportMeta = REPORT_ROUTES.find((report) => report.id === reportId)

  if (!reportMeta) {
    return <Navigate to="/reports" replace />
  }

  return (
    <ReportPageScaffold
      reportId={reportMeta.id}
      title={reportMeta.fullTitle}
      description={reportMeta.description}
    />
  )
}

