-- OFFSTAGE 1단계 서버 테이블
-- Supabase 대시보드 → SQL Editor → New query 에 통째로 붙여 넣고 Run 을 누르세요.

create table if not exists public.records (
  collection text not null,              -- brands, teams, reviews 같은 데이터 종류
  id text not null,                      -- 종류 안에서의 고유 키
  data jsonb not null,                   -- 문서 내용
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

create index if not exists records_collection_idx on public.records (collection);

-- 고칠 때마다 수정 시각 갱신
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists records_touch on public.records;
create trigger records_touch before update on public.records for each row execute function public.touch_updated_at();

-- 1단계(프로토타입): 로그인 없이 앱 공개 키로 읽고 쓴다.
-- 실제 출시 전에는 로그인 사용자별 권한으로 바꿔야 한다.
alter table public.records enable row level security;
drop policy if exists "prototype read" on public.records;
drop policy if exists "prototype write" on public.records;
create policy "prototype read" on public.records for select using (true);
create policy "prototype write" on public.records for all using (true) with check (true);

-- 다른 사람이 바꾼 내용을 실시간으로 받기
alter publication supabase_realtime add table public.records;
