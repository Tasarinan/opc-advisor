-- Timestamps for dashboard throughput (completed_at is stamped when entering a completed column)

alter table public.issues
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists completed_at timestamptz;
