// Pure helpers that derive views from the raw store arrays.
// Keeping the joins here means pages stay readable and, later, these
// become trivial to replace with server-side queries.

export function classesByTeacher(classes, teacherId) {
  return classes.filter((c) => c.teacherId === teacherId);
}

export function classCountByTeacher(classes, teacherId) {
  return classesByTeacher(classes, teacherId).length;
}

export function studentCountByClass(enrollments, classId) {
  return enrollments.filter((e) => e.classId === classId).length;
}

// Students in a class, each with the date they joined it.
export function studentsInClass(students, enrollments, classId) {
  return enrollments
    .filter((e) => e.classId === classId)
    .map((e) => {
      const student = students.find((s) => s.id === e.studentId);
      return student ? { ...student, joinedAt: e.joinedAt } : null;
    })
    .filter(Boolean);
}

// Classes a student is enrolled in, each with the teacher's name.
export function classesForStudent(classes, enrollments, teachers, studentId) {
  return enrollments
    .filter((e) => e.studentId === studentId)
    .map((e) => {
      const cls = classes.find((c) => c.id === e.classId);
      if (!cls) return null;
      const teacher = teachers.find((t) => t.id === cls.teacherId);
      return { ...cls, teacherName: teacher ? teacher.name : 'Unassigned' };
    })
    .filter(Boolean);
}

export function newestFirst(rows) {
  return [...rows].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
