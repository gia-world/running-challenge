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

채워진(filled) 버튼은 전부 `src/components/Button.tsx`를 쓴다 — 직접 `<button className="rounded-xl bg-... px-... py-...">`를 새로 짜지 않는다. `variant`(색)와 `size`(크기/너비)를 조합해서 쓴다.

```tsx
<Button>참여하기</Button>
<Button variant="secondary">아니요, 실명을 입력할게요</Button>
<Button variant="inverse" size="auto">정산완료</Button>
<Button variant="danger" size="auto" className="flex-1">반려 확정</Button>
<Button size="pill">변경</Button>
```

**variant (색)**
- **primary** (기본값): `bg-primary text-white font-semibold` — 화면당 가장 중요한 액션 하나에만.
- **secondary**: `bg-muted-strong text-ink font-medium`.
- **inverse** (강한 확인/2단계 액션): `bg-inverse text-white` — 정산완료의 "그래도 진행" 버튼처럼, 색은 danger가 아니지만 되돌리기 무거운 액션.
- **danger**: `bg-danger text-white` — 반려 확정처럼 진짜 파괴적인 액션만.
- `disabled:opacity-60`이 모든 variant에 기본 포함 (부분적으로 회색 처리하지 않음).

**size (크기/너비)** — 무게가 줄어드는 3단 체계:
- **full** (기본값, `w-full px-5 py-3.5`): 폼 맨 아래 꽉 차는 제출 버튼.
- **auto** (`px-5 py-3`): 내용 너비만큼만 차지하는 단독 액션(CertifyForm 완료 화면의 "홈으로 가기", 정산완료). 두 개를 나란히 두는 화면(연장 여부 선택, 반려 확인)은 `className="flex-1"`을 얹어서 각각 폭을 나눠 쓴다.
- **pill** (`shrink-0 px-3 py-2`): 카드 안 요약 텍스트 옆 인라인 액션("변경"/"수정"/"참여 추가" 등). `shrink-0`이 기본 포함이라 옆에 긴 텍스트가 있어도 버튼 자체가 눌려 찌그러지지 않는다 (한동안 BankForm/RenewalToggle의 "변경"에 이게 빠져 있어서 글자가 세로로 줄바꿈되는 버그가 있었음). 옆 버튼과 폭을 나눠 써야 하면(InviteCodeCard의 "초대 링크 복사") `className="flex-1"`을 더해서 shrink-0과 flex-1을 같이 쓴다 — 절대 내용보다 좁아지진 않으면서 남는 공간은 채운다.

**컴포넌트 대상이 아닌 버튼**: 텍스트만 있고 배경이 없는 토글/링크형 버튼(로그아웃, 정렬 전환, "관리자로 지정")은 화면마다 활성/비활성 색 로직이 달라서 대상이 아니다. 카카오 로그인 버튼(고유 브랜드 컬러), 피드 리액션 피커(별도 섹션), 반려 사유 프리셋 칩도 각자 다른 모양이라 예외.

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
- 진짜로 화면 위에 떠 있는 요소만 `shadow-lg`: 바텀시트(`BottomSheet`), StatusBoard의 주차별 인증 모달(떠 있는 흰 카드, `rounded-2xl bg-surface shadow-lg`).

## 타이포그래피

- 본문 기본은 `text-base`(16px). `text-sm`(14px)은 진짜 보조/메타 정보(타임스탬프, 라벨, 헬퍼 텍스트)에만. `text-xs`는 앱 전체에서 사용하지 않음(이미 적용된 규칙).
- 제목: 페이지 타이틀 `text-lg font-bold`, 카드/섹션 타이틀 `text-base font-semibold`.
- 폰트는 Pretendard Variable 고정 (`globals.css` `@font-face`).

## 바텀시트

- 새로운 정보 입력/확인이 "지금 이 화면에서 필요해진 순간"에만 쓴다 (계좌 등록, 자동연장 응답처럼). 마이페이지 같은 별도 설정 화면을 만들어 몰아두지 않는다.
- 배경 딤 `bg-black/40` + 카드 `rounded-t-2xl bg-surface shadow-lg`, 하단에서 슬라이드업(`animate-sheet-up`, `globals.css`).
- 필수 입력(계좌 등록처럼 정산에 꼭 필요한 값)은 "나중에"로 닫아도 값이 채워지기 전까지 다음 방문마다 다시 뜨게 한다 — 로컬스토리지 등으로 영구 스킵시키지 않는다.

