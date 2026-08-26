import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { NAVIGATION, ROLE_HOME, ROLE_LABELS } from '../config/navigation';
import { mockCurrentUsers } from '../mock/data';
import './DashboardLayout.css';

/**
 * The shell every dashboard page renders inside: topbar + sidebar + content.
 * React Router renders the matched child route into <Outlet />.
 *
 * Props
 *  - role: 'ADMIN' | 'TEACHER' | 'STUDENT'
 *
 * SECURITY NOTE: the `role` prop only picks which navigation to draw. It is
 * a UI convenience, not authorization. Anyone can type /admin into the URL
 * bar. Real access control happens on the backend, which will refuse to
 * return admin data to a non-admin session no matter what the UI shows.
 */
export default function DashboardLayout({ role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // MOCK: look the "logged-in" user up by role.
  // Later: this comes from the backend session (GET /api/users/me).
  const user = mockCurrentUsers[role];
  const navItems = NAVIGATION[role];
  const roleLabel = ROLE_LABELS[role];

  function handleLogout() {
    // TODO (backend step): POST /api/auth/logout, then clear session state.
    navigate('/login', { replace: true });
  }

  return (
    <div className="dashboard">
      <Topbar
        user={user}
        roleLabel={roleLabel}
        settingsPath={`${ROLE_HOME[role]}/settings`}
        onMenuClick={() => setSidebarOpen((open) => !open)}
        onLogout={handleLogout}
      />

      <Sidebar
        items={navItems}
        roleLabel={roleLabel}
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <main className="dashboard-main">
        {/* Pages read { user, role } with useOutletContext() */}
        <Outlet context={{ user, role }} />
      </main>
    </div>
  );
}
