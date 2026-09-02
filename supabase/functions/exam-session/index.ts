import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const challengeLifetimeMs = 45_000;
const heartbeatGapMs = 60_000;
const maxInvalidHeartbeats = 3;
const allowedEvents = new Set([
  'paste_attempt', 'copy_attempt', 'cut_attempt', 'drop_attempt',
  'context_menu', 'focus_loss', 'tab_hidden', 'fullscreen_exit',
  'suspicious_shortcut', 'runtime_tamper',
]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(value),
  );
  return encodeBase64Url(new Uint8Array(signature));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return encodeBase64Url(new Uint8Array(digest));
}

async function issueChallenge(
  secret: string, attemptId: string, userId: string, sequence: number,
) {
  const payload = {
    attemptId,
    userId,
    sequence,
    nonce: crypto.randomUUID(),
    expiresAt: Date.now() + challengeLifetimeMs,
  };
  const encodedPayload = encodeBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const signature = await hmac(secret, encodedPayload);
  const token = `${encodedPayload}.${signature}`;
  return {
    token,
    tokenHash: await sha256(token),
    expiresAt: new Date(payload.expiresAt).toISOString(),
    payload,
  };
}

async function verifyChallenge(
  secret: string,
  token: unknown,
  expected: {
    attemptId: string;
    userId: string;
    sequence: number;
    tokenHash: string | null;
  },
) {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  try {
    const [encodedPayload, signature] = token.split('.');
    const payload = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(encodedPayload)),
    );
    return signature === await hmac(secret, encodedPayload)
      && await sha256(token) === expected.tokenHash
      && payload.attemptId === expected.attemptId
      && payload.userId === expected.userId
      && payload.sequence === expected.sequence
      && Number(payload.expiresAt) >= Date.now();
  } catch {
    return false;
  }
}

function effectiveDeadline(
  assignment: { due_at: string; duration_minutes: number | null },
  startedAt: string,
) {
  const dueAt = new Date(assignment.due_at).getTime();
  if (!assignment.duration_minutes) return dueAt;
  return Math.min(
    dueAt,
    new Date(startedAt).getTime() + assignment.duration_minutes * 60_000,
  );
}