## 활동 상세 페이지 & 피드 카드

인증샷을 자세히 보는 화면은 **오버레이 모달이 아니라 진짜 라우트**(`src/app/activities/[activityId]/page.tsx`)다 — 처음엔 전체화면 모달로 만들었는데, 앱에 다크 모드가 없다는 원칙(맨 위 참고)과 부딪혀서 톤이 붕 떴고, 뒤로가기도 브라우저 히스토리가 아니라 JS 상태라 어색했다. "피드 카드 하나를 크게 본다"를 문자 그대로 구현 — 같은 흰 캔버스/카드 스타일을 그대로 쓰고, 사진만 크게, 리액션·재인증요청·삭제도 그대로 딸려온다. 피드/홈의 이번 주 인증 기록/시즌 전체 기록 어디서 들어와도 같은 페이지를 쓴다. StatusBoard의 주차별 모달(여러 사람·여러 활동을 한 번에 훑어보는 용도, 진짜 모달이 맞는 케이스)과는 별개.

`src/components/ActivityDetailView.tsx` — 상세 페이지의 본문. 사진 + 정보 줄 + 리액션 바 + (본인/그레이스 기간 내면) 삭제까지 전부 **하나의 카드**(`rounded-2xl border border-border bg-surface`) 안에 있다 — 사진 영역만 `bg-muted` 레터박스로 크게, 나머지는 다른 카드들과 똑같은 톤.

- 사진이 여러 장이면 가로 캐러셀 + **화살표(‹ ›) + 닷 인디케이터** — "n / N" 텍스트 카운터가 아니라 실제 스와이퍼처럼. 화살표는 `bg-white/90` 원형 버튼, 닷은 활성 `bg-primary` / 비활성 `bg-white/80 ring-1 ring-black/10`(사진 위에 얹혀도 눈에 띄게).
- 캐러셀 컨테이너는 `overflow-x-auto`와 함께 **`overflow-y-hidden`을 명시**해야 한다 — 한쪽 축만 `auto`로 주면 CSS 스펙상 반대 축도 자동으로 `auto`가 돼버려서(둘 다 명시 안 하면 브라우저가 임의로 세로 스크롤을 만들어버림), 이걸 빠뜨리면 손대지도 않은 세로 스크롤이 생긴다. 스크롤바 자체는 `no-scrollbar`(`globals.css`)로 숨긴다.
- 사진은 `object-contain`, 높이 `h-[60vh]`로 뷰포트를 최대한 채운다.
- **확대는 브라우저 기본 핀치줌을 그대로 쓴다** — `touch-action`을 막지 않고 이미지에 별도 줌 로직을 넣지 않는다. `globals.css`의 `body { touch-action: manipulation }`이 더블탭 줌만 막고 핀치줌은 그대로 허용하므로, 손가락으로 바로 확대/축소가 된다.
- **길게 눌러 저장하는 것만 막는다, 화면 캡처는 막지 않는다(못 막는다)** — 각 `<img>`에 `onContextMenu` preventDefault, `draggable={false}`, 인라인 스타일로 `WebkitTouchCallout: "none"`을 준다. 스크린샷 차단은 웹에서 애초에 불가능한 영역이라 시도하지 않는다.
- 삭제는 `canDelete` prop 하나로 노출 여부를 정한다 — 페이지(서버 컴포넌트)가 본인 활동인지 + 시즌 그레이스 기간(`isWithinCertificationGrace`)인지를 미리 계산해서 넘긴다.
- 텍스트는 전부 `text-base` 이상 — 리액션 칩/정보 줄에 `text-sm`을 썼다가 너무 작다는 피드백을 받고 전부 키웠다. `text-sm`은 정말 보조 정보(반려 사유, 타임스탬프)에만 남겨둔다.

`src/components/BackButton.tsx` — `BackLink`와 똑같이 생겼지만 고정 `href` 대신 `router.back()`을 쓴다. 활동 상세 페이지는 피드/홈/전체기록 어디서든 들어올 수 있어서 "뒤로"가 항상 같은 곳을 가리키지 않는다 — 라우터 히스토리를 그대로 따라가는 게 맞다.

