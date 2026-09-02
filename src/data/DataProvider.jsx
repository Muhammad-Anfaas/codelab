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