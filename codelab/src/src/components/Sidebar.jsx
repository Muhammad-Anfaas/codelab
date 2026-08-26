import { NavLink } from 'react-router-dom';
import Icon from './Icon';
import './Sidebar.css';

/**
 * Left navigation. Receives its links from config/navigation.js so the same
 * component serves all three roles.
 *
 * Props
 *  - items:     [{ label, to, icon, end? }]
 *  - roleLabel: text shown above the links ("Teacher", "Administrator"…)
 *  - open:      whether the drawer is open on small screens
 *  - onNavigate: called when a link is clicked (closes the mobile drawer)
 *  - onLogout:  called when the Logout button is pressed
 */
export default function Sidebar({ items, roleLabel, open, onNavigate, onLogout }) {
  return (
    <aside className={`sidebar${open ? ' sidebar-open' : ''}`} aria-label="Main navigation">
      <div className="sidebar-role">
        <span className="sidebar-role-comment">//</span> {roleLabel}
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
            onClick={onNavigate}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="nav-link nav-link-button" onClick={onLogout}>
          <Icon name="logout" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