`src/components/FeedCard.tsx` — 피드 목록의 접힌 카드(사진 썸네일 + 정보 줄 + 리액션 바). 사진을 탭하면 `<Link href={\`/activities/${id}\`}>`로 상세 페이지에 진짜 네비게이션한다 — 리액션 상태를 여러 곳에 복제해서 동기화를 신경 쓸 필요가 없다(상세 페이지는 독립된 라우트라 자기 데이터를 서버에서 새로 읽는다).

`src/components/ReactionBar.tsx` — 이모지 리액션 + 재인증요청 UI. `reactions`/`requested`는 호출부가 주는 controlled 값이고, 픽커 열림 상태·pending 상태처럼 일시적인 UI 상태만 내부에서 관리한다. 접힌 카드(`FeedCard`)와 상세 페이지(`ActivityDetailView`) 둘 다 이걸 쓰지만 각자 자기 상태를 갖는 독립된 인스턴스 — 다크 톤은 없다(앱 전체가 흰 캔버스 하나만 지원).

- 고정된 10종 이모지 중 여러 개를 동시에 선택할 수 있다(다중 선택, 눌렀다고 닫히지 않음).
- **두 가지 표시 모드가 절대 같이 안 보인다**: 평소엔 실제로 반응이 달린 이모지만 칩(`rounded-full border`)으로 나열되고, "+" 버튼을 누르면 이 칩 줄이 통째로 사라지고 그 자리에 10개짜리 고정 그리드가 뜬다. 칩 줄은 반응 개수에 따라 폭이 계속 바뀌는 가변 크기라, 피커가 열려 있는 동안 같이 보이게 두면 선택할 때마다 레이아웃이 흔들린다 — 그래서 열려 있을 땐 아예 숨긴다.
- **피커는 열리자마자 스스로 스크롤해서 보인다**: `scrollIntoView({ behavior: "smooth", block: "nearest" })`로 항상 뷰포트 안으로 끌어온다.
- **선택은 즉시 반영, 피커는 안 닫힘** — 하나 고르고 바로 다음 걸 고를 수 있어야 하므로, 이모지를 선택해도 피커가 자동으로 닫히지 않는다. 바깥을 탭하거나 "✕" 버튼을 눌러야 닫힌다.
- **동시 선택 잠금은 이모지별로 따로** — 하나의 이모지에 연타를 막는 pending 상태를 전체가 아니라 이모지 단위(`Set`)로 관리한다. 서로 다른 이모지는 각각 별개의 DB row라 동시에 눌러도 서로 막을 이유가 없다.
- 칩: 기본 `border border-border text-ink-secondary`, 본인이 누른 반응만 `border-primary-400 bg-primary-50 text-primary-600`로 강조.
- 피커 그리드 버튼: `bg-surface`, 본인이 누른 반응만 `ring-2 ring-primary-400 bg-primary-100`로 강조.

`src/components/FeedPhotoThumbnail.tsx` — 피드 카드의 1:1 정사각형 썸네일. 순수 프레젠테이션 컴포넌트(상태·이벤트 핸들러 없음) — `FeedCard`가 `<Link>`로 감싼다.

- 사진 1장은 꽉 채운 정사각형, 2장은 좌우 반반, 3장은 왼쪽 큰 사각형 + 오른쪽 위아래 2장, 4장 이상은 2x2 그리드 — 5장째부터는 마지막 칸에 반투명 오버레이로 `+N` 표시.

`ActivityStatusList`(홈/전체기록의 인증 기록 목록)도 각 항목이 같은 `/activities/[id]`로 링크한다 — 목록 자체는 사진이나 리액션 데이터를 들고 있지 않고, 상세 페이지가 독립적으로 다시 읽는다.

## 공통 컴포넌트로 뽑는 기준

- 두 군데 이상에서 같은 입력 필드/버튼 조합이 반복되면 즉시 `src/components/`로 분리한다 (예: `SeasonFeeFields`, `BankForm`, `RenewalToggle`).
- 조회(값 있음)/입력(값 없음 또는 수정 중) 두 모드가 있는 데이터는 한 컴포넌트 안에서 `isEditing` 상태로 분기한다 — 별도 컴포넌트로 쪼개지 않는다. 조회 모드는 값 한 줄 + "변경" 버튼, 입력 모드는 폼 전체를 보여주고 저장 성공 시 조회 모드로 자동 전환 (저장 확인 문구를 따로 안 둬도 모드 전환 자체가 확인 역할을 함).
