import { Link } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import { DASHBOARD_HIGHLIGHTS, REPORT_ROUTES } from '../utils/constants'

export default function DashboardPage() {
  return (
    <div className="page-stack">
      <PageHeader
        title="Dashboard tổng quan OLAP"
        description="Khung giao diện frontend cho bài tập lớn Kho dữ liệu, ưu tiên sẵn sàng tích hợp cube và API sau."
        action={
          <Link className="btn-primary" to="/olap">
            Mở OLAP Explorer
          </Link>
        }
      />

      <section className="kpi-grid">
        {DASHBOARD_HIGHLIGHTS.map((item) => (
          <article className="kpi-card" key={item.label}>
            <p>{item.label}</p>
            <h3>{item.value}</h3>
            <small>{item.note}</small>
          </article>
        ))}
      </section>

      <section className="content-card">
        <div className="card-header">
          <h3>Điều hướng nhanh</h3>
          <Link className="text-link" to="/reports">
            Xem tất cả báo cáo
          </Link>
        </div>
        <div className="report-menu-grid">
          <article className="report-menu-card report-menu-card-accent">
            <span>EXPLORER</span>
            <h3>OLAP Explorer</h3>
            <p>Khoan sâu, khoan lên, pivot và chọn measure/dimension trực tiếp.</p>
            <Link to="/olap">Mở explorer</Link>
          </article>
          {REPORT_ROUTES.map((report) => (
            <article className="report-menu-card" key={report.id}>
              <span>{report.shortTitle}</span>
              <h3>{report.fullTitle}</h3>
              <p>{report.description}</p>
              <Link to={report.path}>Mở báo cáo</Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
