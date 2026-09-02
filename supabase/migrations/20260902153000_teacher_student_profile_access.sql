-- Do not grant teachers general SELECT access to student profile rows.
-- Expose only the fields required by the roster UI, and only for active
-- teachers viewing students enrolled in classes they own.
drop policy if exists "Teacher can view enrolled student profiles"
on public.profiles;

drop function if exists public.teacher_class_roster();

create function public.teacher_class_roster()
returns table (
  student_id uuid,
  class_id uuid,
  roll_number text,
  roll_number_normalized text,
  full_name text,
  email text,
  must_change_password boolean,
  is_active boolean,
  enrolled_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    sc.class_id,
    s.roll_number,
    s.roll_number_normalized,
    p.full_name,
    p.email,
    p.must_change_password,
    p.is_active,
    sc.enrolled_at
  from public.student_classes sc
  join public.classes c
    on c.id = sc.class_id
  join public.students s
    on s.id = sc.student_id
  join public.profiles p
    on p.id = s.profile_id
  where c.teacher_id = (
    select public.current_teacher_id()
  )
    and exists (
      select 1
      from public.profiles requester
      where requester.id = (select auth.uid())
        and requester.role = 'teacher'::public.user_role
        and requester.is_active
  )
$$;

revoke all
on function public.teacher_class_roster()
from public;

grant execute
on function public.teacher_class_roster()
to authenticated;
