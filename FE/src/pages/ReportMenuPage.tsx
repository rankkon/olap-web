import { Link } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import { REPORT_ROUTES } from '../utils/constants'

export default function ReportMenuPage() {
  return (
    <div className="page-stack">
      <PageHeader
        title="Danh sách báo cáo"
        description="Chọn báo cáo để xem biểu đồ, bảng dữ liệu và bộ lọc."
      />

      <section className="report-menu-grid">
        {REPORT_ROUTES.map((report) => (
          <article className="report-menu-card" key={report.id}>
            <span>{report.shortTitle}</span>
            <h3>{report.fullTitle}</h3>
            <p>{report.description}</p>
            <Link to={report.path}>Mở báo cáo</Link>
          </article>
        ))}
      </section>
    </div>
  )
}
