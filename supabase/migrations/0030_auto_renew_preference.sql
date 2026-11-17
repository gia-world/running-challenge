-- 시즌마다 자동연장 여부를 묻지 않고 계속 참여하길 원하는 사람을 위한
-- 스탠딩 설정. team_memberships가 아니라 profiles에 둔 건 — profiles는
-- 이미 "본인 행만 자유롭게 수정 가능" RLS가 있어서(계좌 정보 등) 새
-- 정책이나 security definer 함수 없이 그대로 재사용할 수 있기 때문.
-- team_memberships는 role 같은 민감한 컬럼이 같이 있어서 본인 수정을
-- 열어주기 애매하다.
alter table profiles add column auto_renew_preference boolean not null default false;
