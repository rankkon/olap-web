import { Link } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import { REPORT_ROUTES } from '../utils/constants'

export default function ReportMenuPage() {
  return (
    <div className="page-stack">
      <PageHeader
        title="Danh sách 9 báo cáo BTL"
        description="Chọn báo cáo để xem khung giao diện, filter, chart và dữ liệu lấy từ API."
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
