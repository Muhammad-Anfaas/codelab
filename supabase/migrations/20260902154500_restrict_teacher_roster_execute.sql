revoke execute
on function public.teacher_class_roster()
from public;

revoke execute
on function public.teacher_class_roster()
from anon;

grant execute
on function public.teacher_class_roster()
to authenticated;
