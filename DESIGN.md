# 디자인 규칙

원티드(Wanted) 디자인 시스템의 톤 — 흰 캔버스 위에 헤어라인 보더로 구조를 만들고, 그림자는 진짜 떠 있는 요소에만 쓴다 — 을 참고해 테일윈드 기반으로 정리한 규칙. 메인 컬러는 오렌지를 그대로 쓰고 `primary` 디자인 토큰으로 등록했다. 다크 모드는 없음 — 항상 흰 캔버스 하나만 지원한다. 새 화면/컴포넌트를 만들 때 여기 규칙을 기본값으로 쓰고, 벗어날 이유가 있으면 그 이유를 남길 것.

## 색상 토큰 (`globals.css`의 `@theme`)

색을 쓸 때는 항상 아래 토큰으로 — `zinc-500`, `orange-500` 같은 테일윈드 원색 클래스를 직접 쓰지 않는다. 토큰은 전부 `src/app/globals.css`의 `@theme` 블록에 정의돼 있다.

- **브랜드 (`primary`)**: `bg-primary`/`text-primary` (오렌지 500). 옅은 배경은 `bg-primary-50`/`bg-primary-100`, hover/강조 텍스트는 `text-primary-600`, 보더 강조는 `border-primary`/`border-primary-400`. 화면당 가장 중요한 액션 하나에만 채움(solid)으로 쓴다.
- **텍스트 (`ink` 스케일, 5단계)**:
  - `text-ink-strong` — 페이지/카드 타이틀, 가장 강한 강조
  - `text-ink` — 본문 텍스트 기본값
  - `text-ink-secondary` — 보조 설명, 메타 정보
  - `text-ink-tertiary` — 플레이스홀더, 타임스탬프처럼 가장 약한 텍스트
  - `text-ink-disabled` — 비활성 상태 텍스트
- **표면 (surface)**:
  - `bg-canvas` — 페이지 배경 (흰색)
  - `bg-surface` — 카드/리스트 아이템 배경 (흰색 — canvas와 같은 색이지만 의미가 다름. 카드는 배경색이 아니라 **보더로** canvas와 구분한다)
  - `bg-subtle` — 카드 안에 중첩된 옅은 블록(정산 요약 박스 등)
  - `bg-muted` / `bg-muted-strong` — 세그먼트 트랙, 비활성 인풋, 보조 버튼 배경처럼 톤을 낮춘 채움이 필요할 때 (muted-strong이 한 단계 더 진함)
  - `bg-inverse` — 검정 계열 강조 버튼(정산완료의 "그래도 진행" 단계처럼 되돌리기 무거운 액션)
- **보더 (border)**: `border-border-subtle` (헤어라인, 가장 옅음) / `border-border` (카드 기본 보더) / `border-border-strong` (폼 인풋 — 카드보다 한 단계 진하게, 눈에 띄어야 함)
- **시맨틱**: 성공 `text-success`/`bg-success-subtle`, 위험/반려 `text-danger`/`bg-danger`/`bg-danger-subtle`, 경고/그레이스 기간 `text-warning`/`bg-warning-subtle`. 카카오 로그인 버튼만 예외로 카카오 고유 컬러(`#FEE500`) 유지.

## 카드 = 헤어라인 보더, 그림자 없음

캔버스와 카드가 둘 다 흰색이므로(`bg-canvas` == `bg-surface`), 카드는 그림자가 아니라 **보더로 구분**한다.

```
rounded-2xl border border-border bg-surface px-4 py-3
```

`shadow-sm`으로 카드를 띄우던 이전 방식은 쓰지 않는다 — 그림자는 진짜로 화면 위에 떠 있는 요소(바텀시트, 포토 모달)에만 남겨둔다.

## 라운드 (역할별로 고정)

