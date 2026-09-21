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

한동안 내용에 따라 `p-4`(폼이 든 카드), `p-6`(홈 화면 히어로 카드)처럼 조금씩 다르게 썼는데, 근거가 약해서 전부 `px-4 py-3`로 통일했다. 실제로 봤을 때 특정 카드가 답답해 보이면 그때 역할별 규칙을 새로 정할 것 — 지금은 예외 없이 이 값 하나.

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
- **Ghost**: 배경 없음, `text-primary text-sm font-medium` — 지금은 실제로 쓰는 곳이 없음. 카드 안 요약 텍스트 옆 "수정"/"변경" 같은 인라인 액션은 Ghost가 아니라 아래 소형 알약을 쓴다 (SeasonFeeForm의 "수정"이 한동안 Ghost로 혼자 떠 있었는데, 나머지 전부와 맞춰 소형 알약으로 바꿨다).
- **소형 알약 (카드 안 인라인 액션)**: `rounded-xl bg-primary px-3 py-2 font-semibold text-white` (또는 `bg-muted-strong text-ink`) — BankForm "변경", RenewalToggle "변경", SeasonFeeForm "수정", ParticipantToggle, InviteCodeCard 전부 이 크기.
- **전체 너비 제출 버튼**: `rounded-xl bg-primary px-5 py-3.5 font-semibold text-white` — 폼 맨 아래 꽉 차는 제출 버튼은 전부 `py-3.5`로 통일 (전에는 py-3.5/py-3/py-2.5가 근거 없이 섞여 있었음). `items-center`로 버튼이 내용 너비만큼만 줄어드는 경우(CertifyForm 완료 화면의 "홈으로 가기")는 꽉 찬 버튼이 아니라서 예외 — `py-3`.
- 모든 버튼 `disabled:opacity-60`으로 통일 (부분적으로 회색 처리하지 않음).

## 인풋

`src/components/Input.tsx` — 앱의 모든 텍스트 인풋이 쓰는 공통 컴포넌트. `label`을 주면 `<label>` + 라벨 `<span>` + `<input>`까지 통째로 그려주고, 안 주면 인풋만 렌더링한다(ReviewItem의 반려 사유, JoinForm/OnboardingForm처럼 라벨 없이 placeholder만 쓰는 필드).

```tsx
<Input
  type="date"
  label="시작일"
  value={startDate}
  onChange={(e) => handleStartDateChange(e.target.value)}
/>
```

- 컴포넌트 내부 `BASE`에 padding/글자 크기까지 전부 고정돼 있다: `rounded-xl border border-transparent bg-muted px-3 py-2.5 text-sm text-ink-strong placeholder:text-ink-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60` — 원티드 레퍼런스의 filled 변형이다. outlined(흰 배경 + 보더)는 카드 보더와 톤이 겹쳐 촌스러워 보인다는 피드백으로 filled로 교체했다. 보더는 `border-transparent`로 항상 자리를 잡아둬서 포커스 때 보더가 생겨도 레이아웃이 밀리지 않는다.
- **포커스 시 항상**: `focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary` — 브라우저 기본 포커스 아웃라인을 쓰지 않는다. `BASE`에 이미 포함돼 있으니 `Input`을 쓰는 한 빠뜨릴 일이 없다.
- 인풋마다 실제로 달라지는 건 정렬뿐이다 — 화면에 필드 하나만 있는 "히어로" 스타일 화면(JoinForm의 초대 코드, OnboardingForm의 실명 입력)만 `className="text-center"`로 가운데 정렬, 나머지는 기본값(왼쪽 정렬)을 그대로 쓴다. `py-3`/`text-lg`처럼 이 두 필드만 다르게 크게 썼던 적이 있었는데, `text-lg`는 인풋에 전역으로 `font-size: 16px`를 강제하는 `globals.css` 규칙 때문에 애초에 렌더링에 영향이 없는 죽은 코드였고 `py-3`도 별다른 근거 없이 남아있던 값이라 — 전부 지우고 하나로 통일했다.
- 라벨 텍스트 스타일은 기본이 `text-base text-ink-secondary`이고, 다르게 써야 하면(CertifyForm의 날짜/거리 필드는 `text-base font-medium text-ink`) `labelClassName`으로 넘긴다.

## 폼 최상위 간격

`<form className="flex flex-col gap-4">`처럼 필드들을 세로로 쌓는 폼의 최상위 컨테이너는 전부 `gap-4`. 필드 개수에 따라 `gap-3`/`gap-5`로 조금씩 다르게 쓰던 걸 통일했다 — 눈으로 봤을 때 특정 폼이 너무 빽빽하거나 헐렁해 보이면 그때 다시 조정.
- `font-size`는 16px 미만이면 iOS Safari가 자동 확대하므로, `globals.css`의 전역 규칙(`input, select, textarea { font-size: 16px; }`)이 항상 이긴다 — 개별 인풋에 `text-sm`을 줘도 실제 렌더링은 16px.
- 여러 필드가 몰려 있는 화면에서 `bg-muted`(인풋 채움)가 다른 `bg-muted` 요소(세그먼트 탭 트랙, 칩)와 바로 붙으면 구분이 안 간다 — 인풋 옆/위에 놓이는 트랙·칩 종류는 전부 한 단계 진한 `bg-muted-strong`을 쓴다 (아래 세그먼트 탭 섹션 참고).
- `src/components/Textarea.tsx` — 여러 줄 입력이 필요할 때 쓰는 filled 텍스트에어리어. `Input`과 같은 배경/보더/포커스 스타일이고, 추가로 내용에 따라 자동으로 높이가 늘어나고(`scrollHeight` 기반) `maxLength`를 주면 우측 하단에 `n/max` 카운터가 뜬다. 아직 실제로 쓰는 화면은 없음.

