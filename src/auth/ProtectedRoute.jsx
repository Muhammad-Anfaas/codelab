
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';

export default function ProtectedRoute({
  allowedRole,
  allowPasswordChange = false,
}) {
  const { user, profile, loading } = useAuth();

  // Still checking Supabase session/profile
  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Loading...
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Profile doesn't exist
  if (!profile) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Your account profile could not be found.
      </div>
    );
  }

  // Account disabled
  if (!profile.is_active) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Your account has been disabled.
      </div>
    );
  }

  /*
   * Users who have been given a temporary password MUST change it
   * before accessing the normal application.
   *
   * allowPasswordChange is true only for /change-password.
   */
  if (
    profile.must_change_password &&
    !allowPasswordChange
  ) {
    return (
      <Navigate
        to="/change-password"
        replace
      />
    );
  }

  /*
   * If a user who does NOT need to change their password tries
   * to access /change-password, send them to their dashboard.
   */
  if (
    allowPasswordChange &&
    !profile.must_change_password
  ) {
    const roleHome = {
      admin: '/admin',
      teacher: '/teacher',
      student: '/student',
    };

    return (
      <Navigate
        to={roleHome[profile.role] || '/login'}
        replace
      />
    );
  }

  // Role doesn't match
  if (
    allowedRole &&
    profile.role.toUpperCase() !== allowedRole
  ) {
    const roleHome = {
      ADMIN: '/admin',
      TEACHER: '/teacher',
      STUDENT: '/student',
    };

    return (
      <Navigate
        to={
          roleHome[profile.role.toUpperCase()] ||
          '/login'
        }
        replace
      />
    );
  }

  return <Outlet />;
}
