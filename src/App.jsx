
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import DashboardLayout from './components/DashboardLayout';
import DataProvider from './data/DataProvider';
import { AuthProvider } from './auth/AuthProvider';
import ProtectedRoute from './auth/ProtectedRoute';

import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Placeholder from './pages/Placeholder';

import AdminDashboard from './pages/admin/AdminDashboard';
import Teachers from './pages/admin/Teachers';

import TeacherDashboard from './pages/teacher/TeacherDashboard';
import Classes from './pages/teacher/Classes';
import ClassDetails from './pages/teacher/ClassDetails';

import StudentDashboard from './pages/student/StudentDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <Routes>

            {/* =========================
                PUBLIC
               ========================= */}

            <Route
              path="/"
              element={<Navigate to="/login" replace />}
            />

            <Route
              path="/login"
              element={<Login />}
            />

            {/* =========================
                CHANGE PASSWORD
               =========================

                This route is accessible only to a
                logged-in user whose profile says:

                must_change_password = true

                ProtectedRoute handles both cases:
                - Not logged in → /login
                - Already changed password → dashboard
            */}

            <Route
              element={
                <ProtectedRoute allowPasswordChange />
              }
            >
              <Route
                path="/change-password"
                element={<ChangePassword />}
              />
            </Route>


            {/* =========================
                ADMIN
               ========================= */}

            <Route
              element={
                <ProtectedRoute allowedRole="ADMIN" />
              }
            >
              <Route
                path="/admin"
                element={<DashboardLayout role="ADMIN" />}
              >
                <Route
                  index
                  element={<AdminDashboard />}
                />

                <Route
                  path="teachers"
                  element={<Teachers />}
                />

                <Route
                  path="*"
                  element={<Placeholder />}
                />
              </Route>
            </Route>


            {/* =========================
                TEACHER
               ========================= */}

            <Route
              element={
                <ProtectedRoute allowedRole="TEACHER" />
              }
            >
              <Route
                path="/teacher"
                element={<DashboardLayout role="TEACHER" />}
              >
                <Route
                  index
                  element={<TeacherDashboard />}
                />

                <Route
                  path="classes"
                  element={<Classes />}
                />

                <Route
                  path="classes/:classId"
                  element={<ClassDetails />}
                />

                <Route
                  path="*"
                  element={<Placeholder />}
                />
              </Route>
            </Route>


            {/* =========================
                STUDENT
               ========================= */}

            <Route
              element={
                <ProtectedRoute allowedRole="STUDENT" />
              }
            >
              <Route
                path="/student"
                element={<DashboardLayout role="STUDENT" />}
              >
                <Route
                  index
                  element={<StudentDashboard />}
                />

                <Route
                  path="*"
                  element={<Placeholder />}
                />
              </Route>
            </Route>


            {/* =========================
                UNKNOWN ROUTES
               ========================= */}

            <Route
              path="*"
              element={<Navigate to="/login" replace />}
            />

          </Routes>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
