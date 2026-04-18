import { NavLink } from 'react-router-dom'
import { REPORT_ROUTES, SIDEBAR_LINKS } from '../../utils/constants'

function isActiveClass(isActive: boolean) {
  return isActive ? 'nav-link nav-link-active' : 'nav-link'
}

function shortReportTitle(fullTitle: string): string {
  return fullTitle.replace(/^bao cao\s*\d+\s*-\s*/i, '')
}

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <p className="brand-kicker">DWH Team</p>
        <h2>OLAP Web</h2>
      </div>

      <nav aria-label="Main">
        <ul className="nav-list">
          {SIDEBAR_LINKS.map((item) => (
            <li key={item.to}>
              <NavLink className={({ isActive }) => isActiveClass(isActive)} to={item.to} end>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <section className="sidebar-section">
        <p className="sidebar-caption">Report Quick Access</p>
        <ul className="report-shortcuts">
          {REPORT_ROUTES.map((report) => (
            <li key={report.id}>
              <NavLink className={({ isActive }) => isActiveClass(isActive)} to={report.path}>
                <span>{report.shortTitle}</span>
                <small>{shortReportTitle(report.fullTitle)}</small>
              </NavLink>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
