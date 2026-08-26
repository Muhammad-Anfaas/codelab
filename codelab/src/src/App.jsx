import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Placeholder from './pages/Placeholder';
import AdminDashboard from './pages/admin/AdminDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import StudentDashboard from './pages/student/StudentDashboard';

/**
 * Route map
 *
 *   /login                 Login page
 *   /admin                 ┐
 *   /admin/teachers …      │ rendered inside DashboardLayout role="ADMIN"
 *   /teacher, /teacher/…   │ rendered inside DashboardLayout role="TEACHER"
 *   /student, /student/…   ┘ rendered inside DashboardLayout role="STUDENT"
 *
 * Each role has one "layout route". Its children render into the layout's
 * <Outlet />, so the sidebar and topbar stay mounted while pages change.
 * To add a real page later, add a <Route path="teachers" …/> above the
 * catch-all "*" placeholder for that role.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        <Route path="/admin" element={<DashboardLayout role="ADMIN" />}>
          <Route index element={<AdminDashboard />} />
          <Route path="*" element={<Placeholder />} />
        </Route>

        <Route path="/teacher" element={<DashboardLayout role="TEACHER" />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="*" element={<Placeholder />} />
        </Route>

        <Route path="/student" element={<DashboardLayout role="STUDENT" />}>
          <Route index element={<StudentDashboard />} />
          <Route path="*" element={<Placeholder />} />
        </Route>

        {/* Anything else goes back to the login page */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
