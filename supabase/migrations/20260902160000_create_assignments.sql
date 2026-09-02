create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text not null default '',
  due_at timestamptz not null,
  max_score numeric(7, 2) not null default 100
    check (max_score > 0 and max_score <= 10000),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assignments_class_id_idx
  on public.assignments(class_id);

create index assignments_due_at_idx
  on public.assignments(due_at);

create trigger assignments_set_updated_at
before update on public.assignments
for each row execute function public.update_updated_at();

alter table public.assignments enable row level security;

create policy "Admin can manage assignments"
on public.assignments
for all
to authenticated
using ((select public.current_user_role()) = 'admin'::public.user_role)
with check ((select public.current_user_role()) = 'admin'::public.user_role);

create policy "Teacher can view own assignments"
on public.assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.classes c
    where c.id = assignments.class_id
      and c.teacher_id = (select public.current_teacher_id())
  )
);

create policy "Teacher can create own assignments"
on public.assignments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.classes c
    where c.id = assignments.class_id
      and c.teacher_id = (select public.current_teacher_id())
  )
);

create policy "Teacher can update own assignments"
on public.assignments
for update
to authenticated
using (
  exists (
    select 1
    from public.classes c
    where c.id = assignments.class_id
      and c.teacher_id = (select public.current_teacher_id())
  )
)
with check (
  exists (
    select 1
    from public.classes c
    where c.id = assignments.class_id
      and c.teacher_id = (select public.current_teacher_id())
  )
);

create policy "Teacher can delete own assignments"
on public.assignments
for delete
to authenticated
using (
  exists (
    select 1
    from public.classes c
    where c.id = assignments.class_id
      and c.teacher_id = (select public.current_teacher_id())
  )
);

create policy "Student can view enrolled published assignments"
on public.assignments
for select
to authenticated
using (
  status in ('published', 'closed')
  and exists (
    select 1
    from public.student_classes sc
    where sc.class_id = assignments.class_id
      and sc.student_id = (select public.current_student_id())
  )
);

revoke all on table public.assignments from anon;
grant select, insert, update, delete on table public.assignments to authenticated;