function cleanDetails(details: unknown) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return {};
  return JSON.stringify(details).length <= 2_000 ? details : { truncated: true };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const challengeSecret = Deno.env.get('INTEGRITY_CHALLENGE_SECRET');
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !serviceRoleKey || !anonKey || !challengeSecret) {
    return jsonResponse({ error: 'Server configuration error.' }, 500);
  }
  if (!authorization) return jsonResponse({ error: 'Missing authorization header.' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return jsonResponse({ error: 'Invalid authentication.' }, 401);

  const { data: student, error: studentError } = await adminClient
    .from('students')
    .select('id, profiles!inner(is_active, role)')
    .eq('profile_id', user.id)
    .single();
  if (
    studentError || !student || !student.profiles?.is_active
    || student.profiles?.role !== 'student'
  ) {
    return jsonResponse({ error: 'An active student account is required.' }, 403);
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }
  const action = body.action;

  if (action === 'start') {
    const assignmentId = typeof body.assignmentId === 'string' ? body.assignmentId : '';
    const { data: assignment, error: assignmentError } = await adminClient
      .from('assignments')
      .select(`
        id, class_id, title, description, due_at, available_from,
        duration_minutes, fullscreen_required, restrict_clipboard,
        max_focus_losses, status
      `)
      .eq('id', assignmentId)
      .single();
    if (assignmentError || !assignment || assignment.status !== 'published') {
      return jsonResponse({ error: 'Assignment is not available.' }, 404);
    }

    const now = Date.now();
    if (
      (assignment.available_from && new Date(assignment.available_from).getTime() > now)
      || new Date(assignment.due_at).getTime() <= now
    ) {
      return jsonResponse({ error: 'Assignment is outside its availability window.' }, 403);
    }

    const { data: questions, error: questionsError } = await adminClient
      .from('assignment_questions')
      .select('id, position, title, prompt, language, starter_code, max_score')
      .eq('assignment_id', assignment.id)
      .order('position');
    if (questionsError || !questions || questions.length < 6 || questions.length > 7) {
      return jsonResponse({ error: 'Assignment setup is incomplete.' }, 409);
    }

    const { data: enrollment } = await adminClient.from('student_classes')
      .select('student_id')
      .eq('class_id', assignment.class_id)
      .eq('student_id', student.id)
      .maybeSingle();
    if (!enrollment) return jsonResponse({ error: 'You are not enrolled in this class.' }, 403);

    let { data: attempt } = await adminClient.from('assignment_attempts')
      .select('*')
      .eq('assignment_id', assignment.id)
      .eq('student_id', student.id)
      .maybeSingle();
    if (attempt?.status === 'submitted' || attempt?.status === 'expired') {
      return jsonResponse({ error: `This attempt is ${attempt.status}.` }, 409);
    }

    if (!attempt) {
      const created = await adminClient.from('assignment_attempts')
        .insert({ assignment_id: assignment.id, student_id: student.id })
        .select().single();
      if (created.error || !created.data) {
        return jsonResponse({ error: 'Could not start the assignment.' }, 500);
      }
      attempt = created.data;
      await adminClient.from('integrity_events').insert({
        attempt_id: attempt.id,
        student_id: student.id,
        event_type: 'session_started',
      });
    }

    if (Date.now() >= effectiveDeadline(assignment, attempt.started_at)) {
      await adminClient.from('assignment_attempts')
        .update({ status: 'expired' }).eq('id', attempt.id);
      return jsonResponse({ error: 'This attempt has expired.' }, 409);
    }

    const nextSequence = Number(attempt.heartbeat_sequence) + 1;
    const challenge = await issueChallenge(
      challengeSecret, attempt.id, user.id, nextSequence,
    );
    await adminClient.from('assignment_attempts').update({
      heartbeat_sequence: nextSequence,
      challenge_nonce_hash: challenge.tokenHash,
      challenge_expires_at: challenge.expiresAt,
      last_heartbeat_at: new Date().toISOString(),
    }).eq('id', attempt.id);

    const { data: answers } = await adminClient.from('submission_answers')
        .select('question_id, code, language, version, saved_at')
        .eq('attempt_id', attempt.id);
    return jsonResponse({
      success: true,
      assignment,
      attempt: {
        id: attempt.id,
        status: attempt.status,
        startedAt: attempt.started_at,
        deadline: new Date(effectiveDeadline(assignment, attempt.started_at)).toISOString(),
      },
      questions: questions || [],
      answers: answers || [],
      challenge: challenge.token,
      challengeExpiresAt: challenge.expiresAt,
    });
  }

  const attemptId = typeof body.attemptId === 'string' ? body.attemptId : '';
  const { data: attempt, error: attemptError } = await adminClient
    .from('assignment_attempts')
    .select('*, assignments(*)')
    .eq('id', attemptId)
    .eq('student_id', student.id)
    .single();
  if (attemptError || !attempt) return jsonResponse({ error: 'Attempt not found.' }, 404);

  const validChallenge = await verifyChallenge(challengeSecret, body.challenge, {
    attemptId: attempt.id,
    userId: user.id,
    sequence: attempt.heartbeat_sequence,
    tokenHash: attempt.challenge_nonce_hash,
  });
  if (!validChallenge) {
    const invalidCount = Number(attempt.invalid_heartbeat_count) + 1;
    const expired = invalidCount >= maxInvalidHeartbeats;
    await Promise.all([
      adminClient.from('assignment_attempts').update({
        invalid_heartbeat_count: invalidCount,
        status: expired ? 'expired' : attempt.status,
      }).eq('id', attempt.id),
      adminClient.from('integrity_events').insert({
        attempt_id: attempt.id,
        student_id: student.id,
        event_type: 'invalid_heartbeat',
      }),
    ]);
    return jsonResponse({
      error: expired ? 'Session invalidated.' : 'Invalid session challenge.',
      invalidated: expired,
    }, 401);
  }

  if (!['in_progress', 'flagged'].includes(attempt.status)) {
    return jsonResponse({ error: `This attempt is ${attempt.status}.` }, 409);
  }
  if (Date.now() >= effectiveDeadline(attempt.assignments, attempt.started_at)) {
    await adminClient.from('assignment_attempts')
      .update({ status: 'expired' }).eq('id', attempt.id);
    return jsonResponse({ error: 'This attempt has expired.' }, 409);
  }

  if (action === 'heartbeat') {
    const gap = Date.now() - new Date(attempt.last_heartbeat_at).getTime();
    const flagged = gap > heartbeatGapMs;
    const nextSequence = Number(attempt.heartbeat_sequence) + 1;
    const challenge = await issueChallenge(
      challengeSecret, attempt.id, user.id, nextSequence,
    );
    await adminClient.from('assignment_attempts').update({
      heartbeat_sequence: nextSequence,
      challenge_nonce_hash: challenge.tokenHash,
      challenge_expires_at: challenge.expiresAt,
      last_heartbeat_at: new Date().toISOString(),
      status: flagged ? 'flagged' : attempt.status,
    }).eq('id', attempt.id);
    if (flagged) {
      await adminClient.from('integrity_events').insert({
        attempt_id: attempt.id,
        student_id: student.id,
        event_type: 'heartbeat_gap',
        details: { gapMs: gap },
      });
    }
    return jsonResponse({
      success: true,
      status: flagged ? 'flagged' : attempt.status,
      challenge: challenge.token,
      challengeExpiresAt: challenge.expiresAt,
      deadline: new Date(
        effectiveDeadline(attempt.assignments, attempt.started_at),
      ).toISOString(),
    });
  }

  if (action === 'event') {
    const eventType = typeof body.eventType === 'string' ? body.eventType : '';
    if (!allowedEvents.has(eventType)) {
      return jsonResponse({ error: 'Invalid integrity event.' }, 400);
    }
    const updates: Record<string, number | string> = {
      suspicious_event_count: Number(attempt.suspicious_event_count) + 1,
    };
    if (eventType === 'focus_loss' || eventType === 'tab_hidden') {
      updates.focus_loss_count = Number(attempt.focus_loss_count) + 1;
    }
    if (eventType === 'fullscreen_exit') {
      updates.fullscreen_exit_count = Number(attempt.fullscreen_exit_count) + 1;
    }
    const focusLossCount = Number(updates.focus_loss_count ?? attempt.focus_loss_count);
    if (focusLossCount > attempt.assignments.max_focus_losses) updates.status = 'flagged';

    await Promise.all([
      adminClient.from('integrity_events').insert({
        attempt_id: attempt.id,
        student_id: student.id,
        event_type: eventType,
        details: cleanDetails(body.details),
        client_at: typeof body.clientAt === 'string' ? body.clientAt : null,
      }),
      adminClient.from('assignment_attempts').update(updates).eq('id', attempt.id),
    ]);
    return jsonResponse({ success: true });
  }

  if (action === 'save') {
    const questionId = typeof body.questionId === 'string' ? body.questionId : '';
    const code = typeof body.code === 'string' ? body.code : '';
    if (new TextEncoder().encode(code).length > 1_000_000) {
      return jsonResponse({ error: 'Code exceeds the 1 MB limit.' }, 413);
    }
    const { data: question } = await adminClient.from('assignment_questions')
      .select('id, language')
      .eq('id', questionId)
      .eq('assignment_id', attempt.assignment_id)
      .single();
    if (!question) {
      return jsonResponse({ error: 'Question does not belong to this assignment.' }, 400);
    }
    const { data: existing } = await adminClient.from('submission_answers')
      .select('version')
      .eq('attempt_id', attempt.id)
      .eq('question_id', question.id)
      .maybeSingle();
    const savedAt = new Date().toISOString();
    const version = Number(existing?.version || 0) + 1;
    const { error } = await adminClient.from('submission_answers').upsert({
      attempt_id: attempt.id,
      question_id: question.id,
      code,
      language: question.language,
      version,
      saved_at: savedAt,
    });
    if (error) return jsonResponse({ error: 'Could not save code.' }, 500);
    return jsonResponse({ success: true, savedAt, version });
  }

  if (action === 'submit') {
    const submittedAt = new Date().toISOString();
    const { error } = await adminClient.from('assignment_attempts').update({
      status: 'submitted',
      submitted_at: submittedAt,
    }).eq('id', attempt.id);
    if (error) return jsonResponse({ error: 'Could not submit assignment.' }, 500);
    await adminClient.from('integrity_events').insert({
      attempt_id: attempt.id,
      student_id: student.id,
      event_type: 'session_submitted',
    });
    return jsonResponse({ success: true, submittedAt });
  }

  return jsonResponse({ error: 'Unsupported action.' }, 400);
});
