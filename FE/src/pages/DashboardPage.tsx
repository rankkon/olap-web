import { Link } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import { REPORT_ROUTES } from '../utils/constants'

export default function DashboardPage() {
  return (
    <div className="page-stack">
      <PageHeader
        title="Tổng quan hệ thống OLAP"
        description="Màn hình đơn giản để điều hướng nhanh tới Explorer và các báo cáo."
        action={
          <Link className="btn-primary" to="/olap">
            Mở OLAP Explorer
          </Link>
        }
      />

      <section className="content-card">
        <div className="card-header">
          <h3>Truy cập nhanh</h3>
          <Link className="text-link" to="/reports">
            Xem danh sách báo cáo
          </Link>
        </div>
        <div className="action-row">
          <Link className="btn-secondary" to="/olap">Mở OLAP Explorer</Link>
          <Link className="btn-secondary" to="/reports">Mở khu vực báo cáo</Link>
        </div>
      </section>

      <section className="content-card">
        <div className="card-header">
          <h3>Báo cáo gần đây</h3>
        </div>
        <div className="report-menu-grid">
          {REPORT_ROUTES.slice(0, 4).map((report) => (
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
