
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { NAVIGATION, ROLE_HOME, ROLE_LABELS } from '../config/navigation';
// import { useAuth } from '../auth/AuthProvider';
// import { supabase } from '../lib/supabase';
// import { useEffect, useState } from 'react';
import './DashboardLayout.css';

/**
 * The shell every dashboard page renders inside: topbar + sidebar + content.
 *
 * The authenticated user/profile comes from AuthProvider.
 * Backend RLS remains responsible for authorization.
 */
export default function DashboardLayout({ role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const { user: authUser, profile, logout } = useAuth();
const [teacherId, setTeacherId] = useState(null);
  const navItems = NAVIGATION[role];
  const roleLabel = ROLE_LABELS[role];

  /*
   * Convert the Supabase profile into the shape that the
   * existing dashboard components expect.
   */
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
    navigate('/login', { replace: true });
  }
  useEffect(() => {
  async function loadTeacherId() {
    if (!profile || profile.role !== 'teacher') {
      return;
    }

    const { data, error } = await supabase
      .from('teachers')
      .select('id')
      .eq('profile_id', profile.id)
      .single();

    if (error) {
      console.error('Failed to load teacher ID:', error);
      return;
    }

    setTeacherId(data.id);
  }

  loadTeacherId();
}, [profile]);
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
            teacherId,
          }}
        />
      </main>
    </div>
  );
}