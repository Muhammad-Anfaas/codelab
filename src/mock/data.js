// ==========================================================================
// MOCK DATA — the seed state for the in-memory store (src/data/).
//
// The shapes mirror the planned PostgreSQL tables (users, classes,
// class_students) so that the backend step is a swap, not a rewrite.
// Everything here is fake. Never put real credentials in this file.
// ==========================================================================

// Dates are relative to "now" so the app always looks current.
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
// The ids match rows in the seed below (teacher 2 = Ahmed, student 3 = Sara).
export const mockCurrentUsers = {
  ADMIN: { id: 1, name: 'Root Admin', email: 'admin@codelab.dev', role: 'ADMIN' },
  TEACHER: { id: 2, name: 'Ahmed Raza', email: 'teacher@codelab.dev', role: 'TEACHER' },
  STUDENT: { id: 3, name: 'Sara Khan', email: 'student@codelab.dev', role: 'STUDENT' },
};

// --------------------------------------------------------------------------
// Seed rows for the store. `mustChangePassword: true` means the person was
// invited and hasn't logged in yet (the UI shows this as "Invited").
// --------------------------------------------------------------------------
export const seed = {
  // users WHERE role = 'TEACHER'
  teachers: [
    { id: 2, name: 'Ahmed Raza', email: 'teacher@codelab.dev', mustChangePassword: false, createdAt: daysFromNow(-40) },
    { id: 4, name: 'Fatima Noor', email: 'fatima@codelab.dev', mustChangePassword: false, createdAt: daysFromNow(-22) },
    { id: 5, name: 'Bilal Ahmed', email: 'bilal@codelab.dev', mustChangePassword: true, createdAt: daysFromNow(-3) },
    { id: 6, name: 'Zainab Ali', email: 'zainab@codelab.dev', mustChangePassword: false, createdAt: daysFromNow(-16) },
  ],

  // users WHERE role = 'STUDENT'
  students: [
    { id: 3, name: 'Sara Khan', email: 'student@codelab.dev', mustChangePassword: false, createdAt: daysFromNow(-30) },
    { id: 7, name: 'Hamza Iqbal', email: 'hamza@student.dev', mustChangePassword: false, createdAt: daysFromNow(-30) },
    { id: 8, name: 'Ayesha Malik', email: 'ayesha@student.dev', mustChangePassword: false, createdAt: daysFromNow(-28) },
    { id: 9, name: 'Usman Tariq', email: 'usman@student.dev', mustChangePassword: true, createdAt: daysFromNow(-2) },
    { id: 10, name: 'Maryam Siddiqui', email: 'maryam@student.dev', mustChangePassword: false, createdAt: daysFromNow(-25) },
    { id: 11, name: 'Ali Hassan', email: 'ali@student.dev', mustChangePassword: true, createdAt: daysFromNow(-1) },
  ],

  // classes
  classes: [
    { id: 1, name: 'Programming Fundamentals', section: 'A', teacherId: 2, createdAt: daysFromNow(-35) },
    { id: 2, name: 'Object Oriented Programming', section: 'B', teacherId: 2, createdAt: daysFromNow(-33) },
    { id: 3, name: 'Data Structures', section: 'C', teacherId: 2, createdAt: daysFromNow(-1) },
    { id: 4, name: 'Web Development', section: 'A', teacherId: 4, createdAt: daysFromNow(-20) },
    { id: 5, name: 'Databases', section: 'A', teacherId: 6, createdAt: daysFromNow(-14) },
  ],

  // class_students (many-to-many)
  enrollments: [
    { classId: 1, studentId: 3, joinedAt: daysFromNow(-30) },
    { classId: 1, studentId: 7, joinedAt: daysFromNow(-30) },
    { classId: 1, studentId: 8, joinedAt: daysFromNow(-28) },
    { classId: 1, studentId: 9, joinedAt: daysFromNow(-2) },
    { classId: 1, studentId: 10, joinedAt: daysFromNow(-25) },
    { classId: 2, studentId: 3, joinedAt: daysFromNow(-29) },
    { classId: 2, studentId: 7, joinedAt: daysFromNow(-29) },
    { classId: 2, studentId: 9, joinedAt: daysFromNow(-2) },
    { classId: 3, studentId: 8, joinedAt: daysFromNow(-1) },
    { classId: 3, studentId: 10, joinedAt: daysFromNow(-1) },
    { classId: 3, studentId: 11, joinedAt: daysFromNow(-1) },
    { classId: 4, studentId: 3, joinedAt: daysFromNow(-7) },
    { classId: 4, studentId: 11, joinedAt: daysFromNow(-1) },
    { classId: 5, studentId: 7, joinedAt: daysFromNow(-12) },
    { classId: 5, studentId: 8, joinedAt: daysFromNow(-12) },
  ],
};

// --------------------------------------------------------------------------
// Still static (assignments/grades are a later step)
// --------------------------------------------------------------------------
export const adminActivity = [
  { id: 1, text: 'Ahmed Raza created "Data Structures — Section C"', when: 'Yesterday' },
  { id: 2, text: 'Fatima Noor added Ali Hassan to Web Development', when: 'Yesterday' },
  { id: 3, text: 'Bilal Ahmed was invited as a teacher', when: '3 days ago' },
  { id: 4, text: 'Usman Tariq accepted his invitation', when: 'Last week' },
];

export const teacherAssignments = [
  { id: 1, title: 'Lab 3: Loops and conditionals', classId: 1, className: 'Programming Fundamentals', dueAt: daysFromNow(3), submitted: 4, total: 5, status: 'active' },
  { id: 2, title: 'Inheritance exercise', classId: 2, className: 'Object Oriented Programming', dueAt: daysFromNow(7), submitted: 1, total: 3, status: 'active' },
  { id: 3, title: 'Linked list implementation', classId: 3, className: 'Data Structures', dueAt: daysFromNow(10), submitted: 0, total: 3, status: 'active' },
  { id: 4, title: 'Lab 2: Variables and types', classId: 1, className: 'Programming Fundamentals', dueAt: daysFromNow(-6), submitted: 5, total: 5, status: 'closed' },
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
