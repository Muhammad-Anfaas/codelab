alter table public.assignments
  add column duration_minutes integer
    check (duration_minutes is null or duration_minutes between 5 and 480),
  add column available_from timestamptz,
  add column fullscreen_required boolean not null default true,
  add column restrict_clipboard boolean not null default true,
  add column max_focus_losses integer not null default 5
    check (max_focus_losses between 0 and 100),
  add constraint assignments_availability_window_check
    check (available_from is null or available_from < due_at);

create table public.assignment_questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  position integer not null check (position between 1 and 100),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  prompt text not null check (char_length(btrim(prompt)) between 1 and 20000),
  language text not null default 'python'
    check (language in (
      'javascript', 'typescript', 'python', 'java', 'cpp',
      'csharp', 'go', 'rust', 'php', 'ruby', 'plaintext'
    )),
  starter_code text not null default '',
  max_score numeric(7, 2) not null default 10
    check (max_score > 0 and max_score <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, position)
);

create index assignment_questions_assignment_id_idx
  on public.assignment_questions(assignment_id, position);

create trigger assignment_questions_set_updated_at
before update on public.assignment_questions
for each row execute function public.update_updated_at();

create table public.assignment_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted', 'flagged', 'expired')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  last_heartbeat_at timestamptz not null default now(),
  heartbeat_sequence integer not null default 0 check (heartbeat_sequence >= 0),
  challenge_nonce_hash text,
  challenge_expires_at timestamptz,
  invalid_heartbeat_count integer not null default 0
    check (invalid_heartbeat_count >= 0),
  focus_loss_count integer not null default 0
    check (focus_loss_count >= 0),
  fullscreen_exit_count integer not null default 0
    check (fullscreen_exit_count >= 0),
  suspicious_event_count integer not null default 0
    check (suspicious_event_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id),
  check (
    (status = 'submitted' and submitted_at is not null)
    or status <> 'submitted'
  )
);

create index assignment_attempts_assignment_id_idx
  on public.assignment_attempts(assignment_id);

create index assignment_attempts_student_id_idx
  on public.assignment_attempts(student_id);

create index assignment_attempts_heartbeat_idx
  on public.assignment_attempts(status, last_heartbeat_at);

create trigger assignment_attempts_set_updated_at
before update on public.assignment_attempts
for each row execute function public.update_updated_at();

