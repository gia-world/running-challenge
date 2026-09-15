# 러닝 크루 인증 자동 집계 앱

러닝 크루원이 주 3회 5km 러닝 인증샷을 올리면, 자동으로 주간 달성 여부를 보여주는 웹앱 (v0).

기획: [Notion 문서](https://app.notion.com/p/3dc951929c67819d8032e84d2410c60d)

## v0 진행 상황

- [x] 카카오 소셜 로그인 (Supabase Auth)
- [x] 홈 — 이번 주 인증 현황 (●●○)
- [x] 피드 — 크루원 인증 타임라인
- [x] 인증 — 인증샷 수동 업로드
- [ ] 관리자 — 심사 대기함 / 크루원 관리

## 스택

- **Next.js** (App Router) + TypeScript + Tailwind CSS
- **Supabase**: Auth(카카오 OAuth), Postgres, Storage(인증샷)

## 시작하기

### 1. Supabase 프로젝트 준비

1. [supabase.com](https://supabase.com) 에서 프로젝트 생성
2. `supabase/migrations/0001_init.sql`, `0002_storage.sql` 을 순서대로 SQL Editor에서 실행
   (profiles / activities 테이블 + RLS 정책, 인증샷용 private Storage 버킷 생성)
3. [developers.kakao.com](https://developers.kakao.com) 에서 앱 등록 후 REST API 키 발급
4. Supabase Dashboard → Authentication → Providers → Kakao 활성화, REST API 키(Client ID)와 Client Secret 입력
5. Kakao 개발자 콘솔의 Redirect URI에 `https://<your-project>.supabase.co/auth/v1/callback` 등록

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

[http://localhost:3000](http://localhost:3000) 접속 시 로그인 상태가 아니면 `/login` 으로,
로그인 상태면 `/home` (이번 주 인증 현황)으로 이동합니다.

## 인증 규칙 (v0)

- 주 시작 요일: 월요일 (Asia/Seoul 기준)
- 판정 기준: 5km 이상, 하루 최대 1회 인증 (불인정 시 재제출 가능)
- 자동 연동(스트라바 등) 없이 수동 업로드 + 관리자 인정/불인정 심사로 시작