| 역할 | 클래스 | 예 |
|---|---|---|
| 텍스트 인풋/셀렉트 | `rounded-xl` (12px) | 날짜, 참가비, 계좌번호 입력 |
| 버튼 (크기 무관 통일) | `rounded-xl` (12px) | Primary/Secondary/작은 "변경" 버튼 전부 |
| 카드/리스트 아이템/섹션 박스 | `rounded-2xl` (16px) | 참여자 카드, 초대코드 카드, 활동 기록 카드 |
| 세그먼트 탭 트랙 / 트랙 안 알약 | `rounded-xl` 트랙 / `rounded-lg` 안쪽 버튼 | "이번 시즌"·"전체 기록" 탭 |
| 배지/칩/필 | `rounded-full` | "진행중" 배지, 반려 사유 칩 |
| 인라인 배너/경고 메시지 | `rounded-lg` (8px) | 그레이스 기간 안내, 에러 배너 — 카드보다 한 단계 작게 둬서 시각적으로 구분 |
| 카드 안에 중첩된 서브 블록 | `rounded-lg` (8px) | 정산 요약 박스, 초대 코드 표시 박스 — 바깥 카드(`rounded-2xl`)보다 항상 작게 |
| 빈 상태/드롭존 플레이스홀더 | `rounded-2xl` | 인증샷 드롭존, `EmptyState` |

원칙: **중첩된 사각형은 바깥쪽보다 라운드가 작거나 같아야 한다.** 새 컴포넌트를 만들 때 이 표에서 가장 가까운 역할을 찾아 그대로 쓰고, 없는 역할이면 카드=16px, 그 안=8px 기준으로 판단.

## 버튼

- **Primary**: `bg-primary text-white font-semibold`, 화면당 하나만.
- **Secondary**: `bg-muted-strong text-ink`.
- **Inverse (강한 확인/2단계 액션)**: `bg-inverse text-white` — 정산완료의 "그래도 진행" 버튼처럼, 색은 danger가 아니지만 되돌리기 무거운 액션.
- **Danger**: `bg-danger text-white` — 반려 확정처럼 진짜 파괴적인 액션만.
- **Ghost**: 배경 없음, `text-primary text-sm font-medium` — "수정", "변경" 같은 가벼운 인라인 액션.
- 모든 버튼 `disabled:opacity-60`으로 통일 (부분적으로 회색 처리하지 않음).

## 인풋

- 기본: `rounded-xl border border-border-strong px-3 py-2 text-sm`
- **포커스 시 항상**: `focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary` — 브라우저 기본 포커스 아웃라인을 쓰지 않는다. 새 인풋을 추가할 때 절대 빠뜨리지 말 것.
- `font-size`는 16px 미만이면 iOS Safari가 자동 확대하므로, `globals.css`의 전역 규칙(`input, select, textarea { font-size: 16px; }`)이 항상 이긴다 — 개별 인풋에 `text-sm`을 줘도 실제 렌더링은 16px.

## 세그먼트 탭 (뷰 전환·페이지 이동 공통)

상호배타적인 옵션 중 하나를 고르는 화면(같은 페이지 안 뷰 전환이든, 다른 라우트로 이동하는 nav든)은 전부 `src/components/SegmentedTabs.tsx`를 쓴다 — 현황판의 "이번 시즌"/"전체 기록", 인증하기의 "지난 시즌"/"새 시즌", 관리자 메뉴("재인증 요청함"/"팀원 관리"/"시즌 관리")까지 전부 이 컴포넌트 하나로 통일.

```tsx
<SegmentedTabs
  items={[
    { key: "season", label: "이번 시즌", isActive: view === "season", onClick: () => setView("season") },
    { key: "history", label: "전체 기록", isActive: view === "history", onClick: () => setView("history") },
  ]}
/>
```

`onClick`을 주면 버튼(같은 페이지 안 뷰 전환), `href`를 주면 `Link`(다른 라우트로 이동)로 렌더링 — 항목별로 섞어 써도 된다. 트랙은 `bg-muted`, 선택된 옵션만 `bg-surface` + `shadow-sm`로 알약처럼 떠 보이게 한다. 새로운 탭/세그먼트 UI가 필요하면 직접 마크업을 짜지 말고 이 컴포넌트에 항목을 추가하는 식으로 확장한다.

## 페이지 레이아웃

바텀 네비가 있는 모든 화면(홈/인증하기/피드/현황판/시즌 전체 기록/마이페이지/관리자)은 헤더+메인+바텀네비 뼈대를 직접 짜지 않고 `src/components/PageShell.tsx`를 쓴다:

```tsx
<PageShell
  teamName={viewer.teamName}
  header={<PageTitle>피드</PageTitle>}
  bottomNav={{ active: "feed", isAdmin: viewer.teamRole === "admin" }}
>
  {/* 페이지 본문 */}
</PageShell>
```

