import { useLocation } from 'react-router-dom'

const cubeStatus = 'building'

function resolvePageLabel(pathname: string): string {
  if (pathname === '/') {
    return 'Dashboard'
  }
  if (pathname.startsWith('/olap')) {
    return 'OLAP Explorer'
  }
  if (pathname.startsWith('/reports')) {
    return 'Reports'
  }
  if (pathname.startsWith('/compare')) {
    return 'Validation'
  }
  return 'Workspace'
}

export default function Topbar() {
  const location = useLocation()
  const pageLabel = resolvePageLabel(location.pathname)

  return (
    <header className="topbar">
      <div>
        <p className="topbar-label">Current Module</p>
        <h3>{pageLabel}</h3>
      </div>
      <div className="topbar-actions">
        <span className={`status-badge status-${cubeStatus}`}>Cube: {cubeStatus}</span>
        <button className="btn-secondary" type="button">
          Export Snapshot
        </button>
      </div>
    </header>
  )
}
