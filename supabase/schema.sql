-- Supabase 프로젝트 SQL Editor에 그대로 붙여넣고 실행하세요.

-- 장거리 기록
create table if not exists public.long_drive_records (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone_tail text not null,
  distance integer not null check (distance > 0),
  created_at timestamptz not null default now()
);

create index if not exists long_drive_records_distance_idx
  on public.long_drive_records (distance desc, created_at asc);

-- 노래방 기록
create table if not exists public.karaoke_records (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone_tail text not null,
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);

create index if not exists karaoke_records_score_idx
  on public.karaoke_records (score desc, created_at asc);

-- RLS 활성화 (anon 키로 읽기/쓰기 허용 — 박람회 현장 임시 운영용)
-- 운영 정책에 따라 수정/삭제 권한은 제한할 수 있습니다.
alter table public.long_drive_records enable row level security;
alter table public.karaoke_records enable row level security;

drop policy if exists "anon read long_drive" on public.long_drive_records;
drop policy if exists "anon write long_drive" on public.long_drive_records;
drop policy if exists "anon read karaoke" on public.karaoke_records;
drop policy if exists "anon write karaoke" on public.karaoke_records;

create policy "anon read long_drive"
  on public.long_drive_records for select using (true);
create policy "anon write long_drive"
  on public.long_drive_records for all using (true) with check (true);

create policy "anon read karaoke"
  on public.karaoke_records for select using (true);
create policy "anon write karaoke"
  on public.karaoke_records for all using (true) with check (true);

-- Realtime 활성화
alter publication supabase_realtime add table public.long_drive_records;
alter publication supabase_realtime add table public.karaoke_records;
