import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export default function ProtectedRoute({ allowedRole }) {
  const { user, profile, loading } = useAuth();

  // Still checking Supabase session
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

  // Role doesn't match
  if (allowedRole && profile.role.toUpperCase() !== allowedRole) {
    const roleHome = {
      ADMIN: '/admin',
      TEACHER: '/teacher',
      STUDENT: '/student',
    };

    return (
      <Navigate
        to={roleHome[profile.role.toUpperCase()] || '/login'}
        replace
      />
    );
  }

  return <Outlet />;
}