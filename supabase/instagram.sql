-- 공식 인스타(@o_f_f_stage) 피드 연동용 표
-- Supabase 대시보드 → SQL Editor → New query 에 붙여 넣고 Run.
-- 인스타 토큰은 이 표에만 저장한다. 정책(policy)을 하나도 만들지 않아서
-- 앱(공개 키)으로는 읽을 수 없고, 서버 함수만 읽고 고칠 수 있다.

create table if not exists public.ig_token (
  id int primary key default 1 check (id = 1),  -- 한 줄만
  token text not null,
  refreshed_at timestamptz not null default now()
);
alter table public.ig_token enable row level security;

-- 토큰 넣기: 아래 줄의 '여기에_토큰' 을 Meta 개발자 화면에서 복사한 토큰으로 바꿔서 실행.
-- (토큰은 다른 곳에 붙여 넣거나 보내지 마세요)
-- insert into public.ig_token (id, token) values (1, '여기에_토큰')
--   on conflict (id) do update set token = excluded.token, refreshed_at = now();
