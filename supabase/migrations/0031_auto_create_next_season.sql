-- 자동연장(참여자 단위)처럼, 시즌 생성도 팀 단위로 자동화할지 고를 수
-- 있게 한다. 개인 선호(profiles.auto_renew_preference)와 달리 시즌
-- 생성은 관리자의 팀 운영 설정이라 teams에 둔다 — 이미 정산 계좌 같은
-- 팀 단위 설정이 있는 자리고, "관리자만 수정 가능" RLS가 이미 있어서
-- 새 정책 없이 그대로 재사용한다.
--
-- 기본값 true — 이 기능을 추가하는 것 자체가 "지금부터는 자동으로
-- 가자"는 요청이었고, 끄면(false) 지금까지의 수동 흐름(관리자가
-- /admin/season에서 직접 "새 시즌 만들기")으로 돌아간다.
alter table teams add column auto_create_next_season boolean not null default true;
