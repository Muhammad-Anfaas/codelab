import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { initials } from '../utils/format';
import './Topbar.css';

/**
 * Top bar: brand on the left, user menu on the right.
 * On small screens a menu button appears to open the sidebar drawer.
 *
 * Props
 *  - user:         { name, email }
 *  - roleLabel:    "Teacher", "Administrator"…
 *  - settingsPath: where the Settings item in the dropdown goes
 *  - onMenuClick:  toggles the sidebar drawer (mobile)
 *  - onLogout:     called from the dropdown's Logout item
 */
export default function Topbar({ user, roleLabel, settingsPath, onMenuClick, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the dropdown on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;

    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="menu-btn"
          onClick={onMenuClick}
          aria-label="Toggle navigation"
        >
          <Icon name="menu" size={22} />
        </button>

        <div className="brand">
          <span className="brand-mark" aria-hidden="true">&lt;/&gt;</span>
          <span className="brand-name">Code<em>lab</em></span>
        </div>
      </div>

      <div className="user-menu" ref={menuRef}>
        <button
          type="button"
          className="user-btn"
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
          <span className="user-text">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{roleLabel}</span>
          </span>
          <Icon name="chevron" size={16} className="user-chevron" />
        </button>

        {menuOpen && (
          <div className="dropdown" role="menu">
            <div className="dropdown-header">
              <div className="dropdown-name">{user.name}</div>
              <div className="dropdown-email">{user.email}</div>
            </div>
            <div className="dropdown-divider" />
            <Link
              to={settingsPath}
              className="dropdown-item"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
            >
              <Icon name="settings" size={16} />
              Settings
            </Link>
            <button type="button" className="dropdown-item" role="menuitem" onClick={onLogout}>
              <Icon name="logout" size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
