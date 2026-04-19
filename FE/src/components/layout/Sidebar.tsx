import { NavLink } from 'react-router-dom'
import { SIDEBAR_LINKS } from '../../utils/constants'

function isActiveClass(isActive: boolean) {
  return isActive ? 'nav-link nav-link-active' : 'nav-link'
}

function toShortNavLabel(fullLabel: string): string {
  const words = fullLabel
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) {
    return '...'
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return words.map((word) => word[0]).join('').slice(0, 3).toUpperCase()
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="sidebar-head">
        <div className="brand-block">
          <p className="brand-kicker">DWH Team</p>
          <h2>OLAP Web</h2>
        </div>
        <button
          aria-label={collapsed ? 'Mo thanh ben' : 'Thu gon thanh ben'}
          className="sidebar-toggle-btn"
          onClick={onToggle}
          type="button"
        >
          {collapsed ? '\u25B6' : '\u25C0'}
        </button>
      </div>

      <nav aria-label="Main">
        <ul className="nav-list">
          {SIDEBAR_LINKS.map((item) => (
            <li key={item.to}>
              <NavLink
                className={({ isActive }) => isActiveClass(isActive)}
                title={collapsed ? item.label : undefined}
                to={item.to}
                end
              >
                <span className="sidebar-link-short">{toShortNavLabel(item.label)}</span>
                <span className="sidebar-link-text">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