- `header`는 `PageHeader`의 children 슬롯 그대로 — 보통 `<PageTitle>`, 뒤로가기가 있는 화면은 `<BackLink>` + `<PageTitle className="mt-1">` 조합(`시즌 전체 기록`, 시즌 상세 페이지 참고), 로딩 화면은 스켈레톤 placeholder.
- `bottomNav`를 생략하면(마이페이지처럼) 바텀 네비 없이, `pb-20` 없이 렌더링된다.
- `main`의 기본 클래스는 `gap-4 py-6`(피드/현황판/인증하기/관리자와 동일) — 다른 간격이 필요하면(홈의 `gap-8 py-10`, 마이페이지/시즌 전체 기록의 `gap-6`) `mainClassName`으로 넘긴다.
- 로그인/온보딩/참여하기처럼 헤더·바텀네비가 아예 없는 가운데 정렬 화면은 대신 `CenteredPage`를 쓴다.

## 타이포 컴포넌트

h1/h2를 페이지마다 직접 `className`으로 반복하지 않고 아래 두 컴포넌트로 통일한다:

- **`PageTitle`** — 페이지 타이틀(h1). 기본(`size` 생략)은 인앱 화면의 `text-lg font-bold`, `size="lg"`는 로그인/온보딩/참여하기 같은 단독 화면의 `text-2xl font-bold`.
- **`SectionTitle`** — 섹션 타이틀(h2). 기본은 리스트/섹션 라벨의 `text-base font-semibold`, `size="lg"`는 마이페이지의 "자동 연장"/"계좌 정보"처럼 하나의 화면 같은 비중을 가진 섹션의 `text-lg font-bold`.
- **`BackLink`** — "← 홈", "← 시즌 관리"처럼 반복되는 뒤로가기 링크.

새 화면에서 제목이 필요하면 이 세 컴포넌트를 조합해서 쓰고, 직접 `<h1 className="...">`/`<h2 className="...">`를 새로 쓰지 않는다.

## 그림자

- 카드에는 그림자를 쓰지 않는다 (위 "카드" 항목 참고) — `shadow-sm`은 세그먼트 탭의 선택된 알약, 작은 원형 배지처럼 카드가 아닌 요소에만 남아 있다.
- 진짜로 화면 위에 떠 있는 요소만 `shadow-lg`: 바텀시트(`BottomSheet`), 포토 뷰어 모달.

## 타이포그래피

- 본문 기본은 `text-base`(16px). `text-sm`(14px)은 진짜 보조/메타 정보(타임스탬프, 라벨, 헬퍼 텍스트)에만. `text-xs`는 앱 전체에서 사용하지 않음(이미 적용된 규칙).
- 제목: 페이지 타이틀 `text-lg font-bold`, 카드/섹션 타이틀 `text-base font-semibold`.
- 폰트는 Pretendard Variable 고정 (`globals.css` `@font-face`).

## 바텀시트

- 새로운 정보 입력/확인이 "지금 이 화면에서 필요해진 순간"에만 쓴다 (계좌 등록, 자동연장 응답처럼). 마이페이지 같은 별도 설정 화면을 만들어 몰아두지 않는다.
- 배경 딤 `bg-black/40` + 카드 `rounded-t-2xl bg-surface shadow-lg`, 하단에서 슬라이드업(`animate-sheet-up`, `globals.css`).
- 필수 입력(계좌 등록처럼 정산에 꼭 필요한 값)은 "나중에"로 닫아도 값이 채워지기 전까지 다음 방문마다 다시 뜨게 한다 — 로컬스토리지 등으로 영구 스킵시키지 않는다.

## 공통 컴포넌트로 뽑는 기준

- 두 군데 이상에서 같은 입력 필드/버튼 조합이 반복되면 즉시 `src/components/`로 분리한다 (예: `SeasonFeeFields`, `BankForm`, `RenewalToggle`).
- 조회(값 있음)/입력(값 없음 또는 수정 중) 두 모드가 있는 데이터는 한 컴포넌트 안에서 `isEditing` 상태로 분기한다 — 별도 컴포넌트로 쪼개지 않는다. 조회 모드는 값 한 줄 + "변경" 버튼, 입력 모드는 폼 전체를 보여주고 저장 성공 시 조회 모드로 자동 전환 (저장 확인 문구를 따로 안 둬도 모드 전환 자체가 확인 역할을 함).
