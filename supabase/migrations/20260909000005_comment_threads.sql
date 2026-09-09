-- One-level comment replies and @mention rows (no notification inbox)

alter table public.issue_comments
  add column if not exists parent_id bigint references public.issue_comments (id) on delete cascade;

create table if not exists public.issue_comment_mentions (
  comment_id bigint not null references public.issue_comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (comment_id, user_id)
);

alter table public.issue_comment_mentions enable row level security;

drop policy if exists mentions_via_comment on public.issue_comment_mentions;
create policy mentions_via_comment on public.issue_comment_mentions
  for all using (
    exists (
      select 1 from public.issue_comments c
      join public.issues i on i.id = c.issue_id
      where c.id = comment_id and i.project_id in (select public.my_project_ids())
    )
  ) with check (
    exists (
      select 1 from public.issue_comments c
      join public.issues i on i.id = c.issue_id
      where c.id = comment_id and i.project_id in (select public.my_project_ids())
    )
  );
