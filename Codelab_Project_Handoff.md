# Codelab — Complete Project Handoff & Migration Document

**Purpose:** This document is the master handoff for migrating the Codelab project to another ChatGPT account. Upload this file to the new account and use it as the source of truth for continuing development.

**Project:** Codelab  
**Stack:** React + Vite + React Router + Supabase  
**Current status:** Core authentication and teacher/class navigation are working. The next major feature is CSV-based student import and real student account creation.

---

# 1. Project Overview

Codelab is a university academic platform with this hierarchy:

```text
Admin
  └── Teacher
        └── Classes
              └── Students
```

The initial deployment is intended for one university, but the architecture should remain scalable so additional universities/institutions can be supported later.

## Roles

### Admin
- Maintains the platform.
- Creates teacher accounts.
- Can view/manage all teachers and classes.
- Admin is effectively the developer/maintainer account at this stage.

### Teacher
- Logs into the platform.
- Is forced to change the temporary password on first login.
- Creates classes.
- Each class belongs to exactly one teacher.
- Adds students to classes.
- Future functionality will include CSV student import, assignments, etc.

### Student
- Logs into the platform.
- Is forced to change the initial password on first login.
- Belongs to classes.
- Future student dashboard/features are still under development.

---

# 2. Current Technology Stack

## Frontend

- React
- Vite
- React Router
- JavaScript/JSX
- CSS

## Backend

- Supabase
- Supabase Auth
- Supabase PostgreSQL
- Supabase Edge Functions
- Row Level Security (RLS)

## Development

Project directory:

```text
~/codelab/codelab
```

Supabase CLI:

```text
2.116.0
```

Important: local Supabase status currently cannot be used because Docker/Podman is not available in the development environment. Cloud Supabase operations work normally.

---

# 3. Supabase Project

Cloud Supabase project:

```text
Organization ID: hxrxrfljhcmdlkdjektz
Project name:    codelab
Project ref:     itzdcrewodclptqomwwv
Region:          Northeast Asia (Tokyo)
```

The project is already linked to the local project.

Do NOT put service-role keys or passwords into this document.

---

# 4. Important Database Relationships

The most important relationship discovered during development is:

```text
auth.users.id
      │
      ▼
profiles.id
      │
      ├───────────────┐
      ▼               ▼
teachers.profile_id   students.profile_id
      │
      ▼
teachers.id
      │
      ▼
classes.teacher_id
```

## Critical warning

`profiles.id` / `auth.users.id` is NOT the same as `teachers.id`.

For a teacher:

```text
auth user ID = profiles.id = teachers.profile_id
```

while:

```text
teachers.id
```

is a separate UUID used by:

```text
classes.teacher_id
```

This distinction caused several bugs during development. Always preserve it.

---

# 5. Current Database Schema

## profiles

Columns:

```text
id                    uuid          NOT NULL
username              text          NOT NULL
full_name             text          NOT NULL
email                 text          NOT NULL
role                  USER-DEFINED  NOT NULL
must_change_password  boolean       NOT NULL
is_active             boolean       NOT NULL
created_at            timestamptz   NOT NULL
updated_at            timestamptz   NOT NULL
```

Role enum values are lowercase:

```text
admin
teacher
student
```

## teachers

```text
id           uuid         NOT NULL
profile_id   uuid         NOT NULL
employee_id  text         NULL
created_at   timestamptz  NOT NULL
```

Relationship:

```text
teachers.profile_id → profiles.id
```

## students

```text
id                    uuid         NOT NULL
profile_id            uuid         NOT NULL
roll_number           text         NOT NULL
roll_number_normalized text        NOT NULL
created_at            timestamptz  NOT NULL
updated_at            timestamptz  NOT NULL
```

Relationship:

```text
students.profile_id → profiles.id
```

## classes

```text
id          uuid         NOT NULL
teacher_id  uuid         NOT NULL
name        text         NOT NULL
section     text         NOT NULL
created_at  timestamptz  NOT NULL
updated_at  timestamptz  NOT NULL
```

Foreign key:

```text
classes.teacher_id → teachers.id
```

---

# 6. Class RLS Policies

The following policies were verified for `classes`.

## Admin

Admin can:

- Create all classes
- View all classes
- Update all classes
- Delete all classes

Condition:

```sql
current_user_role() = 'admin'
```

## Teacher

Teacher can:

- Create their own classes
- View their own classes
- Update their own classes
- Delete their own classes

The important condition is:

```sql
teacher_id = current_teacher_id()
```

Therefore browser code must use the actual `teachers.id`, not `profiles.id`.

---

# 7. Profiles RLS Problem That Was Fixed

There was an RLS recursion problem:

```text
infinite recursion detected in policy for relation "profiles"
```

The original update policy queried `profiles` again from inside the `profiles` policy.

The problematic policy was removed.

The working replacement is:

```sql
DROP POLICY IF EXISTS "Users can update their own profile"
ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
)
WITH CHECK (
  id = auth.uid()
);
```

This fixed first-login password-change flow.

---

# 8. Authentication Flow — Completed

Authentication is currently working.

## Login

The user:

1. Enters email/password.
2. Supabase Auth authenticates them.
3. The app loads the corresponding `profiles` row.
4. The profile determines:
   - role
   - active/disabled status
   - whether password change is required.
5. User is redirected to the correct dashboard.

## Role routes

```text
Admin   → /admin
Teacher → /teacher
Student → /student
```

## First-login password change

If:

```text
profiles.must_change_password = true
```

the user is redirected to:

```text
/change-password
```

After successful password change:

```text
must_change_password = false
```

and the user is redirected according to role.

---

# 9. Teacher Creation — Completed

Teacher creation is handled by a Supabase Edge Function.

Function:

```text
create-teacher
```

It has been successfully deployed.

The function:

1. Verifies the Authorization header.
2. Verifies the logged-in user is an admin.
3. Uses the Supabase service role server-side.
4. Generates a temporary password.
5. Creates the Supabase Auth user.
6. Creates the `profiles` row.
7. Creates the `teachers` row.
8. Sets:
   - role = `teacher`
   - must_change_password = `true`
   - is_active = `true`
9. Returns the created teacher.

Current testing behavior returns the temporary password.

### Future security improvement

Eventually:

- Do NOT return the temporary password to the browser.
- Send credentials through email.
- Consider a secure invite/reset-password flow instead of exposing credentials in API responses.

---

# 10. Current AuthProvider.jsx

File:

```text
src/auth/AuthProvider.jsx
```

Current intended version:

```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(authUser) {
    if (!authUser) {
      setProfile(null);
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error) {
      console.error('Failed to load profile:', error);
      setProfile(null);
      return null;
    }

    setProfile(data);
    return data;
  }

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user);
      } else {
        setUser(null);
        setProfile(null);
      }

      if (mounted) setLoading(false);
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      const authUser = session?.user ?? null;
      setUser(authUser);

      if (authUser) {
        await loadProfile(authUser);
      } else {
        setProfile(null);
      }

      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const loggedInProfile = await loadProfile(data.user);

    return {
      success: true,
      user: data.user,
      profile: loggedInProfile,
      mustChangePassword: loggedInProfile?.must_change_password === true,
    };
  }

  async function refreshProfile() {
    if (!user) return null;
    return await loadProfile(user);
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error);
  }

  const value = {
    user,
    profile,
    loading,
    login,
    logout,
    refreshProfile,
    isAuthenticated: !!user,
    mustChangePassword: profile?.must_change_password === true,
    role: profile?.role ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
```

---

# 11. Current ProtectedRoute.jsx

File:

```text
src/auth/ProtectedRoute.jsx
```

Current intended version:

```jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export default function ProtectedRoute({
  allowedRole,
  allowPasswordChange = false,
}) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!profile) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Your account profile could not be found.
      </div>
    );
  }

  if (!profile.is_active) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Your account has been disabled.
      </div>
    );
  }

  if (profile.must_change_password && !allowPasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  if (allowPasswordChange && !profile.must_change_password) {
    const roleHome = {
      admin: '/admin',
      teacher: '/teacher',
      student: '/student',
    };

    return <Navigate to={roleHome[profile.role] || '/login'} replace />;
  }

  if (allowedRole && profile.role.toUpperCase() !== allowedRole) {
    const roleHome = {
      ADMIN: '/admin',
      TEACHER: '/teacher',
      STUDENT: '/student',
    };

    return <Navigate to={roleHome[profile.role.toUpperCase()] || '/login'} replace />;
  }

  return <Outlet />;
}
```

---

# 12. Current App.jsx

File:

```text
src/App.jsx
```

Current intended version:

```jsx
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
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute allowPasswordChange />}>
              <Route path="/change-password" element={<ChangePassword />} />
            </Route>

            <Route element={<ProtectedRoute allowedRole="ADMIN" />}>
              <Route path="/admin" element={<DashboardLayout role="ADMIN" />}>
                <Route index element={<AdminDashboard />} />
                <Route path="teachers" element={<Teachers />} />
                <Route path="*" element={<Placeholder />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRole="TEACHER" />}>
              <Route path="/teacher" element={<DashboardLayout role="TEACHER" />}>
                <Route index element={<TeacherDashboard />} />
                <Route path="classes" element={<Classes />} />
                <Route path="classes/:classId" element={<ClassDetails />} />
                <Route path="*" element={<Placeholder />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRole="STUDENT" />}>
              <Route path="/student" element={<DashboardLayout role="STUDENT" />}>
                <Route index element={<StudentDashboard />} />
                <Route path="*" element={<Placeholder />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

---

# 13. Current Login.jsx

File:

```text
src/pages/Login.jsx
```

Current intended version:

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { ROLE_HOME } from '../config/navigation';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email.trim(), password);

      if (!result.success) {
        setError(result.error);
        return;
      }

      const profile = result.profile;

      if (!profile) {
        setError('Your account profile could not be loaded.');
        return;
      }

      if (!profile.is_active) {
        setError('Your account has been disabled.');
        return;
      }

      if (profile.must_change_password) {
        navigate('/change-password', { replace: true });
        return;
      }

      const destination = ROLE_HOME[profile.role.toUpperCase()];

      if (!destination) {
        setError('Your account has an invalid role.');
        return;
      }

      navigate(destination, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <img src="/logo.svg" alt="Codelab" className="logo" />

        <h1>Welcome Back</h1>
        <p className="subtitle">Login to your account</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="input-group">
            <label htmlFor="email">Email</label>

            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>

            <div className="password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button
                type="button"
                className="peek-btn"
                onClick={() => setShowPassword((show) => !show)}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Hide' : 'Peek'}
              </button>
            </div>
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
```

