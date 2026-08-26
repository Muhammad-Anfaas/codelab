// Role names match the `role` column planned for the users table.
export const ROLES = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
};

// Human-readable role names shown in the UI.
export const ROLE_LABELS = {
  ADMIN: 'Administrator',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
};

// Where each role lands after login (and the base path for its routes).
export const ROLE_HOME = {
  ADMIN: '/admin',
  TEACHER: '/teacher',
  STUDENT: '/student',
};

// Sidebar navigation per role.
// `end: true` means the link is only "active" on an exact match, so the
// Dashboard link doesn't light up when you're on /admin/teachers.
// Logout is deliberately NOT here: it's an action, not a route.
export const NAVIGATION = {
  ADMIN: [
    { label: 'Dashboard', to: '/admin', icon: 'dashboard', end: true },
    { label: 'Teachers', to: '/admin/teachers', icon: 'teachers' },
    { label: 'Students', to: '/admin/students', icon: 'students' },
    { label: 'Classes', to: '/admin/classes', icon: 'classes' },
    { label: 'Settings', to: '/admin/settings', icon: 'settings' },
  ],
  TEACHER: [
    { label: 'Dashboard', to: '/teacher', icon: 'dashboard', end: true },
    { label: 'My Classes', to: '/teacher/classes', icon: 'classes' },
    { label: 'Assignments', to: '/teacher/assignments', icon: 'assignments' },
    { label: 'Students', to: '/teacher/students', icon: 'students' },
    { label: 'Settings', to: '/teacher/settings', icon: 'settings' },
  ],
  STUDENT: [
    { label: 'Dashboard', to: '/student', icon: 'dashboard', end: true },
    { label: 'My Classes', to: '/student/classes', icon: 'classes' },
    { label: 'Assignments', to: '/student/assignments', icon: 'assignments' },
    { label: 'Grades', to: '/student/grades', icon: 'grades' },
    { label: 'Settings', to: '/student/settings', icon: 'settings' },
  ],
};