create table public.submission_answers (
  attempt_id uuid not null references public.assignment_attempts(id) on delete cascade,
  question_id uuid not null references public.assignment_questions(id) on delete cascade,
  code text not null default '' check (octet_length(code) <= 1000000),
  language text not null,
  version integer not null default 1 check (version > 0),
  saved_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

create index submission_answers_question_id_idx
  on public.submission_answers(question_id);

create table public.integrity_events (
  id bigint generated always as identity primary key,
  attempt_id uuid not null references public.assignment_attempts(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  event_type text not null check (event_type in (
    'paste_attempt', 'copy_attempt', 'cut_attempt', 'drop_attempt',
    'context_menu', 'focus_loss', 'tab_hidden', 'fullscreen_exit',
    'suspicious_shortcut', 'runtime_tamper', 'heartbeat_gap',
    'invalid_heartbeat', 'session_started', 'session_submitted'
  )),
  details jsonb not null default '{}'::jsonb,
  client_at timestamptz,
  received_at timestamptz not null default now()
);

create index integrity_events_attempt_id_idx
  on public.integrity_events(attempt_id, received_at desc);

alter table public.assignment_questions enable row level security;
alter table public.assignment_attempts enable row level security;
alter table public.submission_answers enable row level security;
alter table public.integrity_events enable row level security;

create policy "Admin can manage assignment questions"
on public.assignment_questions for all to authenticated
using ((select public.current_user_role()) = 'admin'::public.user_role)
with check ((select public.current_user_role()) = 'admin'::public.user_role);

create policy "Teacher can manage own assignment questions"
on public.assignment_questions for all to authenticated
using (
  exists (
    select 1
    from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = assignment_questions.assignment_id
      and c.teacher_id = (select public.current_teacher_id())
  )
)
with check (
  exists (
    select 1
    from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = assignment_questions.assignment_id
      and c.teacher_id = (select public.current_teacher_id())
  )
);

create policy "Student can view questions for enrolled published assignments"
on public.assignment_questions for select to authenticated
using (
  exists (
    select 1
    from public.assignments a
    join public.student_classes sc on sc.class_id = a.class_id
    where a.id = assignment_questions.assignment_id
      and a.status in ('published', 'closed')
      and sc.student_id = (select public.current_student_id())
  )
);

create policy "Admin can view all attempts"
on public.assignment_attempts for select to authenticated
using ((select public.current_user_role()) = 'admin'::public.user_role);

create policy "Teacher can view own assignment attempts"
on public.assignment_attempts for select to authenticated
using (
  exists (
    select 1
    from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = assignment_attempts.assignment_id
      and c.teacher_id = (select public.current_teacher_id())
  )
);

create policy "Student can view own attempts"
on public.assignment_attempts for select to authenticated
using (student_id = (select public.current_student_id()));

create policy "Admin can view all answers"
on public.submission_answers for select to authenticated
using ((select public.current_user_role()) = 'admin'::public.user_role);

create policy "Teacher can view answers for own assignments"
on public.submission_answers for select to authenticated
using (
  exists (
    select 1
    from public.assignment_attempts aa
    join public.assignments a on a.id = aa.assignment_id
    join public.classes c on c.id = a.class_id
    where aa.id = submission_answers.attempt_id
      and c.teacher_id = (select public.current_teacher_id())
  )
);

create policy "Student can view own answers"
on public.submission_answers for select to authenticated
using (
  exists (
    select 1
    from public.assignment_attempts aa
    where aa.id = submission_answers.attempt_id
      and aa.student_id = (select public.current_student_id())
  )
);

create policy "Admin can view all integrity events"
on public.integrity_events for select to authenticated
using ((select public.current_user_role()) = 'admin'::public.user_role);

create policy "Teacher can view own assignment integrity events"
on public.integrity_events for select to authenticated
using (
  exists (
    select 1
    from public.assignment_attempts aa
    join public.assignments a on a.id = aa.assignment_id
    join public.classes c on c.id = a.class_id
    where aa.id = integrity_events.attempt_id
      and c.teacher_id = (select public.current_teacher_id())
  )
);

revoke all on table public.assignment_questions from anon;
revoke all on table public.assignment_attempts from anon;
revoke all on table public.submission_answers from anon;
revoke all on table public.integrity_events from anon;

grant select, insert, update, delete
  on table public.assignment_questions to authenticated;
grant select on table public.assignment_attempts to authenticated;
grant select on table public.submission_answers to authenticated;
grant select on table public.integrity_events to authenticated;

create or replace function public.save_coding_assignment(
  p_assignment_id uuid,
  p_class_id uuid,
  p_title text,
  p_description text,
  p_due_at timestamptz,
  p_max_score numeric,
  p_status text,
  p_duration_minutes integer,
  p_available_from timestamptz,
  p_fullscreen_required boolean,
  p_restrict_clipboard boolean,
  p_max_focus_losses integer,
  p_questions jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher_id uuid := public.current_teacher_id();
  v_assignment_id uuid;
  v_question_count integer := jsonb_array_length(coalesce(p_questions, '[]'::jsonb));
begin
  if v_teacher_id is null then
    raise exception 'An active teacher account is required.';
  end if;

  if not exists (
    select 1 from public.classes c
    where c.id = p_class_id and c.teacher_id = v_teacher_id
  ) then
    raise exception 'Class not found or not owned by this teacher.';
  end if;

  if p_status not in ('draft', 'published', 'closed') then
    raise exception 'Invalid assignment status.';
  end if;

  if v_question_count > 7 then
    raise exception 'A coding assignment can contain at most 7 questions.';
  end if;

  if p_status in ('published', 'closed')
     and v_question_count not between 6 and 7 then
    raise exception 'Published coding assignments must contain 6 or 7 questions.';
  end if;

  if p_due_at <= now() then
    raise exception 'The due date must be in the future.';
  end if;

  if p_available_from is not null and p_available_from >= p_due_at then
    raise exception 'The availability date must be before the due date.';
  end if;

  if p_assignment_id is null then
    insert into public.assignments (
      class_id, title, description, due_at, max_score, status,
      duration_minutes, available_from, fullscreen_required,
      restrict_clipboard, max_focus_losses
    ) values (
      p_class_id, btrim(p_title), coalesce(btrim(p_description), ''),
      p_due_at, p_max_score, p_status, p_duration_minutes,
      p_available_from, coalesce(p_fullscreen_required, true),
      coalesce(p_restrict_clipboard, true),
      coalesce(p_max_focus_losses, 5)
    ) returning id into v_assignment_id;
  else
    if not exists (
      select 1
      from public.assignments a
      join public.classes c on c.id = a.class_id
      where a.id = p_assignment_id and c.teacher_id = v_teacher_id
    ) then
      raise exception 'Assignment not found or not owned by this teacher.';
    end if;

    if exists (
      select 1 from public.assignment_attempts aa
      where aa.assignment_id = p_assignment_id
    ) then
      raise exception 'Questions cannot be changed after a student starts this assignment.';
    end if;

    update public.assignments
    set class_id = p_class_id,
        title = btrim(p_title),
        description = coalesce(btrim(p_description), ''),
        due_at = p_due_at,
        max_score = p_max_score,
        status = p_status,
        duration_minutes = p_duration_minutes,
        available_from = p_available_from,
        fullscreen_required = coalesce(p_fullscreen_required, true),
        restrict_clipboard = coalesce(p_restrict_clipboard, true),
        max_focus_losses = coalesce(p_max_focus_losses, 5)
    where id = p_assignment_id;

    v_assignment_id := p_assignment_id;
    delete from public.assignment_questions
    where assignment_id = v_assignment_id;
  end if;

  insert into public.assignment_questions (
    assignment_id, position, title, prompt, language,
    starter_code, max_score
  )
  select
    v_assignment_id,
    question.position,
    btrim(question.title),
    btrim(question.prompt),
    question.language,
    coalesce(question.starter_code, ''),
    question.max_score
  from jsonb_to_recordset(coalesce(p_questions, '[]'::jsonb)) as question(
    position integer,
    title text,
    prompt text,
    language text,
    starter_code text,
    max_score numeric
  );

  return v_assignment_id;
end;
$$;

create or replace function public.set_coding_assignment_status(
  p_assignment_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher_id uuid := public.current_teacher_id();
  v_question_count integer;
begin
  if p_status not in ('draft', 'published', 'closed') then
    raise exception 'Invalid assignment status.';
  end if;

  if not exists (
    select 1
    from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = p_assignment_id and c.teacher_id = v_teacher_id
  ) then
    raise exception 'Assignment not found or not owned by this teacher.';
  end if;

  select count(*) into v_question_count
  from public.assignment_questions q
  where q.assignment_id = p_assignment_id;

  if p_status in ('published', 'closed')
     and v_question_count not between 6 and 7 then
    raise exception 'Published coding assignments must contain 6 or 7 questions.';
  end if;

  update public.assignments
  set status = p_status
  where id = p_assignment_id;
end;
$$;

create or replace function public.delete_coding_assignment(
  p_assignment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher_id uuid := public.current_teacher_id();
begin
  delete from public.assignments a
  using public.classes c
  where a.id = p_assignment_id
    and c.id = a.class_id
    and c.teacher_id = v_teacher_id;

  if not found then
    raise exception 'Assignment not found or not owned by this teacher.';
  end if;
end;
$$;

revoke insert, update, delete on table public.assignments from authenticated;
revoke insert, update, delete on table public.assignment_questions from authenticated;

revoke all on function public.save_coding_assignment(
  uuid, uuid, text, text, timestamptz, numeric, text, integer,
  timestamptz, boolean, boolean, integer, jsonb
) from public, anon;
revoke all on function public.set_coding_assignment_status(uuid, text)
  from public, anon;
revoke all on function public.delete_coding_assignment(uuid)
  from public, anon;

grant execute on function public.save_coding_assignment(
  uuid, uuid, text, text, timestamptz, numeric, text, integer,
  timestamptz, boolean, boolean, integer, jsonb
) to authenticated;
grant execute on function public.set_coding_assignment_status(uuid, text)
  to authenticated;
grant execute on function public.delete_coding_assignment(uuid)
  to authenticated;