---

# 14. ChangePassword.jsx — Completed

The password-change page is working.

The important corrected code is:

```jsx
const { error: profileError } = await supabase
  .from('profiles')
  .update({
    must_change_password: false,
  })
  .eq('id', profile.id);

if (profileError) {
  throw profileError;
}

await refreshProfile();

if (profile.role === 'admin') {
  navigate('/admin', { replace: true });
} else if (profile.role === 'teacher') {
  navigate('/teacher', { replace: true });
} else if (profile.role === 'student') {
  navigate('/student', { replace: true });
}
```

A previous ESLint/runtime issue occurred because `profileError` was referenced without being defined. That has been fixed.

Do not reintroduce a duplicate `if (profileError)` block.

---

# 15. DashboardLayout.jsx — Current Working Version

File:

```text
src/components/DashboardLayout.jsx
```

Current intended version:

```jsx
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
```

Important: The previous implementation used mock users and always displayed the default teacher, "Ahmed raza". That was fixed by reading `profile.full_name`.

---

# 16. TeacherDashboard.jsx — Current Working Version

File:

```text
src/pages/teacher/TeacherDashboard.jsx
```

Current intended version:

```jsx
import { Link, useNavigate, useOutletContext } from 'react-router-dom';

import StatCard from '../../components/StatCard';
import ClassCard from '../../components/ClassCard';
import DataTable from '../../components/DataTable';
import Icon from '../../components/Icon';

import { teacherAssignments } from '../../mock/data';
import { useData } from '../../data/useData';
import {
  classesByTeacher,
  studentCountByClass,
} from '../../data/selectors';
import { dueLabel } from '../../utils/format';

import './TeacherDashboard.css';

const assignmentColumns = [
  {
    key: 'title',
    label: 'Assignment',
  },
  {
    key: 'className',
    label: 'Class',
  },
  {
    key: 'dueAt',
    label: 'Due',
    render: (assignment) => (
      <span
        className={`badge ${
          assignment.status === 'active'
            ? 'badge-accent'
            : 'badge-muted'
        }`}
      >
        {assignment.status === 'active'
          ? dueLabel(assignment.dueAt)
          : 'Closed'}
      </span>
    ),
  },
  {
    key: 'submitted',
    label: 'Submissions',
    render: (assignment) => (
      <div className="submissions">
        <span className="mono">
          {assignment.submitted}/{assignment.total}
        </span>

        <div className="progress" aria-hidden="true">
          <div
            className="progress-bar"
            style={{
              width: `${Math.round(
                (assignment.submitted / assignment.total) * 100,
              )}%`,
            }}
          />
        </div>
      </div>
    ),
  },
];

export default function TeacherDashboard() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const {
    classes: allClasses,
    enrollments,
    currentTeacherId,
  } = useData();

  const classes = classesByTeacher(
    allClasses,
    currentTeacherId,
  );

  const assignments = teacherAssignments;

  const totalStudents = classes.reduce(
    (sum, c) =>
      sum + studentCountByClass(enrollments, c.id),
    0,
  );

  const activeAssignments = assignments.filter(
    (a) => a.status === 'active',
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>

          <p className="page-subtitle">
            Welcome back, {user.name}.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            navigate('/teacher/classes', {
              state: { openCreate: true },
            })
          }
        >
          <Icon name="plus" size={16} />
          Create class
        </button>
      </div>

      <div className="stats-grid">
        <StatCard
          label="My classes"
          value={classes.length}
          icon="classes"
        />

        <StatCard
          label="Students"
          value={totalStudents}
          icon="students"
          hint="Across all classes"
        />

        <StatCard
          label="Active assignments"
          value={activeAssignments.length}
          icon="assignments"
          hint={
            activeAssignments[0]
              ? `Next: ${dueLabel(
                  activeAssignments[0].dueAt,
                ).toLowerCase()}`
              : undefined
          }
        />
      </div>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">
            My Classes
          </h2>

          <Link
            to="/teacher/classes"
            className="section-link"
          >
            View all classes
          </Link>
        </div>

        {classes.length === 0 ? (
          <div className="panel">
            <div className="empty">
              You haven't created a class yet. Create one
              to start adding students.
            </div>
          </div>
        ) : (
          <div className="card-grid">
            {classes.map((cls) => (
              <ClassCard
                key={cls.id}
                name={cls.name}
                section={cls.section}
                meta={`${studentCountByClass(
                  enrollments,
                  cls.id,
                )} students`}
                onOpen={() =>
                  navigate(
                    `/teacher/classes/${cls.id}`,
                  )
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">
            Assignments
          </h2>

          <Link
            to="/teacher/assignments"
            className="section-link"
          >
            View all assignments
          </Link>
        </div>

        <div className="panel">
          <DataTable
            columns={assignmentColumns}
            rows={assignments}
            emptyMessage="No assignments yet."
          />
        </div>
      </section>
    </>
  );
}
```

