-- 인증 반려(본인에게)와 정산 보류(관리자에게)도 "중요 알림"으로 분류해서
-- 입장 팝업에 공지처럼 본문 그대로 뜨게 한다. 둘 다 사람이 직접 하는
-- 행동(댓글/리액션/재인증요청)이 아니라 서버 로직(API 라우트,
-- autoSettle)이 직접 만드는 알림이라 트리거가 아니라 그 코드에서 바로
-- insert한다 — 둘 다 이미 service client로 RLS를 우회하는 자리였다.
--
-- 정산 보류는 특정 activity가 아니라 시즌 단위라 activity_id가 없고,
-- 시스템이 만드는 알림이라 "누가 했는지"도 없다 — 둘 다 nullable로 푼다.
alter table notifications alter column actor_user_id drop not null;
alter table notifications alter column activity_id drop not null;

alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('comment', 'reply', 'reaction', 'review_request', 'activity_rejected', 'settlement_pending'));
