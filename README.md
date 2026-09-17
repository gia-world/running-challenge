# 러닝 크루 인증 자동 집계 앱

러닝 팀원이 주 3회 5km 러닝 인증샷을 올리면, 자동으로 주간 달성 여부를 보여주는 웹앱 (v0).

기획: [Notion 문서](https://app.notion.com/p/3dc951929c67819d8032e84d2410c60d)

## v0 진행 상황

- [x] 카카오 소셜 로그인 (Supabase Auth)
- [x] 최초 로그인 시 실명 확인 온보딩
- [x] 팀 참여 (초대 코드 / 초대 링크)
- [x] 홈 — 이번 주 인증 현황 (●●○) + 시즌 누적 성공 주차
- [x] 피드 — 팀원 인증 타임라인 (여러 장 업로드 시 캐러셀)
- [x] 인증 — 인증샷 수동 업로드 (여러 장 가능)
- [x] 현황판 — 시즌 참여자 그리드 (주차별 달성, 셀 클릭 시 해당 주 사진 보기)
- [x] 관리자 — 심사 대기 / 팀원 관리(관리자 지정·초대 코드) / 시즌 관리 / 시즌 참여자 관리

## 스택

- **Next.js** (App Router) + TypeScript + Tailwind CSS
- **Supabase**: Auth(카카오 OAuth), Postgres, Storage(인증샷)

## 데이터 모델

`Team` 1개당 여러 `Season`(4주)을 가지고, `TeamMembership`(User×Team, role)과
`SeasonMembership`(User×Season)으로 소속을 나눕니다. v0은 팀을 1개만 시딩해서 쓰지만,
데이터 모델 자체는 멀티 팀을 이미 지원합니다. 인증(`Activity`)은 여러 장의 사진을
`activity_photos` 자식 테이블로 가집니다.

## 시작하기

### 1. Supabase 프로젝트 준비

1. [supabase.com](https://supabase.com) 에서 프로젝트 생성
2. `supabase/migrations/` 아래 `0001`~`0013`을 **번호 순서대로** SQL Editor에서 실행
   - `0005_teams_and_seasons.sql`은 스키마를 크게 바꿉니다: `profiles.role`을 없애고
     `team_memberships.role`로 옮기고, `activities.photo_url`을 `activity_photos` 테이블로
     옮기고, 팀/시즌 테이블을 새로 만듭니다. 기존에 팀원·인증 데이터가 있어도 안전하게
     마이그레이션되도록 만들었어요(팀 1개 자동 시딩, 기존 활동을 임시 시즌에 배정).
   - `0006_fix_team_membership_recursion.sql`은 `0005`가 심어둔 RLS 버그 하나를 고칩니다
     (`team_memberships`를 스스로 참조하는 정책이 "infinite recursion detected in policy"
     42P17 에러를 냄 — 팀/시즌 관련 화면이 전부 이 에러로 막혀요). `0005`를 이미 실행한
     프로젝트는 꼭 `0006`도 실행해야 하고, 새로 시작하는 프로젝트도 순서대로 실행하면 됩니다.
   - `0007_restore_one_per_day.sql`은 하루 1건 제한을 다시 DB 제약으로 되살립니다
     (`0005`가 잠깐 풀어놨던 것). 같은 날짜에 반려 아닌 건이 이미 있으면 새로 못 넣도록
     unique index를 만들고, 실행 전에 이미 같은 날 중복 건이 있으면 가장 먼저 올라온
     건만 남기고 나머지는 자동으로 반려 처리합니다(기록은 남되 무효 처리).
   - `0008_rename_crew_role_to_user.sql`은 용어 정리용입니다: `user_role` enum의
     `crew` 값을 `user`로 바꿉니다(코드/화면 문구가 "크루원"/"팀원"으로 섞여 있던 걸
     정리하면서 역할 값도 `admin`/`user`로 통일). `ALTER TYPE ... RENAME VALUE`라서
     기존 데이터는 자동으로 반영되고 별도 백필은 필요 없어요.
   - `0009_get_team_name_by_invite_code.sql`은 `get_team_name_by_invite_code(code)`
     함수를 추가합니다. 로그인 전(`/login?code=...`)이나 아직 팀에 안 들어간 상태
     (`/join?code=...`)에서도 초대 코드가 가리키는 팀 이름을 보여줄 수 있도록,
     `join_team_by_invite_code`와 같은 이유(초대 코드 컬럼에 넓은 SELECT 정책을
     안 열어주기 위해)로 `security definer`로 만들었고, `anon`/`authenticated`
     둘 다 실행 권한을 줬어요. 팀 이름 외에는 아무것도 노출하지 않고, 잘못된 코드는
     에러 없이 `null`을 반환합니다.
   - `0010_review_requests.sql`은 심사 방식 변경의 스키마 쪽입니다. 업로드는 이제
     앱 코드에서 바로 `status: 'approved'`로 들어가고(스키마 변경 없음), 대신
     팀원이 이미 승인된 인증에 재인증을 요청할 수 있도록 `activity_review_requests`
     테이블을 새로 만들었어요. 본인 활동은 요청 불가, 한 사람당 같은 활동에
     대기중인 요청은 1개까지(해결되면 다시 요청 가능), 요청 취소는 본인만,
     승인 유지/반려 처리(요청의 `status`를 `resolved`로 바꾸는 것)는 팀 관리자만
     가능하도록 RLS를 걸었습니다. 실제 인정/반려는 기존 `activities.status` /
     `rejected_reason` 흐름을 그대로 씁니다.
   - `0011_activity_likes.sql`은 피드 열람을 유도하기 위한 좋아요 기능입니다.
     `activity_likes` 테이블 하나만 추가하고 주간 집계나 재인증 요청 로직과는
     무관합니다. 같은 팀원끼리만 보고 누를 수 있고, 좋아요 취소는 본인만
     가능합니다. (`0012`에서 이모지 반응으로 대체되면서 제거됩니다.)
   - `0012_activity_reactions.sql`은 `0011`의 단일 좋아요를 다중 이모지 반응으로
     확장합니다. `activity_reactions` 테이블(Activity × User × emoji, 이모지는
     `❤️👍🔥💪🎉👏🎶😢🤣🫢` 10종 고정)을 새로 만들고, 기존 `activity_likes`
     데이터를 `❤️` 반응으로 그대로 이관한 뒤 `activity_likes` 테이블은 삭제합니다.
     한 사람이 한 활동에 여러 종류의 이모지를 동시에 남길 수 있고, 같은 이모지를
     중복으로 남기는 것만 unique 제약으로 막습니다.
   - `0013_kakao_tokens.sql`은 카카오톡 알림 발송용입니다. 로그인 성공 후
     `/auth/kakao-consent`에서 `talk_message` scope를 별도로 요청해서(카카오가
     이 항목을 "이용 중 동의"로 분류해서, 로그인 시 scope 목록에 같이 넣는
     것만으로는 동의 화면 자체가 안 뜸 — 반드시 단독으로 요청해야 함), 동의한
     사람의 카카오 refresh token을 `kakao_tokens`에 저장합니다(재인증 요청
     발생 시 관리자에게, 반려 처리 시 본인에게 "나에게 보내기"로 알림을 보내는
     데 씁니다). 본인 것만 select/insert/update 가능하고, 다른 사람 토큰을
     읽는 건 서버 쪽 service_role
     코드(`src/app/api/notify/*`)만 할 수 있어요.
3. [developers.kakao.com](https://developers.kakao.com) 에서 앱 등록 후 REST API 키 발급
4. Supabase Dashboard → Authentication → Providers → Kakao 활성화, REST API 키(Client ID)와 Client Secret 입력
5. Kakao 개발자 콘솔의 Redirect URI에 `https://<your-project>.supabase.co/auth/v1/callback` 등록
6. Kakao 개발자 콘솔에서 "카카오톡 메시지 전송"(`talk_message`) 동의항목을 "이용 중 동의"로
   활성화 (카카오톡 알림 기능에 필요 — 안 켜져 있으면 그 동의 항목 없이도 로그인 자체는 되지만
   알림은 안 감)
7. **마이그레이션 실행 후, 반드시 관리자로 새 시즌을 하나 만들어주세요** (`/admin/season`).
   `0005` 마이그레이션이 기존 인증 기록을 위해 과거 날짜 범위의 임시 시즌을 하나 만들어두긴
   하지만, 그건 오늘 날짜를 포함하지 않을 가능성이 높아서 실제로 인증을 계속하려면 새
   시즌이 필요합니다. 시즌이 없으면 홈/인증/현황판이 전부 "진행 중인 시즌이 없어요" 빈
   상태로 보여요.
8. 관리자 지정은 v0에서 UI 없이 SQL로 직접 합니다 (기획서 기준 1~2명 하드코딩):
   ```sql
   update team_memberships set role = 'admin'
   where user_id = '<카카오로 로그인한 유저의 UUID>';
   ```

### 2. 환경 변수

`.env.example` 을 `.env.local` 로 복사하고 값을 채워주세요.

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 프로젝트 URL/anon key
- `SUPABASE_SERVICE_ROLE_KEY` / `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` / `NEXT_PUBLIC_APP_URL`:
  카카오톡 알림 발송(`src/app/api/notify/*`)에 필요. 배포 환경(Vercel 등)에도 같은 이름으로
  설정해야 알림이 실제로 나갑니다 — 안 설정해도 로그인/인증 등 나머지 기능은 그대로 동작해요.

### 3. 개발 서버 실행

```bash
npm install
npm run dev
```

## 로그인 후 진입 흐름

로그인 → (실명 미확인 시) `/onboarding` → (팀 미가입 시) `/join` (초대 코드 또는
`?code=` 붙은 링크) → `/home`. 팀에는 속해 있지만 오늘 날짜가 속한 시즌에 참여 중이
아니면, 홈/인증/현황판은 빈 상태 화면과 "관리자에게 참여를 요청하세요" 안내만 보여줍니다.

## 인증 규칙 (v0)

- 주 시작 요일: 월요일 (Asia/Seoul 기준), 시즌은 시작일부터 4주(28일)
- 판정 기준: 5km 이상. **하루에 인증은 최대 1건**까지만 가능 — 이미 그날 인증(심사중
  포함)이 있으면 업로드 자체가 막히고 "오늘은 이미 인증하셨어요" 안내가 떠요(DB에도
  unique index로 강제되어 있어요)
- 주 3회를 넘어서, 그 주 안에서 아직 인증 안 한 다른 날짜에 추가로 인증하는 건 계속
  가능해요. 초과분도 집계에 그대로 반영되지만(현황판은 "3회 이상 달성 여부"만 표시하므로
  초과 횟수를 따로 다르게 처리할 필요는 없음), v0에는 랭킹이 없어서 별도로 쓰이진 않아요
- 불인정된 건은 수정 불가 — 새로 업로드해야 하고, 기존 건은 무효 기록으로 남습니다
- 자동 연동(스트라바 등) 없이 수동 업로드 + 관리자 인정/불인정 심사로 시작