## Important hook bug that was fixed

A previous version had:

```jsx
const { user, teacherId } = useOutletContext();
```

at the top level of the file, outside the React component.

That caused:

```text
Invalid hook call
Cannot read properties of null (reading 'useContext')
```

The hook must be inside:

```jsx
export default function TeacherDashboard() {
  const { user } = useOutletContext();
}
```

---

# 17. DataProvider.jsx — Current Intended Version

File:

```text
src/data/DataProvider.jsx
```

Current intended version:

```jsx
import { useEffect, useState } from 'react';
import { DataContext } from './context';
import { supabase } from '../lib/supabase';
import { seed } from '../mock/data';

const nextId = () => Date.now() + Math.floor(Math.random() * 1000);

export default function DataProvider({ children }) {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState(seed.students);
  const [classes, setClasses] = useState(seed.classes);
  const [enrollments, setEnrollments] = useState(seed.enrollments);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [currentTeacherId, setCurrentTeacherId] = useState(null);

  async function loadTeachers() {
    setLoadingTeachers(true);

    const { data, error } = await supabase
      .from('teachers')
      .select(`
        id,
        employee_id,
        created_at,
        profiles (
          id,
          full_name,
          email,
          must_change_password,
          is_active,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load teachers:', error);
      setLoadingTeachers(false);
      return;
    }

    const formattedTeachers = (data || [])
      .filter((teacher) => teacher.profiles)
      .map((teacher) => ({
        id: teacher.id,
        profileId: teacher.profiles.id,
        name: teacher.profiles.full_name,
        email: teacher.profiles.email,
        mustChangePassword: teacher.profiles.must_change_password,
        isActive: teacher.profiles.is_active,
        employeeId: teacher.employee_id,
        createdAt: teacher.created_at,
      }));

    setTeachers(formattedTeachers);
    setLoadingTeachers(false);
  }

  async function loadClasses() {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        id,
        teacher_id,
        name,
        section,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load classes:', error);
      return;
    }

    const formattedClasses = (data || []).map((cls) => ({
      id: cls.id,
      teacherId: cls.teacher_id,
      name: cls.name,
      section: cls.section,
      createdAt: cls.created_at,
      updatedAt: cls.updated_at,
    }));

    setClasses(formattedClasses);
  }

  useEffect(() => {
    let cancelled = false;

    async function initializeData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      await loadTeachers();
      await loadClasses();

      if (cancelled) return;

      if (!user) {
        setCurrentTeacherId(null);
        return;
      }

      const { data, error } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (cancelled) return;

      if (error) {
        console.error(
          'Failed to load current teacher:',
          error,
        );
        setCurrentTeacherId(null);
        return;
      }

      setCurrentTeacherId(data.id);
    }

    initializeData();

    return () => {
      cancelled = true;
    };
  }, []);

  async function addTeacher({ name, email, employeeId }) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('You must be logged in.');
    }

    const response = await supabase.functions.invoke(
      'create-teacher',
      {
        body: {
          name,
          email,
          employeeId: employeeId || null,
        },
      },
    );

    if (response.error) {
      throw new Error(response.error.message);
    }

    const result = response.data;

    if (!result?.success) {
      throw new Error(
        result?.error || 'Failed to create teacher.',
      );
    }

    await loadTeachers();

    return {
      ...result.teacher,
      temporaryPassword: result.temporaryPassword,
    };
  }

  function removeTeacher(teacherId) {
    const owned = classes.filter(
      (c) => c.teacherId === teacherId,
    ).length;

    if (owned > 0) {
      return `This teacher still has ${owned} class${
        owned === 1 ? '' : 'es'
      }. Reassign or delete them first.`;
    }

    setTeachers((prev) =>
      prev.filter((t) => t.id !== teacherId),
    );

    return null;
  }

  async function createClass({
    name,
    section,
    teacherId,
  }) {
    if (!teacherId) {
      throw new Error(
        'Your teacher account could not be identified.',
      );
    }

    const cleanName = name?.trim();
    const cleanSection = section?.trim();

    if (!cleanName) {
      throw new Error('Class name is required.');
    }

    if (!cleanSection) {
      throw new Error('Section is required.');
    }

    const { data, error } = await supabase
      .from('classes')
      .insert({
        teacher_id: teacherId,
        name: cleanName,
        section: cleanSection,
      })
      .select()
      .single();

    if (error) {
      console.error(
        'Failed to create class:',
        error,
      );

      throw new Error(error.message);
    }

    const cls = {
      id: data.id,
      teacherId: data.teacher_id,
      name: data.name,
      section: data.section,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    setClasses((prev) => [
      cls,
      ...prev,
    ]);

    return cls;
  }

  function addStudentToClass(classId, { name, email }) {
    let student = students.find(
      (s) => s.email === email,
    );

    let created = false;

    if (!student) {
      student = {
        id: nextId(),
        name,
        email,
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
      };

      created = true;

      setStudents((prev) => [
        ...prev,
        student,
      ]);
    }

    setEnrollments((prev) => [
      ...prev,
      {
        classId,
        studentId: student.id,
        joinedAt: new Date().toISOString(),
      },
    ]);

    return {
      student,
      created,
    };
  }

  function removeStudentFromClass(
    classId,
    studentId,
  ) {
    setEnrollments((prev) =>
      prev.filter(
        (e) =>
          !(
            e.classId === classId &&
            e.studentId === studentId
          ),
      ),
    );
  }

  const value = {
    teachers,
    students,
    classes,
    enrollments,

    loadingTeachers,

    currentTeacherId,

    loadTeachers,
    loadClasses,

    addTeacher,
    removeTeacher,
    createClass,
    addStudentToClass,
    removeStudentFromClass,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}
```

## Important current issue

`students` and `enrollments` are still partly mock/local state.

They must eventually be replaced with real Supabase operations.

---

# 18. Classes.jsx — Current Working Version

File:

```text
src/pages/teacher/Classes.jsx
```

Current intended version:

```jsx
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import ClassCard from '../../components/ClassCard';
import Modal from '../../components/Modal';
import Notice from '../../components/Notice';
import Icon from '../../components/Icon';
import ClassForm from './ClassForm';

import { useData } from '../../data/useData';
import {
  classesByTeacher,
  studentCountByClass,
} from '../../data/selectors';

export default function Classes() {
  const {
    classes,
    enrollments,
    createClass,
    currentTeacherId,
  } = useData();

  const navigate = useNavigate();
  const location = useLocation();

  const [showCreate, setShowCreate] = useState(
    Boolean(location.state?.openCreate),
  );

  const [notice, setNotice] = useState(null);

  const myClasses = classesByTeacher(
    classes,
    currentTeacherId,
  );

  async function handleCreate(values) {
    try {
      setNotice(null);

      const cls = await createClass({
        ...values,
        teacherId: currentTeacherId,
      });

      setShowCreate(false);

      setNotice({
        type: 'success',
        class: cls,
      });
    } catch (error) {
      console.error('Failed to create class:', error);

      setNotice({
        type: 'error',
        message: error.message || 'Failed to create class.',
      });
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Classes</h1>

          <p className="page-subtitle">
            {myClasses.length} class
            {myClasses.length === 1 ? '' : 'es'}. Open one to manage its
            students.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowCreate(true)}
        >
          <Icon name="plus" size={16} />
          Create class
        </button>
      </div>

      {notice && (
        <Notice onDismiss={() => setNotice(null)}>
          {notice.type === 'error' ? (
            notice.message
          ) : (
            <>
              Created{' '}
              <strong>
                {notice.class.name} — Section {notice.class.section}
              </strong>
              .{' '}
              <Link to={`/teacher/classes/${notice.class.id}`}>
                Open it to add students.
              </Link>
            </>
          )}
        </Notice>
      )}

      {myClasses.length === 0 ? (
        <div className="panel">
          <div className="empty">
            You haven't created a class yet. Create one to start adding
            students.
          </div>
        </div>
      ) : (
        <div className="card-grid">
          {myClasses.map((cls) => (
            <ClassCard
              key={cls.id}
              name={cls.name}
              section={cls.section}
              meta={`${studentCountByClass(
                enrollments,
                cls.id,
              )} students`}
              onOpen={() =>
                navigate(`/teacher/classes/${cls.id}`)
              }
            />
          ))}
        </div>
      )}

      {showCreate && (
        <Modal
          title="Create class"
          onClose={() => setShowCreate(false)}
        >
          <ClassForm
            existingClasses={myClasses}
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        </Modal>
      )}
    </>
  );
}
```

Important:

Do NOT add local `currentTeacherId` state here.

Do NOT add `loadCurrentTeacher()` here.

`currentTeacherId` comes from `DataProvider`.

---

# 19. ClassDetails.jsx — NOT YET MIGRATED TO REAL BACKEND

File:

```text
src/pages/teacher/ClassDetails.jsx
```

The current version is still based on mock/local student data.

It contains logic similar to:

```jsx
const id = Number(classId);
const cls = classes.find(
  (c) => c.id === id && c.teacherId === user.id
);
```

This is now incorrect because:

1. Class IDs are UUIDs, not numbers.
2. `classId` from the URL should remain a string.
3. `cls.teacherId` is `teachers.id`.
4. `user.id` from the dashboard context is `profiles.id`.
5. Those IDs are different.

This file must be rewritten before production use.

The correct conceptual lookup is:

```jsx
const { classId } = useParams();

const cls = classes.find(
  (c) =>
    c.id === classId &&
    c.teacherId === currentTeacherId
);
```

However, even this is only the frontend lookup. The backend RLS remains the real security boundary.

---

# 20. Existing Mock Data

The project still contains mock data in:

```text
src/mock/data
```

Some dashboard assignment/student functionality still uses mock data.

This is acceptable temporarily, but the goal is to migrate actual academic data to Supabase.

Do not accidentally use mock user IDs for backend operations.

---

# 21. Important UI Components Already Existing

The project already contains reusable components including:

```text
DashboardLayout
Sidebar
Topbar
StatCard
ClassCard
DataTable
Modal
ConfirmDialog
InviteForm
Notice
Icon
```

Existing pages include:

```text
Login
ChangePassword
Placeholder

AdminDashboard
Teachers

TeacherDashboard
Classes
ClassDetails

StudentDashboard
```

There is also a navigation configuration:

```text
src/config/navigation
```

which contains:

```text
NAVIGATION
ROLE_HOME
ROLE_LABELS
```

---

# 22. Current Working Status

## Completed

### Authentication
- [x] Supabase Auth login
- [x] Profile loading
- [x] Role-based routing
- [x] Active/inactive account checking
- [x] Forced first-login password change
- [x] Logout
- [x] Admin login
- [x] Teacher login
- [x] Correct teacher name display

### Admin
- [x] Admin dashboard route
- [x] Teacher creation UI
- [x] create-teacher Edge Function
- [x] Teacher records loading
- [x] Teacher temporary password generation

### Teacher
- [x] Teacher dashboard
- [x] Teacher-specific classes
- [x] Create Class UI
- [x] Supabase class insertion
- [x] Teacher ID resolution
- [x] Class RLS

### Security/RLS
- [x] Profiles recursion issue fixed
- [x] Class RLS verified
- [x] Teacher ownership enforced at database level

---

# 23. Immediate Testing Task

Before starting student import, verify the class creation flow.

Login as a teacher.

Go to:

```text
My Classes
```

Click:

```text
Create class
```

Test:

```text
Class name: Database Systems
Section: A
```

Expected result:

- Class is created in Supabase.
- Class appears in My Classes.
- Class has a UUID.
- `teacher_id` equals the current teacher's `teachers.id`.
- Another teacher cannot see or modify that class.

---

# 24. Next Major Feature — CSV Student Import

This is the next major implementation task.

Teacher workflow:

```text
Teacher Dashboard
      ↓
My Classes
      ↓
Open Class
      ↓
Add Students
      ↓
Upload CSV
      ↓
Validate CSV
      ↓
Preview students
      ↓
Create student accounts
      ↓
Enroll students in class
      ↓
Send credentials/invitation
```

---

# 25. Required CSV Format

CSV columns are:

```text
1. Sr#
2. Roll_No.
3. Full_Name
4. Roll No without hyphen
5. section
```

Example:

```text
Sr#,Roll_No.,Full_Name,Roll No without hyphen,section
1,25P-0512,Ali Khan,25P0512,A
2,25P-0513,Ahmed Raza,25P0513,A
```

---

# 26. Student Account Rules

For each CSV row:

## Username

Use column 2 exactly:

```text
25P-0512
```

## Normalized roll number

Use column 4:

```text
25P0512
```

## Email

Convert normalized roll number to lowercase and prefix `p`:

```text
25P0512
↓
p250512@pwr.nu.edu.pk
```

So:

```text
Roll No without hyphen: 25P0512
Email:                  p250512@pwr.nu.edu.pk
```

## Initial password

Use column 2:

```text
25P-0512
```

## First-login requirement

Set:

```text
must_change_password = true
```

## Role

Set:

```text
role = 'student'
```

## Active

Set:

```text
is_active = true
```

---

# 27. Student Import Security Architecture

Do NOT create student Auth accounts directly from the browser.

The browser must NOT have access to the Supabase service role key.

Use an Edge Function.

Suggested function:

```text
create-students
```

or:

```text
import-students
```

Recommended flow:

```text
Teacher browser
      │
      │ authenticated request
      ▼
Supabase Edge Function
      │
      ├── verify JWT
      ├── verify role = teacher
      ├── verify teacher owns class
      ├── validate CSV data
      ├── create auth users with service role
      ├── create profiles
      ├── create students
      └── create enrollments
```

---

# 28. Student Import Must Validate

The import system should validate:

- CSV exists.
- Required headers exist.
- No missing roll number.
- No missing full name.
- No missing normalized roll number.
- No missing section.
- Roll number format is valid.
- Normalized roll number matches roll number.
- Generated email is valid.
- Duplicate rows within CSV are rejected.
- Existing student accounts are handled safely.
- Student is not already enrolled in the class.
- CSV section matches selected class section, if that is part of the intended business rule.

Do not silently create duplicate accounts.

---

# 29. Existing Students

A key business decision/implementation detail:

If the generated student email already exists:

```text
p250512@pwr.nu.edu.pk
```

do not blindly create another Auth user.

Instead:

1. Find the existing profile/student.
2. Verify it is a student.
3. Check whether the student is already enrolled.
4. If not enrolled, enroll them.
5. If already enrolled, report that row as already enrolled.

The exact behavior should be finalized while implementing the Edge Function.

---

# 30. Enrollment Database Investigation — REQUIRED BEFORE CODING

The previous schema investigation did not successfully retrieve the enrollment table schema.

Therefore, BEFORE writing student import code, inspect:

```text
enrollments
```

Need to determine:

- Does the table exist?
- Exact column names.
- Primary key.
- Foreign keys.
- Unique constraints.
- RLS policies.
- Whether enrollment uses:
  - class_id
  - student_id
  - created_at/joined_at
  - any additional columns.

Do NOT assume the schema from the mock data.

Also inspect student RLS policies before implementing browser reads.

---

# 31. Student RLS Investigation

Before student functionality:

Inspect RLS for:

```text
students
enrollments
profiles
```

Determine:

### Teacher can:
- View students enrolled in their classes.
- Add students to their classes.
- Remove students from their classes.

### Student can:
- View their own profile.
- View their own student record.
- View their own class memberships.

### Admin can:
- View/manage all students.
- View/manage all enrollments.

The Edge Function should also enforce teacher ownership before making changes.

---

# 32. Email Credentials — Future Task

Currently teacher creation returns temporary passwords for testing.

Student import will initially need a way to communicate credentials.

Production goal:

```text
Student account created
        ↓
Email sent
        ↓
Username/email
Temporary password
Login URL
First-login password-change instruction
```

Recommended future approach:

- Use an email provider through a server-side integration.
- Keep credentials generation and sending server-side.
- Do not expose service keys in React.
- Avoid logging passwords in production.

---

# 33. Student Dashboard — Future

Current route exists:

```text
/student
```

but it is largely placeholder/mock functionality.

Future student dashboard should include:

- Student name
- Roll number
- Enrolled classes
- Assignments
- Due dates
- Submission status
- Grades/results
- Announcements
- Profile/settings

---

# 34. Teacher Class Details — Future

Class Details should eventually show:

```text
Class name
Section
Teacher
Student count
```

Student roster:

```text
Roll Number
Name
Email
Status
Joined
Actions
```

Actions:

```text
Remove student
```

Future:

```text
Import CSV
Add single student
Export roster
```

---

# 35. Assignment System — Future

Teacher dashboard currently displays assignment data from mock data.

Need to eventually create real Supabase tables for:

```text
assignments
submissions
```

Likely relationship:

```text
teacher
  ↓
class
  ↓
assignment
  ↓
submission
  ↓
student
```

Need to design this carefully before implementing.

---

# 36. Suggested Future Database Structure

Potential tables:

```text
profiles
teachers
students
classes
enrollments
assignments
submissions
announcements
```

Potential future:

```text
universities
departments
courses
```

if multi-university support becomes necessary.

Do not add unnecessary tables until the current one-university workflow is stable.

---

# 37. Multi-University Scalability

The project currently targets one university.

Future architecture could introduce:

```text
universities
   │
   ├── profiles
   ├── teachers
   ├── students
   ├── classes
   └── ...
```

Then every academic object could be scoped by:

```text
university_id
```

But this should be done deliberately.

Do not prematurely complicate the current database if the immediate goal is getting the platform operational.

---

# 38. Important Development Lessons

## 1. Never confuse profile ID and teacher ID

Wrong:

```jsx
teacher_id = profile.id
```

Correct:

```text
teacher_id = teachers.id
```

and:

```text
teachers.profile_id = profiles.id
```

## 2. UUID class IDs must not be converted to numbers

Wrong:

```jsx
const id = Number(classId);
```

Correct:

```jsx
const { classId } = useParams();
```

and compare UUID strings.

## 3. React hooks must be inside components

Wrong:

```jsx
const { user } = useOutletContext();

export default function Page() {
}
```

Correct:

```jsx
export default function Page() {
  const { user } = useOutletContext();
}
```

## 4. Do not use mock users for real authentication

The old DashboardLayout used:

```text
mockCurrentUsers
```

which caused every teacher to appear as:

```text
Ahmed raza
```

This was replaced with Supabase profile data.

## 5. Service role belongs only on the server

Never put:

```text
SUPABASE_SERVICE_ROLE_KEY
```

in React/Vite client code.

Use Edge Functions.

---

# 39. Current Known Technical Debt

These items are not necessarily bugs, but should be addressed:

- [ ] Replace mock students with Supabase.
- [ ] Replace mock enrollments with Supabase.
- [ ] Rewrite ClassDetails for UUID + real database data.
- [ ] Investigate enrollment schema.
- [ ] Investigate student RLS.
- [ ] Implement student import Edge Function.
- [ ] Implement CSV validation/preview.
- [ ] Implement duplicate student handling.
- [ ] Implement enrollment creation.
- [ ] Implement student credential email.
- [ ] Stop returning temporary passwords from teacher Edge Function.
- [ ] Replace assignment mock data with Supabase.
- [ ] Build student dashboard.
- [ ] Add robust error/loading states.
- [ ] Add production logging strategy.
- [ ] Review RLS comprehensively before production.
- [ ] Add database constraints where appropriate.
- [ ] Add automated tests.
- [ ] Add deployment/CI workflow.

---

# 40. Recommended Development Order

Follow this order rather than jumping ahead.

## Phase 1 — Verify Class Creation

```text
Create class
↓
Database row
↓
Correct teacher_id
↓
Class appears
↓
RLS isolation test
```

## Phase 2 — Fix ClassDetails

```text
UUID lookup
↓
Teacher ownership
↓
Real Supabase class data
```

## Phase 3 — Database Investigation

Inspect:

```text
students
enrollments
RLS
constraints
```

## Phase 4 — Student CSV UI

Build:

```text
Upload CSV
↓
Parse
↓
Validate
↓
Preview
```

Do not create accounts yet.

## Phase 5 — Student Edge Function

Build server-side:

```text
import-students
```

## Phase 6 — Enrollment

Create actual class/student relationships.

## Phase 7 — Credential Email

Send credentials securely.

## Phase 8 — Student Login

Verify:

```text
student login
↓
must_change_password
↓
change password
↓
student dashboard
```

## Phase 9 — Assignments

Move assignments from mock to database.

## Phase 10 — Production Hardening

Review:

- RLS
- authorization
- duplicate handling
- errors
- rate limits
- email
- logging
- deployment
- backups

---

# 41. Current Project File Areas

Known important files:

```text
src/
├── App.jsx
├── auth/
│   ├── AuthProvider.jsx
│   └── ProtectedRoute.jsx
│
├── components/
│   ├── DashboardLayout.jsx
│   ├── Sidebar.jsx
│   ├── Topbar.jsx
│   ├── StatCard.jsx
│   ├── ClassCard.jsx
│   ├── DataTable.jsx
│   ├── Modal.jsx
│   ├── ConfirmDialog.jsx
│   ├── InviteForm.jsx
│   ├── Notice.jsx
│   └── Icon.jsx
│
├── config/
│   └── navigation.*
│
├── data/
│   ├── DataProvider.jsx
│   ├── context.*
│   ├── useData.*
│   └── selectors.*
│
├── lib/
│   └── supabase.*
│
├── mock/
│   └── data.*
│
├── pages/
│   ├── Login.jsx
│   ├── ChangePassword.jsx
│   ├── Placeholder.jsx
│   │
│   ├── admin/
│   │   ├── AdminDashboard.jsx
│   │   └── Teachers.jsx
│   │
│   ├── teacher/
│   │   ├── TeacherDashboard.jsx
│   │   ├── Classes.jsx
│   │   ├── ClassForm.jsx
│   │   └── ClassDetails.jsx
│   │
│   └── student/
│       └── StudentDashboard.jsx
│
└── utils/
    └── format.*
```

Exact filenames for some files with extensions may differ; inspect the repository rather than inventing missing files.

---

# 42. Supabase Edge Functions

Known deployed function:

```text
create-teacher
```

Future function:

```text
import-students
```

Potential later functions:

```text
send-credentials
create-assignment
send-announcement
```

Only create functions when server-side privileged operations are actually needed.

---

# 43. Testing Checklist

## Admin

- [ ] Admin can log in.
- [ ] Admin reaches `/admin`.
- [ ] Admin can create teacher.
- [ ] Teacher receives temporary credentials.
- [ ] Teacher record exists.
- [ ] Profile role is `teacher`.

## Teacher

- [ ] Teacher can log in.
- [ ] First login redirects to `/change-password`.
- [ ] Password can be changed.
- [ ] Teacher reaches `/teacher`.
- [ ] Correct teacher name appears.
- [ ] Teacher sees only their classes.
- [ ] Teacher can create class.
- [ ] Class uses correct `teachers.id`.
- [ ] Teacher cannot access another teacher's class.

## Student

Not complete yet:

- [ ] Student created from CSV.
- [ ] Correct email.
- [ ] Correct username.
- [ ] Correct initial password.
- [ ] must_change_password = true.
- [ ] Student enrolled.
- [ ] Student can log in.
- [ ] Student forced to change password.
- [ ] Student sees correct classes.

---

# 44. What the New ChatGPT Account Should Know

When continuing this project, do NOT restart the architecture from scratch.

The following are already solved:

```text
Supabase project setup
Authentication
Role system
Admin login
Teacher creation
Teacher first-login password change
Profile RLS recursion
Protected routes
Teacher profile display
Teacher dashboard
Teacher ID resolution
Class creation architecture
Class RLS
```

The immediate next objective is:

```text
VERIFY CREATE CLASS
        ↓
FIX CLASS DETAILS
        ↓
INSPECT ENROLLMENTS/STUDENT RLS
        ↓
BUILD CSV IMPORT
```

---

# 45. First Message to Use in the New Account

After uploading this document, send the new account this message:

> This is the complete handoff document for my Codelab project. Read it as the project source of truth. Do not redesign the architecture unless necessary. The authentication, teacher creation, teacher password change, teacher dashboard, and class creation infrastructure are already implemented. First help me verify the current Create Class flow. After that, continue with ClassDetails and then the real Supabase student CSV import. Always preserve the distinction between `profiles.id` and `teachers.id`, and remember that class IDs are UUIDs.

---

# 46. Final Current State

At the moment the application is running correctly after fixing the latest React issues.

The major previously encountered errors have been resolved:

```text
Invalid hook call
↓
Fixed by moving useOutletContext inside component
```

and:

```text
ReferenceError: useState is not defined
↓
Fixed by importing useState in DashboardLayout
```

The incorrect hard-coded/mock teacher name:

```text
Ahmed raza
```

was also fixed by using the authenticated Supabase profile.

The project is now ready to proceed with real class testing and then student import.

---

# END OF HANDOFF DOCUMENT
