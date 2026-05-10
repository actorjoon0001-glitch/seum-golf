-- Supabase 프로젝트 SQL Editor에 그대로 붙여넣고 실행하세요.

-- 장거리 기록
create table if not exists public.long_drive_records (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone_tail text not null,
  gender text not null check (gender in ('male','female')),
  distance integer not null check (distance > 0),
  created_at timestamptz not null default now()
);

-- 기존 테이블 마이그레이션: gender 컬럼이 없다면 추가
alter table public.long_drive_records
  add column if not exists gender text check (gender in ('male','female'));

-- 부서/이전 데이터 정리: 남/여 챔피언 분리 도입에 따라 기존 기록 초기화
truncate table public.long_drive_records;

-- 이후 신규 데이터는 gender 필수
alter table public.long_drive_records
  alter column gender set not null;

create index if not exists long_drive_records_distance_idx
  on public.long_drive_records (distance desc, created_at asc);
create index if not exists long_drive_records_gender_distance_idx
  on public.long_drive_records (gender, distance desc, created_at asc);

-- RLS 활성화 (anon 키로 읽기/쓰기 허용 — 박람회 현장 임시 운영용)
-- 운영 정책에 따라 수정/삭제 권한은 제한할 수 있습니다.
alter table public.long_drive_records enable row level security;

drop policy if exists "anon read long_drive" on public.long_drive_records;
drop policy if exists "anon write long_drive" on public.long_drive_records;

create policy "anon read long_drive"
  on public.long_drive_records for select using (true);
create policy "anon write long_drive"
  on public.long_drive_records for all using (true) with check (true);

-- Realtime 활성화 (이미 등록되어 있으면 건너뜀)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'long_drive_records'
  ) then
    execute 'alter publication supabase_realtime add table public.long_drive_records';
  end if;
end $$;
