# 러닝 크루 인증 자동 집계 앱

러닝 크루원이 주 3회 5km 러닝 인증샷을 올리면, 자동으로 주간 달성 여부를 보여주는 웹앱 (v0).

기획: [Notion 문서](https://app.notion.com/p/3dc951929c67819d8032e84d2410c60d)

## v0 진행 상황

- [x] 카카오 소셜 로그인 (Supabase Auth)
- [x] 최초 로그인 시 실명 확인 온보딩
- [x] 팀 참여 (초대 코드 / 초대 링크)
- [x] 홈 — 이번 주 인증 현황 (●●○) + 시즌 누적 성공 주차
- [x] 피드 — 크루원 인증 타임라인 (여러 장 업로드 시 캐러셀)
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
2. `supabase/migrations/` 아래 `0001`~`0006`을 **번호 순서대로** SQL Editor에서 실행
   - `0005_teams_and_seasons.sql`은 스키마를 크게 바꿉니다: `profiles.role`을 없애고
     `team_memberships.role`로 옮기고, `activities.photo_url`을 `activity_photos` 테이블로
     옮기고, 팀/시즌 테이블을 새로 만듭니다. 기존에 크루원·인증 데이터가 있어도 안전하게
     마이그레이션되도록 만들었어요(팀 1개 자동 시딩, 기존 활동을 임시 시즌에 배정).
   - `0006_fix_team_membership_recursion.sql`은 `0005`가 심어둔 RLS 버그 하나를 고칩니다
     (`team_memberships`를 스스로 참조하는 정책이 "infinite recursion detected in policy"
     42P17 에러를 냄 — 팀/시즌 관련 화면이 전부 이 에러로 막혀요). `0005`를 이미 실행한
     프로젝트는 꼭 `0006`도 실행해야 하고, 새로 시작하는 프로젝트도 순서대로 실행하면 됩니다.
3. [developers.kakao.com](https://developers.kakao.com) 에서 앱 등록 후 REST API 키 발급
4. Supabase Dashboard → Authentication → Providers → Kakao 활성화, REST API 키(Client ID)와 Client Secret 입력
5. Kakao 개발자 콘솔의 Redirect URI에 `https://<your-project>.supabase.co/auth/v1/callback` 등록
6. **마이그레이션 실행 후, 반드시 관리자로 새 시즌을 하나 만들어주세요** (`/admin/season`).
   `0005` 마이그레이션이 기존 인증 기록을 위해 과거 날짜 범위의 임시 시즌을 하나 만들어두긴
   하지만, 그건 오늘 날짜를 포함하지 않을 가능성이 높아서 실제로 인증을 계속하려면 새
   시즌이 필요합니다. 시즌이 없으면 홈/인증/현황판이 전부 "진행 중인 시즌이 없어요" 빈
   상태로 보여요.
7. 관리자 지정은 v0에서 UI 없이 SQL로 직접 합니다 (기획서 기준 1~2명 하드코딩):
   ```sql
   update team_memberships set role = 'admin'
   where user_id = '<카카오로 로그인한 유저의 UUID>';
   ```

### 2. 환경 변수

`.env.example` 을 `.env.local` 로 복사하고 Supabase 프로젝트의 URL/anon key를 채워주세요.

```bash
cp .env.example .env.local
```

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
- 판정 기준: 5km 이상. 하루에 여러 번 업로드는 가능하지만 집계에는 하루 1건만
  반영되고(거리 합산 없음), 이미 그날 인증이 있으면 업로드 화면에 안내가 떠요
- 불인정된 건은 수정 불가 — 새로 업로드해야 하고, 기존 건은 무효 기록으로 남습니다
- 자동 연동(스트라바 등) 없이 수동 업로드 + 관리자 인정/불인정 심사로 시작
