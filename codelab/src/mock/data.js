// ==========================================================================
// MOCK DATA — frontend-only placeholder until the Express API exists.
//
// The shapes mirror the JSON the API will return, so each page can later
// swap `import { x } from '../mock/data'` for a fetch() call without
// changing the JSX. Everything here is fake. Never put real credentials
// in this file — and delete it once the backend is wired up.
// ==========================================================================

// Dates are generated relative to "now" so due-dates always look current.
const daysFromNow = (n) => new Date(Date.now() + n * 86_400_000).toISOString();

// --------------------------------------------------------------------------
// Mock login lookup. NO password is checked — this only decides which
// dashboard to show during frontend development.
// --------------------------------------------------------------------------
export const mockAccounts = [
  { email: 'admin@codelab.dev', role: 'ADMIN' },
  { email: 'teacher@codelab.dev', role: 'TEACHER' },
  { email: 'student@codelab.dev', role: 'STUDENT' },
];

export function findMockAccount(email) {
  const normalised = email.trim().toLowerCase();
  return mockAccounts.find((a) => a.email === normalised) ?? null;
}

// What GET /api/users/me will eventually return for each role.
export const mockCurrentUsers = {
  ADMIN: { id: 1, name: 'Root Admin', email: 'admin@codelab.dev', role: 'ADMIN' },
  TEACHER: { id: 2, name: 'Ahmed Raza', email: 'teacher@codelab.dev', role: 'TEACHER' },
  STUDENT: { id: 3, name: 'Sara Khan', email: 'student@codelab.dev', role: 'STUDENT' },
};

// --------------------------------------------------------------------------
// Admin dashboard
// --------------------------------------------------------------------------
export const adminStats = { teachers: 8, students: 214, classes: 12 };

// GET /api/admin/teachers (most recent first)
export const recentTeachers = [
  { id: 2, name: 'Ahmed Raza', email: 'ahmed@codelab.dev', classCount: 3, status: 'active', createdAt: daysFromNow(-6) },
  { id: 4, name: 'Fatima Noor', email: 'fatima@codelab.dev', classCount: 2, status: 'active', createdAt: daysFromNow(-8) },
  { id: 5, name: 'Bilal Ahmed', email: 'bilal@codelab.dev', classCount: 0, status: 'invited', createdAt: daysFromNow(-11) },
  { id: 6, name: 'Zainab Ali', email: 'zainab@codelab.dev', classCount: 4, status: 'active', createdAt: daysFromNow(-16) },
];

export const adminActivity = [
  { id: 1, text: 'Ahmed Raza created "Data Structures — Section C"', when: '2 hours ago' },
  { id: 2, text: 'Fatima Noor added 12 students to Web Development', when: 'Yesterday' },
  { id: 3, text: 'Bilal Ahmed was invited as a teacher', when: '3 days ago' },
  { id: 4, text: '28 students accepted their invitations', when: 'Last week' },
];

// --------------------------------------------------------------------------
// Teacher dashboard
// --------------------------------------------------------------------------
// GET /api/classes — the server will only return the logged-in teacher's classes
export const teacherClasses = [
  { id: 1, name: 'Programming Fundamentals', section: 'A', studentCount: 42 },
  { id: 2, name: 'Object Oriented Programming', section: 'B', studentCount: 35 },
  { id: 3, name: 'Data Structures', section: 'C', studentCount: 28 },
];

export const teacherAssignments = [
  { id: 1, title: 'Lab 3: Loops and conditionals', classId: 1, className: 'Programming Fundamentals', dueAt: daysFromNow(3), submitted: 31, total: 42, status: 'active' },
  { id: 2, title: 'Inheritance exercise', classId: 2, className: 'Object Oriented Programming', dueAt: daysFromNow(7), submitted: 12, total: 35, status: 'active' },
  { id: 3, title: 'Linked list implementation', classId: 3, className: 'Data Structures', dueAt: daysFromNow(10), submitted: 4, total: 28, status: 'active' },
  { id: 4, title: 'Lab 2: Variables and types', classId: 1, className: 'Programming Fundamentals', dueAt: daysFromNow(-6), submitted: 42, total: 42, status: 'closed' },
];

// --------------------------------------------------------------------------
// Student dashboard
// --------------------------------------------------------------------------
// GET /api/classes — for a student, the classes they are enrolled in
export const studentClasses = [
  { id: 1, name: 'Programming Fundamentals', section: 'A', teacherName: 'Ahmed Raza' },
  { id: 2, name: 'Object Oriented Programming', section: 'B', teacherName: 'Ahmed Raza' },
  { id: 4, name: 'Web Development', section: 'A', teacherName: 'Fatima Noor' },
];

export const studentAssignments = [
  { id: 1, title: 'Lab 3: Loops and conditionals', className: 'Programming Fundamentals', dueAt: daysFromNow(3), status: 'pending' },
  { id: 5, title: 'Portfolio page (HTML/CSS)', className: 'Web Development', dueAt: daysFromNow(5), status: 'pending' },
  { id: 2, title: 'Inheritance exercise', className: 'Object Oriented Programming', dueAt: daysFromNow(7), status: 'submitted' },
];

export const studentGrades = [
  { id: 4, title: 'Lab 2: Variables and types', className: 'Programming Fundamentals', score: 88, max: 100 },
  { id: 6, title: 'Quiz 1: Classes and objects', className: 'Object Oriented Programming', score: 92, max: 100 },
  { id: 7, title: 'Flexbox layout task', className: 'Web Development', score: 81, max: 100 },
];

export const studentActivity = [
  { id: 1, text: 'Lab 2 was graded — 88/100', when: 'Yesterday' },
  { id: 2, text: 'You submitted "Inheritance exercise"', when: '2 days ago' },
  { id: 3, text: 'You were added to Web Development — Section A', when: 'Last week' },
];
