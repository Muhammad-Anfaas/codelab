import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

function generateTemporaryPassword(length = 12) {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';

  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  let password = '';

  for (let i = 0; i < length; i++) {
    password += chars[randomValues[i] % chars.length];
  }

  return password;
}

Deno.serve(async (req) => {
  /*
   * Handle browser CORS preflight.
   */
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      {
        error: 'Method not allowed',
      },
      405,
    );
  }

  try {
    /*
     * Environment variables supplied by Supabase.
     */
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase environment variables');

      return jsonResponse(
        {
          error: 'Server configuration error.',
        },
        500,
      );
    }

    /*
     * Client using the user's JWT.
     *
     * This client is used only to determine who is making
     * the request.
     */
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return jsonResponse(
        {
          error: 'Missing authorization header.',
        },
        401,
      );
    }

    const userClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    );

    /*
     * Verify the logged-in user.
     */
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        {
          error: 'Invalid authentication.',
        },
        401,
      );
    }

    /*
     * Service-role client.
     *
     * IMPORTANT:
     * This key exists ONLY inside the Edge Function.
     * It must NEVER be placed in React/Vite environment variables.
     */
    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

    /*
     * Check the requester's profile.
     *
     * Only ADMIN users can create teachers.
     */
    const {
      data: adminProfile,
      error: profileError,
    } = await adminClient
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return jsonResponse(
        {
          error: 'Admin profile not found.',
        },
        403,
      );
    }

    if (
      adminProfile.role !== 'admin' ||
      !adminProfile.is_active
    ) {
      return jsonResponse(
        {
          error: 'Only active administrators can create teachers.',
        },
        403,
      );
    }

    /*
     * Read request body.
     */
    const body = await req.json();

    const name =
      typeof body.name === 'string'
        ? body.name.trim()
        : '';

    const email =
      typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';

    const employeeId =
      typeof body.employeeId === 'string'
        ? body.employeeId.trim()
        : null;

    /*
     * Basic validation.
     */
    if (!name) {
      return jsonResponse(
        {
          error: 'Teacher name is required.',
        },
        400,
      );
    }

    if (!email) {
      return jsonResponse(
        {
          error: 'Teacher email is required.',
        },
        400,
      );
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return jsonResponse(
        {
          error: 'Invalid email address.',
        },
        400,
      );
    }

    /*
     * Check whether the email already exists in profiles.
     */
    const {
      data: existingProfile,
      error: existingProfileError,
    } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('email', email)
      .maybeSingle();

    if (existingProfileError) {
      console.error(existingProfileError);

      return jsonResponse(
        {
          error: 'Could not check existing account.',
        },
        500,
      );
    }

    if (existingProfile) {
      return jsonResponse(
        {
          error: 'An account with this email already exists.',
        },
        409,
      );
    }

    /*
     * Username for teachers.
     *
     * Unlike students, teachers don't have a roll number.
     * For now we use the email address as their username.
     */
    const username = email;

    /*
     * Generate temporary password.
     */
    const temporaryPassword =
      generateTemporaryPassword();

    /*
     * Create the Supabase Auth user.
     */
    const {
      data: authData,
      error: authError,
    } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      console.error(authError);

      return jsonResponse(
        {
          error:
            authError?.message ??
            'Failed to create authentication account.',
        },
        500,
      );
    }

    const authUser = authData.user;

    /*
     * Create profile.
     */
    const {
      data: profile,
      error: insertProfileError,
    } = await adminClient
      .from('profiles')
      .insert({
        id: authUser.id,
        username,
        full_name: name,
        email,
        role: 'teacher',
        must_change_password: true,
        is_active: true,
      })
      .select()
      .single();

    if (insertProfileError || !profile) {
      console.error(insertProfileError);

      /*
       * Roll back Auth user if profile creation fails.
       */
      await adminClient.auth.admin.deleteUser(
        authUser.id,
      );

      return jsonResponse(
        {
          error: 'Failed to create teacher profile.',
        },
        500,
      );
    }

    /*
     * Create teacher record.
     */
    const {
      data: teacher,
      error: teacherError,
    } = await adminClient
      .from('teachers')
      .insert({
        profile_id: authUser.id,
        employee_id: employeeId || null,
      })
      .select()
      .single();

    if (teacherError || !teacher) {
      console.error(teacherError);

      /*
       * Roll back everything if teacher record fails.
       */
      await adminClient
        .from('profiles')
        .delete()
        .eq('id', authUser.id);

      await adminClient.auth.admin.deleteUser(
        authUser.id,
      );

      return jsonResponse(
        {
          error: 'Failed to create teacher record.',
        },
        500,
      );
    }

    /*
     * Return the created teacher.
     *
     * TEMPORARY:
     * We return the temporary password only while we're
     * developing/testing the system.
     *
     * Once email delivery is configured, this password
     * should NOT be returned to the frontend.
     */
    return jsonResponse({
      success: true,

      teacher: {
        id: teacher.id,
        profileId: profile.id,
        name: profile.full_name,
        email: profile.email,
        username: profile.username,
        employeeId: teacher.employee_id,
        mustChangePassword:
          profile.must_change_password,
        createdAt: teacher.created_at,
      },

      temporaryPassword,
    });
  } catch (error) {
    console.error('Unexpected error:', error);

    return jsonResponse(
      {
        error: 'Unexpected server error.',
      },
      500,
    );
  }
});