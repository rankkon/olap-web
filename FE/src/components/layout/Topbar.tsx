import { useLocation } from 'react-router-dom'

function resolvePageLabel(pathname: string): string {
  if (pathname === '/') {
    return 'Tổng quan'
  }
  if (pathname.startsWith('/olap')) {
    return 'OLAP Explorer'
  }
  if (pathname.startsWith('/reports')) {
    return 'Báo cáo'
  }
  return 'Màn hình làm việc'
}

export default function Topbar() {
  const location = useLocation()
  const pageLabel = resolvePageLabel(location.pathname)

  return (
    <header className="topbar">
      <div>
        <p className="topbar-label">Mô-đun hiện tại</p>
        <h3>{pageLabel}</h3>
      </div>
    </header>
  )
}
