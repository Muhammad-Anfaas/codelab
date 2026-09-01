import { useState } from 'react';
import { DataContext } from './context';
import { seed } from '../mock/data';
import { supabase } from '../lib/supabase';

// Temporary id generator. The real ids will come from PostgreSQL.
const nextId = () => Date.now() + Math.floor(Math.random() * 1000);

/**
 * In-memory "database" for the frontend-only phase.
 *
 * Every action below is named after the API call that will replace it.
 * When the backend exists, the body of each function becomes a fetch(),
 * and the pages that call them don't change.
 *
 * State resets on page reload — that's expected at this stage.
 */
export default function DataProvider({ children }) {
  const [teachers, setTeachers] = useState(seed.teachers);
  const [students, setStudents] = useState(seed.students);
  const [classes, setClasses] = useState(seed.classes);
  const [enrollments, setEnrollments] = useState(seed.enrollments);

  // POST /api/admin/teachers  (admin only)
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

  const teacher = result.teacher;

  /*
   * Add the newly-created teacher to the local state
   * so the table updates immediately.
   */
  setTeachers((prev) => [
    {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      mustChangePassword: teacher.mustChangePassword,
      createdAt: teacher.createdAt,
      employeeId: teacher.employeeId,
    },
    ...prev,
  ]);

  return {
    ...teacher,
    temporaryPassword: result.temporaryPassword,
  };
}

  // DELETE /api/admin/teachers/:id  (admin only)
  // Returns an error message instead of deleting when the teacher still
  // owns classes — the backend will enforce the same rule.
  function removeTeacher(teacherId) {
    const owned = classes.filter((c) => c.teacherId === teacherId).length;
    if (owned > 0) {
      return `This teacher still has ${owned} class${owned === 1 ? '' : 'es'}. Reassign or delete them first.`;
    }
    setTeachers((prev) => prev.filter((t) => t.id !== teacherId));
    return null;
  }

  // POST /api/classes  (teacher only; the server sets teacherId from the session)
  function createClass({ name, section, teacherId }) {
    const cls = { id: nextId(), name, section, teacherId, createdAt: new Date().toISOString() };
    setClasses((prev) => [...prev, cls]);
    return cls;
  }

  // POST /api/classes/:id/students  (teacher only, own classes only)
  // If no student with that email exists yet, one is created and "invited".
  // Returns { student, created } so the UI can word its message correctly.
  function addStudentToClass(classId, { name, email }) {
    let student = students.find((s) => s.email === email);
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
      setStudents((prev) => [...prev, student]);
    }

    setEnrollments((prev) => [
      ...prev,
      { classId, studentId: student.id, joinedAt: new Date().toISOString() },
    ]);
    return { student, created };
  }

  // DELETE /api/classes/:id/students/:studentId
  function removeStudentFromClass(classId, studentId) {
    setEnrollments((prev) =>
      prev.filter((e) => !(e.classId === classId && e.studentId === studentId)),
    );
  }

  const value = {
    teachers,
    students,
    classes,
    enrollments,
    addTeacher,
    removeTeacher,
    createClass,
    addStudentToClass,
    removeStudentFromClass,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