## 체크박스 / 라디오 / 토글

세 컴포넌트 다 네이티브 입력을 `sr-only`로 DOM에 남겨서 키보드/스크린리더 동작은 그대로 유지하고, 보이는 부분은 순수 시각 요소(`aria-hidden`)로 따로 그린다. 배경이 있는 행으로 감싸지 않고, 체크박스/버튼 컴포넌트처럼 박스(또는 트랙) + 라벨 텍스트만 인라인으로 배치한다.

- **`src/components/Checkbox.tsx`** — `border-border-strong` 사각 박스(`rounded-md`), 체크되면 `bg-primary`로 채워지고 흰 체크 아이콘이 나타난다.
  ```tsx
  <Checkbox checked={copyPrevious} onChange={setCopyPrevious}>
    자동 연장 참여자 포함
  </Checkbox>
  ```
- **`src/components/Radio.tsx`** — 원형 박스, 선택되면 보더가 `border-primary`로 바뀌고 안쪽에 `bg-primary` 점이 나타난다. 그룹 상태(어떤 옵션이 선택됐는지)는 호출부가 직접 관리 — 옵션마다 하나씩 렌더링. 아직 실제로 쓰는 화면은 없음.
- **`src/components/Toggle.tsx`** — 트랙 + 슬라이딩 손잡이 스위치. 폼 필드가 아니라 "바로 적용되는 설정"에 쓴다(별도 저장 버튼 없이 토글 즉시 반영되는 경우). `role="switch"`로 접근성 시맨틱을 맞춘다. 아직 실제로 쓰는 화면은 없음 — 마이페이지의 "자동 연장"은 두 버튼 중 하나를 고르는 `RenewalToggle`이라 이름은 비슷하지만 별개 컴포넌트/패턴.

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

## 타이포 컴포넌트 & 헤딩 체계

제목 관련 클래스를 페이지마다 직접 쓰지 않고 아래 컴포넌트로 통일한다. 시각적 크기와는 별개로, **실제 heading 태그(h1~h6)는 사이트 전체에서 일관된 체계를 따르며 대부분 자동으로 계산된다** — 화면에 로고 대신 서비스명이 없기 때문에, 접근성 트리 상으로는 항상 아래 순서를 따른다:

1. **h1 (숨김)** — "러닝 인증 챌린지". `PageShell`이 매 화면마다 `sr-only`로 한 번 렌더링. 페이지에서 직접 다루지 않는다.
2. **h2** — `PageHeader`의 팀명(`TeamEyebrow`). `PageShell`이 자동으로 처리.
3. **h3** — 현재 메뉴/페이지 이름. `<PageTitle>`(기본 크기)이 렌더링.
4. **h4 (있으면 숨김)** — 페이지 안에 세그먼트 탭이 있으면, 그 활성 탭의 라벨이 `SegmentedTabs`에 의해 `sr-only`로 자동 렌더링. 세그먼트 탭이 없는 화면에는 이 단계가 아예 없다.
5. **섹션 제목** — `<SectionTitle>`. 세그먼트 탭 없이 바로 오면 h4, 탭 아래에 있으면 h5 — **직접 레벨을 지정하지 않아도 자동으로 정해진다.**

이 자동 계산은 `HeadingLevelBoundary`/`useHeadingLevel`(`src/components/HeadingLevel.tsx`)로 만든 React Context 기반 "지금 몇 레벨인지" 추적 장치 덕분이다. `PageShell`이 `<main>`을 레벨 4로 고정해서 시작하고, `SegmentedTabs`는 패널 콘텐츠를 **children으로 받았을 때만** 그 아래를 한 단계 깊게(`HeadingLevelBoundary`, level 생략 = ambient+1) 만든다. `SectionTitle`은 내부적으로 `Heading`(`src/components/Heading.tsx`)을 통해 현재 컨텍스트 레벨을 읽어 알맞은 태그를 고른다.

- **`PageTitle`** — 페이지 타이틀. 기본(`size` 생략)은 인앱 화면에서 h3로 렌더링(`text-lg font-bold`). `size="lg"`는 로그인/온보딩/참여하기처럼 팀명·메뉴 체계가 없는 단독 화면 전용 — 거기서는 이 컴포넌트 자체가 진짜 h1이다(`text-2xl font-bold`).
- **`SectionTitle`** — 섹션 제목. 항상 위 자동 레벨 규칙을 따른다(h4 또는 h5). `size="lg"`는 크기만 키운 변형(마이페이지의 "자동 연장"/"계좌 정보").
- **`SegmentedTabs`** — 탭이 지배하는 패널 콘텐츠는 반드시 **children으로** 넘긴다(형제 요소로 따로 두지 않음) — 그래야 활성 탭의 숨김 헤딩과 레벨 자동 증가가 같이 작동한다. `StatusBoard`(이번 시즌/전체 기록), `AdminTabs`(관리자 하위 페이지를 children으로 감쌈) 참고. 패널이 children 형태로 안 맞는 경우(예: 인증하기의 지난 시즌/새 시즌 피커 — 콘텐츠가 탭 유무와 무관하게 항상 렌더링됨)엔 children 없이 써도 된다, 그 아래엔 레벨이 자동으로 깊어지지 않을 뿐.
- **`BackLink`** — "← 홈", "← 시즌 관리"처럼 반복되는 뒤로가기 링크. 헤딩과 무관.

새 화면에서 제목이 필요하면 이 컴포넌트들을 조합해서 쓰고, 직접 `<h1 className="...">`~`<h6 className="...">`나 숫자로 된 heading level을 새로 쓰지 않는다.

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
