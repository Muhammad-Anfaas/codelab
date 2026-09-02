import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import Sidebar from './Sidebar';
import Topbar from './Topbar';

import {
  NAVIGATION,
  ROLE_HOME,
  ROLE_LABELS,
} from '../config/navigation';

import { useAuth } from '../auth/AuthProvider';

import './DashboardLayout.css';

export default function DashboardLayout({ role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();

  const {
    user: authUser,
    profile,
    logout,
  } = useAuth();

  const navItems = NAVIGATION[role];
  const roleLabel = ROLE_LABELS[role];

  const user = profile
    ? {
        id: profile.id,
        name: profile.full_name,
        email: profile.email,
        role: profile.role.toUpperCase(),
      }
    : null;

  async function handleLogout() {
    await logout();

    navigate('/login', {
      replace: true,
    });
  }

  return (
    <div className="dashboard">
      <Topbar
        user={user}
        roleLabel={roleLabel}
        settingsPath={`${ROLE_HOME[role]}/settings`}
        onMenuClick={() =>
          setSidebarOpen((open) => !open)
        }
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
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="dashboard-main">
        <Outlet
          context={{
            user,
            authUser,
            profile,
            role,
          }}
        />
      </main>
    </div>
  );
}