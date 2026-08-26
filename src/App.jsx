import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import DataProvider from './data/DataProvider';
import Login from './pages/Login';
import Placeholder from './pages/Placeholder';
import AdminDashboard from './pages/admin/AdminDashboard';
import Teachers from './pages/admin/Teachers';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import Classes from './pages/teacher/Classes';
import ClassDetails from './pages/teacher/ClassDetails';
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
      {/* DataProvider holds the shared in-memory state (teachers, classes, …) */}
      <DataProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          <Route path="/admin" element={<DashboardLayout role="ADMIN" />}>
            <Route index element={<AdminDashboard />} />
            <Route path="teachers" element={<Teachers />} />
            <Route path="*" element={<Placeholder />} />
          </Route>

          <Route path="/teacher" element={<DashboardLayout role="TEACHER" />}>
            <Route index element={<TeacherDashboard />} />
            <Route path="classes" element={<Classes />} />
            <Route path="classes/:classId" element={<ClassDetails />} />
            <Route path="*" element={<Placeholder />} />
          </Route>

          <Route path="/student" element={<DashboardLayout role="STUDENT" />}>
            <Route index element={<StudentDashboard />} />
            <Route path="*" element={<Placeholder />} />
          </Route>

          {/* Anything else goes back to the login page */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </DataProvider>
    </BrowserRouter>
  );
}
