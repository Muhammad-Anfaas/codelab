import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type StudentInput = {
  rowNumber?: number;
  rollNumber?: string;
  fullName?: string;
  normalizedRollNumber?: string;
  section?: string;
};

type RowResult = {
  rowNumber: number;
  rollNumber: string;
  email?: string;
  status: 'created' | 'enrolled' | 'already_enrolled' | 'failed';
  error?: string;
  temporaryPassword?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function studentEmail(normalizedRollNumber: string) {
  const match = /^(\d{2})P(\d{4})$/i.exec(
    normalizedRollNumber,
  );

  return match
    ? `p${match[1]}${match[2]}@pwr.nu.edu.pk`
    : null;
}

function validateRow(
  input: StudentInput,
  fallbackRowNumber: number,
  classSection: string,
  seenRollNumbers: Set<string>,
) {
  const rowNumber = Number.isInteger(input.rowNumber)
    ? Number(input.rowNumber)
    : fallbackRowNumber;
  const rollNumber = cleanText(input.rollNumber).toUpperCase();
  const fullName = cleanText(input.fullName);
  const normalizedRollNumber = cleanText(
    input.normalizedRollNumber,
  ).toUpperCase();
  const section = cleanText(input.section).toUpperCase();
  const errors: string[] = [];

  if (!rollNumber) errors.push('Roll number is required.');
  if (!fullName) errors.push('Full name is required.');
  if (!normalizedRollNumber) {
    errors.push('Normalized roll number is required.');
  }
  if (!section) errors.push('Section is required.');

  const match = /^(\d{2})P-(\d{4})$/i.exec(rollNumber);
  const expectedNormalized = match
    ? `${match[1]}P${match[2]}`
    : null;

  if (rollNumber && !match) {
    errors.push('Roll number must match the format 25P-0512.');
  }

  if (
    expectedNormalized &&
    normalizedRollNumber !== expectedNormalized
  ) {
    errors.push(
      `Normalized roll number must be ${expectedNormalized}.`,
    );
  }

  const email = studentEmail(normalizedRollNumber);

  if (normalizedRollNumber && !email) {
    errors.push(
      'Normalized roll number must match the format 25P0512.',
    );
  }

  if (section && section !== classSection.toUpperCase()) {
    errors.push(
      `Section must match the selected class section (${classSection}).`,
    );
  }

  if (normalizedRollNumber) {
    if (seenRollNumbers.has(normalizedRollNumber)) {
      errors.push('Duplicate roll number in this import.');
    } else {
      seenRollNumbers.add(normalizedRollNumber);
    }
  }

  return {
    rowNumber,
    rollNumber,
    fullName,
    normalizedRollNumber,
    section,
    email,
    errors,
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get(
    'SUPABASE_SERVICE_ROLE_KEY',
  );
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse(
      { error: 'Server configuration error.' },
      500,
    );
  }

  const authorization = request.headers.get('Authorization');

  if (!authorization) {
    return jsonResponse(
      { error: 'Missing authorization header.' },
      401,
    );
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: authorization },
    },
  });
  const adminClient = createClient(
    supabaseUrl,
    serviceRoleKey,
  );

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: 'Invalid authentication.' }, 401);
  }

  let body: {
    classId?: string;
    fileName?: string;
    students?: StudentInput[];
  };

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const classId = cleanText(body.classId);
  const fileName = cleanText(body.fileName).slice(0, 255);
  const inputRows = Array.isArray(body.students)
    ? body.students
    : [];

  if (!classId) {
    return jsonResponse({ error: 'Class ID is required.' }, 400);
  }

  if (inputRows.length === 0) {
    return jsonResponse(
      { error: 'At least one student row is required.' },
      400,
    );
  }

  if (inputRows.length > 500) {
    return jsonResponse(
      { error: 'A single import is limited to 500 students.' },
      400,
    );
  }

  const { data: profile, error: profileError } =
    await adminClient
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', user.id)
      .single();

  if (
    profileError ||
    !profile ||
    profile.role !== 'teacher' ||
    !profile.is_active
  ) {
    return jsonResponse(
      { error: 'Only active teachers can import students.' },
      403,
    );
  }

  const { data: teacher, error: teacherError } =
    await adminClient
      .from('teachers')
      .select('id')
      .eq('profile_id', user.id)
      .single();

  if (teacherError || !teacher) {
    return jsonResponse(
      { error: 'Teacher record not found.' },
      403,
    );
  }

  const { data: selectedClass, error: classError } =
    await adminClient
      .from('classes')
      .select('id, teacher_id, section')
      .eq('id', classId)
      .eq('teacher_id', teacher.id)
      .single();

  if (classError || !selectedClass) {
    return jsonResponse(
      { error: 'Class not found or not owned by this teacher.' },
      403,
    );
  }

  const { data: importRecord, error: importError } =
    await adminClient
      .from('student_imports')
      .insert({
        class_id: selectedClass.id,
        teacher_id: teacher.id,
        file_name: fileName || null,
        total_rows: inputRows.length,
      })
      .select('id')
      .single();

  if (importError || !importRecord) {
    console.error('Failed to create import record:', importError);
    return jsonResponse(
      { error: 'Could not create the import audit record.' },
      500,
    );
  }

  const results: RowResult[] = [];
  const auditErrors: Array<{
    import_id: string;
    row_number: number;
    roll_number: string | null;
    error_message: string;
  }> = [];
  const seenRollNumbers = new Set<string>();
  let created = 0;
  let enrolled = 0;
  let alreadyEnrolled = 0;
  let failed = 0;

  function recordFailure(
    rowNumber: number,
    rollNumber: string,
    message: string,
  ) {
    failed += 1;
    results.push({
      rowNumber,
      rollNumber,
      status: 'failed',
      error: message,
    });
    auditErrors.push({
      import_id: importRecord.id,
      row_number: rowNumber,
      roll_number: rollNumber || null,
      error_message: message,
    });
  }

  for (let index = 0; index < inputRows.length; index += 1) {
    const validated = validateRow(
      inputRows[index],
      index + 2,
      selectedClass.section,
      seenRollNumbers,
    );

    if (validated.errors.length > 0 || !validated.email) {
      recordFailure(
        validated.rowNumber,
        validated.rollNumber,
        validated.errors.join(' '),
      );
      continue;
    }

    let newAuthUserId: string | null = null;

    try {
      const [profileLookup, rollLookup] = await Promise.all([
        adminClient
          .from('profiles')
          .select('id, email, role')
          .eq('email', validated.email)
          .maybeSingle(),
        adminClient
          .from('students')
          .select('id, profile_id, roll_number, roll_number_normalized')
          .eq(
            'roll_number_normalized',
            validated.normalizedRollNumber,
          )
          .maybeSingle(),
      ]);

      if (profileLookup.error) throw profileLookup.error;
      if (rollLookup.error) throw rollLookup.error;

      const existingProfile = profileLookup.data;
      let student = rollLookup.data;

      if (existingProfile || student) {
        if (
          !existingProfile ||
          existingProfile.role !== 'student' ||
          !student ||
          student.profile_id !== existingProfile.id
        ) {
          throw new Error(
            'An account or roll number already exists with conflicting student data.',
          );
        }
      } else {
        const { data: authData, error: authError } =
          await adminClient.auth.admin.createUser({
            email: validated.email,
            password: validated.rollNumber,
            email_confirm: true,
          });

        if (authError || !authData.user) {
          throw new Error(
            authError?.message ||
              'Could not create the authentication account.',
          );
        }

        newAuthUserId = authData.user.id;

        const { error: newProfileError } = await adminClient
          .from('profiles')
          .insert({
            id: newAuthUserId,
            username: validated.rollNumber,
            full_name: validated.fullName,
            email: validated.email,
            role: 'student',
            must_change_password: true,
            is_active: true,
          });

        if (newProfileError) throw newProfileError;

        const { data: newStudent, error: newStudentError } =
          await adminClient
            .from('students')
            .insert({
              profile_id: newAuthUserId,
              roll_number: validated.rollNumber,
              roll_number_normalized:
                validated.normalizedRollNumber,
            })
            .select(
              'id, profile_id, roll_number, roll_number_normalized',
            )
            .single();

        if (newStudentError || !newStudent) {
          throw (
            newStudentError ||
            new Error('Could not create the student record.')
          );
        }

        student = newStudent;
      }

      const { data: existingEnrollment, error: enrollmentLookupError } =
        await adminClient
          .from('student_classes')
          .select('student_id')
          .eq('student_id', student.id)
          .eq('class_id', selectedClass.id)
          .maybeSingle();

      if (enrollmentLookupError) throw enrollmentLookupError;

      if (existingEnrollment) {
        alreadyEnrolled += 1;
        results.push({
          rowNumber: validated.rowNumber,
          rollNumber: validated.rollNumber,
          email: validated.email,
          status: 'already_enrolled',
        });
        continue;
      }

      const { error: enrollmentError } = await adminClient
        .from('student_classes')
        .insert({
          student_id: student.id,
          class_id: selectedClass.id,
        });

      if (enrollmentError) throw enrollmentError;

      enrolled += 1;

      if (newAuthUserId) {
        created += 1;
        results.push({
          rowNumber: validated.rowNumber,
          rollNumber: validated.rollNumber,
          email: validated.email,
          status: 'created',
          temporaryPassword: validated.rollNumber,
        });
      } else {
        results.push({
          rowNumber: validated.rowNumber,
          rollNumber: validated.rollNumber,
          email: validated.email,
          status: 'enrolled',
        });
      }
    } catch (error) {
      if (newAuthUserId) {
        await adminClient.auth.admin.deleteUser(newAuthUserId);
      }

      recordFailure(
        validated.rowNumber,
        validated.rollNumber,
        error instanceof Error
          ? error.message
          : 'Unexpected row import error.',
      );
    }
  }

  if (auditErrors.length > 0) {
    const { error: auditError } = await adminClient
      .from('student_import_errors')
      .insert(auditErrors);

    if (auditError) {
      console.error('Failed to save import errors:', auditError);
    }
  }

  const { error: summaryError } = await adminClient
    .from('student_imports')
    .update({
      successful_rows: inputRows.length - failed,
      failed_rows: failed,
    })
    .eq('id', importRecord.id);

  if (summaryError) {
    console.error('Failed to update import summary:', summaryError);
  }

  return jsonResponse({
    success: true,
    importId: importRecord.id,
    summary: {
      total: inputRows.length,
      created,
      enrolled,
      alreadyEnrolled,
      failed,
    },
    results,
  });
});
