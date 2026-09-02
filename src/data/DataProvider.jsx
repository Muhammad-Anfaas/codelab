import { useCallback, useEffect, useState } from 'react';
import { DataContext } from './context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';

function formatAssignment(data) {
  return {
    id: data.id,
    classId: data.class_id,
    title: data.title,
    description: data.description,
    dueAt: data.due_at,
    maxScore: Number(data.max_score),
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export default function DataProvider({ children }) {
  const {
    user: authUser,
    profile,
    loading: authLoading,
  } = useAuth();

  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [currentTeacherId, setCurrentTeacherId] = useState(null);

  const loadTeachers = useCallback(async function loadTeachers() {
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
  }, []);

  const loadClasses = useCallback(async function loadClasses() {
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
  }, []);

  const loadRoster = useCallback(async function loadRoster(role) {
    setLoadingRoster(true);

    if (role === 'teacher') {
      const { data, error } = await supabase.rpc(
        'teacher_class_roster',
      );

      if (error) {
        console.error(
          'Failed to load teacher roster:',
          [error.code, error.message, error.details, error.hint]
            .filter(Boolean)
            .join(' — '),
        );
        setLoadingRoster(false);
        return;
      }

      const studentsById = new Map();

      (data || []).forEach((row) => {
        if (studentsById.has(row.student_id)) return;

        studentsById.set(row.student_id, {
          id: row.student_id,
          rollNumber: row.roll_number,
          normalizedRollNumber:
            row.roll_number_normalized,
          name: row.full_name,
          email: row.email,
          mustChangePassword: row.must_change_password,
          isActive: row.is_active,
        });
      });

      setStudents([...studentsById.values()]);
      setEnrollments(
        (data || []).map((row) => ({
          studentId: row.student_id,
          classId: row.class_id,
          joinedAt: row.enrolled_at,
        })),
      );
      setLoadingRoster(false);
      return;
    }

    const [studentsResponse, enrollmentsResponse] = await Promise.all([
      supabase
        .from('students')
        .select(`
          id,
          profile_id,
          roll_number,
          roll_number_normalized,
          created_at,
          updated_at,
          profiles (
            full_name,
            email,
            must_change_password,
            is_active,
            created_at
          )
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('student_classes')
        .select('student_id, class_id, enrolled_at')
        .order('enrolled_at', { ascending: false }),
    ]);

    if (studentsResponse.error) {
      console.error(
        'Failed to load students:',
        studentsResponse.error,
      );
    }

    if (enrollmentsResponse.error) {
      console.error(
        'Failed to load enrollments:',
        enrollmentsResponse.error,
      );
    }

    if (!studentsResponse.error) {
      const formattedStudents = (studentsResponse.data || [])
        .map((student) => {
          const studentProfile = Array.isArray(student.profiles)
            ? student.profiles[0]
            : student.profiles;

          if (!studentProfile) return null;

          return {
            id: student.id,
            profileId: student.profile_id,
            rollNumber: student.roll_number,
            normalizedRollNumber:
              student.roll_number_normalized,
            name: studentProfile.full_name,
            email: studentProfile.email,
            mustChangePassword:
              studentProfile.must_change_password,
            isActive: studentProfile.is_active,
            createdAt: student.created_at,
            updatedAt: student.updated_at,
          };
        })
        .filter(Boolean);

      setStudents(formattedStudents);
    }

    if (!enrollmentsResponse.error) {
      const formattedEnrollments = (
        enrollmentsResponse.data || []
      ).map((enrollment) => ({
        studentId: enrollment.student_id,
        classId: enrollment.class_id,
        joinedAt: enrollment.enrolled_at,
      }));

      setEnrollments(formattedEnrollments);
    }

    setLoadingRoster(false);
  }, []);

  const loadAssignments = useCallback(async function loadAssignments() {
    setLoadingAssignments(true);

    const { data, error } = await supabase
      .from('assignments')
      .select(`
        id,
        class_id,
        title,
        description,
        due_at,
        max_score,
        status,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load assignments:', error);
      setAssignments([]);
      setLoadingAssignments(false);
      return;
    }

    setAssignments((data || []).map((assignment) => ({
      id: assignment.id,
      classId: assignment.class_id,
      title: assignment.title,
      description: assignment.description,
      dueAt: assignment.due_at,
      maxScore: Number(assignment.max_score),
      status: assignment.status,
      createdAt: assignment.created_at,
      updatedAt: assignment.updated_at,
    })));
    setLoadingAssignments(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initializeData() {
      if (authLoading) return;

      if (!authUser || !profile) {
        setTeachers([]);
        setStudents([]);
        setClasses([]);
        setEnrollments([]);
        setAssignments([]);
        setCurrentTeacherId(null);
        setLoadingTeachers(false);
        setLoadingRoster(false);
        setLoadingAssignments(false);
        return;
      }

      await Promise.all([
        loadTeachers(),
        loadClasses(),
        loadRoster(profile.role),
        loadAssignments(),
      ]);

      if (cancelled) return;

      if (profile.role !== 'teacher') {
        setCurrentTeacherId(null);
        return;
      }

      const { data, error } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', authUser.id)
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
  }, [
    authLoading,
    authUser,
    profile,
    loadClasses,
    loadRoster,
    loadTeachers,
    loadAssignments,
  ]);

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

  async function importStudents(
    classId,
    { fileName, students: studentRows },
  ) {
    const response = await supabase.functions.invoke(
      'import-students',
      {
        body: {
          classId,
          fileName,
          students: studentRows,
        },
      },
    );

    if (response.error) {
      throw new Error(response.error.message);
    }

    if (!response.data?.success) {
      throw new Error(
        response.data?.error || 'Student import failed.',
      );
    }

    await loadRoster(profile?.role);

    return response.data;
  }

  async function removeStudentFromClass(
    classId,
    studentId,
  ) {
    const { error } = await supabase
      .from('student_classes')
      .delete()
      .eq('class_id', classId)
      .eq('student_id', studentId);

    if (error) {
      throw new Error(error.message);
    }

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

  async function createAssignment(values) {
    const { data, error } = await supabase
      .from('assignments')
      .insert({
        class_id: values.classId,
        title: values.title,
        description: values.description,
        due_at: values.dueAt,
        max_score: values.maxScore,
        status: values.status,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const assignment = formatAssignment(data);
    setAssignments((previous) => [assignment, ...previous]);
    return assignment;
  }

  async function updateAssignment(assignmentId, values) {
    const { data, error } = await supabase
      .from('assignments')
      .update({
        class_id: values.classId,
        title: values.title,
        description: values.description,
        due_at: values.dueAt,
        max_score: values.maxScore,
        status: values.status,
      })
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const assignment = formatAssignment(data);
    setAssignments((previous) => previous.map((item) => (
      item.id === assignmentId ? assignment : item
    )));
    return assignment;
  }

  async function updateAssignmentStatus(assignmentId, status) {
    const { data, error } = await supabase
      .from('assignments')
      .update({ status })
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const assignment = formatAssignment(data);
    setAssignments((previous) => previous.map((item) => (
      item.id === assignmentId ? assignment : item
    )));
    return assignment;
  }

  async function deleteAssignment(assignmentId) {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) throw new Error(error.message);

    setAssignments((previous) => previous.filter(
      (assignment) => assignment.id !== assignmentId,
    ));
  }

  const value = {
    teachers,
    students,
    classes,
    enrollments,
    assignments,

    loadingTeachers,
    loadingRoster,
    loadingAssignments,

    currentTeacherId,

    loadTeachers,
    loadClasses,
    loadRoster,
    loadAssignments,

    addTeacher,
    removeTeacher,
    createClass,
    importStudents,
    removeStudentFromClass,
    createAssignment,
    updateAssignment,
    updateAssignmentStatus,
    deleteAssignment,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}
