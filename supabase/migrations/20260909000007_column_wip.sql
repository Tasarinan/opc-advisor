alter table public.project_columns
  add column if not exists wip_limit integer check (wip_limit is null or wip_limit >= 1),
  add column if not exists auto_assign_id uuid references auth.users (id) on delete set null;
