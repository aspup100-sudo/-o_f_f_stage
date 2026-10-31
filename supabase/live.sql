-- OFFSTAGE 정식판 서버 설정 (한 번만 실행)
-- Supabase 대시보드 → SQL Editor → New query 에 통째로 붙여 넣고 Run.
-- 데모가 쓰는 records 표는 건드리지 않는다. 정식판은 live_records 표와 photos 저장소를 따로 쓴다.

-- 1) 데이터 표
create table if not exists public.live_records (
  collection text not null,                      -- brands, teams, messages 같은 데이터 종류
  id text not null,                              -- 종류 안에서의 고유 키
  data jsonb not null,                           -- 문서 내용
  owner uuid not null default auth.uid(),        -- 처음 만든 사람
  readers text[],                                -- 비어 있으면 로그인한 모두, 있으면 이 사람들만 읽기 (채팅·알림)
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
create index if not exists live_records_collection_idx on public.live_records (collection);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists live_records_touch on public.live_records;
create trigger live_records_touch before update on public.live_records for each row execute function public.touch_updated_at();

-- 만든 사람은 바뀌지 않게
create or replace function public.keep_owner() returns trigger language plpgsql as $$
begin new.owner = old.owner; return new; end $$;
drop trigger if exists live_records_keep_owner on public.live_records;
create trigger live_records_keep_owner before update on public.live_records for each row execute function public.keep_owner();

-- 2) 권한: 로그인한 사람만 읽고 쓴다
alter table public.live_records enable row level security;
drop policy if exists "live read" on public.live_records;
drop policy if exists "live insert" on public.live_records;
drop policy if exists "live update" on public.live_records;
drop policy if exists "live delete" on public.live_records;

-- 읽기: 로그인한 사람. 채팅·알림은 당사자만
create policy "live read" on public.live_records for select to authenticated
  using (readers is null or auth.uid()::text = any(readers) or owner = auth.uid());

-- 새로 만들기: 로그인한 사람 (만든 사람으로 기록). 사용자 문서는 본인 것만
create policy "live insert" on public.live_records for insert to authenticated
  with check (owner = auth.uid() and (collection <> 'users' or id = auth.uid()::text));

-- 고치기: 함께 쓰는 문서(팀, 모집, 채팅방 등)는 로그인한 사람이 고칠 수 있다.
-- 사용자 문서는 본인만, 비공개 문서는 당사자만
create policy "live update" on public.live_records for update to authenticated
  using ((collection <> 'users' or id = auth.uid()::text) and (readers is null or auth.uid()::text = any(readers) or owner = auth.uid()))
  with check (collection <> 'users' or id = auth.uid()::text);

-- 지우기: 만든 사람만
create policy "live delete" on public.live_records for delete to authenticated
  using (owner = auth.uid());

-- 3) 실시간 반영
do $$ begin
  alter publication supabase_realtime add table public.live_records;
exception when duplicate_object then null; end $$;

-- 4) 사진 저장소 (공개 읽기, 본인 폴더에만 올리기)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "photos upload own" on storage.objects;
drop policy if exists "photos delete own" on storage.objects;
create policy "photos upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
