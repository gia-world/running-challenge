# 디자인 규칙

토스 디자인 시스템(TDS)의 톤을 참고해 테일윈드 기반으로 정리한 규칙. 메인 컬러는 토스 블루 대신 오렌지를 그대로 쓰고, 나머지(라운드/타이포/그림자/포커스 상태)는 토스의 구조를 따라간다. 새 화면/컴포넌트를 만들 때 여기 규칙을 기본값으로 쓰고, 벗어날 이유가 있으면 그 이유를 남길 것.

## 색상

- **브랜드**: `orange-500` (배경), 텍스트로 쓸 땐 `text-orange-500`. 화면당 가장 중요한 액션 하나에만 쓴다.
- **브랜드 약한 배경**: `orange-50`/`orange-100` — 활성 배지, 안내 칩 등 브랜드색을 옅게 쓸 때.
- **중립(그레이스케일)**: `zinc-*` 스케일을 그대로 쓴다. 별도 커스텀 그레이 팔레트를 만들지 않음.
  - 본문 텍스트: `text-zinc-900` (라이트) / `dark:text-zinc-50`
  - 보조 텍스트: `text-zinc-500` / `dark:text-zinc-400`
  - 구조적 구분선(헤더, 하단 네비 등): `border-zinc-200` / `dark:border-zinc-800`
  - 폼 컨트롤 보더: `border-zinc-300` / `dark:border-zinc-700` (구조 구분선보다 한 단계 진하게 — 인풋이 눈에 띄어야 함)
  - 카드/섹션 배경: 라이트 `bg-white`, 다크 `dark:bg-zinc-900`
  - 페이지 배경: 라이트 `bg-zinc-50`, 다크 `dark:bg-black`
  - 인풋 배경(카드 안): `dark:bg-zinc-800` / 인풋 배경(카드 밖, 페이지 배경 위): `dark:bg-zinc-900`
- **시맨틱**: 성공 `green-500`, 위험/반려 `red-500`(배경은 `red-50`/`dark:bg-red-950`), 경고/그레이스 기간 `amber-*`. 카카오 로그인 버튼만 예외로 카카오 고유 컬러(`#FEE500`) 유지.

## 라운드 (역할별로 고정)

| 역할 | 클래스 | 예 |
|---|---|---|
| 텍스트 인풋/셀렉트 | `rounded-xl` (12px) | 날짜, 참가비, 계좌번호 입력 |
| 버튼 (크기 무관 통일) | `rounded-xl` (12px) | Primary/Secondary/작은 "변경" 버튼 전부 |
| 카드/리스트 아이템/섹션 박스 | `rounded-2xl` (16px) | 참여자 카드, 초대코드 카드, 활동 기록 카드 |
| 배지/칩/필 | `rounded-full` | "진행중" 배지, 반려 사유 칩 |
| 인라인 배너/경고 메시지 | `rounded-lg` (8px) | 그레이스 기간 안내, 에러 배너 — 카드보다 한 단계 작게 둬서 시각적으로 구분 |
| 카드 안에 중첩된 서브 블록 | `rounded-lg` (8px) | 정산 요약 박스, 초대 코드 표시 박스 — 바깥 카드(`rounded-2xl`)보다 항상 작게 |
| 빈 상태/드롭존 플레이스홀더 | `rounded-2xl` | 인증샷 드롭존, `EmptyState` |

원칙: **중첩된 사각형은 바깥쪽보다 라운드가 작거나 같아야 한다.** 새 컴포넌트를 만들 때 이 표에서 가장 가까운 역할을 찾아 그대로 쓰고, 없는 역할이면 카드=16px, 그 안=8px 기준으로 판단.

## 버튼

- **Primary**: `bg-orange-500 text-white font-semibold`, 화면당 하나만.
- **Secondary**: `bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300`.
- **Danger**: `bg-red-500 text-white` — 반려 확정처럼 되돌리기 어려운 액션만.
- **Ghost**: 배경 없음, `text-orange-500 text-sm font-medium` — "수정", "변경" 같은 가벼운 인라인 액션.
- 모든 버튼 `disabled:opacity-60`으로 통일 (부분적으로 회색 처리하지 않음).

## 인풋

- 기본: `rounded-xl border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700`
- **포커스 시 항상**: `focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500` — 브라우저 기본 포커스 아웃라인을 쓰지 않는다. 새 인풋을 추가할 때 절대 빠뜨리지 말 것.
- `font-size`는 16px 미만이면 iOS Safari가 자동 확대하므로, `globals.css`의 전역 규칙(`input, select, textarea { font-size: 16px; }`)이 항상 이긴다 — 개별 인풋에 `text-sm`을 줘도 실제 렌더링은 16px.

## 그림자

- `shadow-sm` 하나로 통일 — 카드가 배경에서 살짜기 뜬 정도만 표현. 토스도 그림자를 짙게 쓰지 않으므로 새로 단계를 늘리지 않는다.
- 예외: 바텀시트(`BottomSheet`)만 `shadow-lg` — 화면을 덮는 오버레이라 카드보다 한 단계 강한 그림자가 필요.

## 타이포그래피

- 본문 기본은 `text-base`(16px). `text-sm`(14px)은 진짜 보조/메타 정보(타임스탬프, 라벨, 헬퍼 텍스트)에만. `text-xs`는 앱 전체에서 사용하지 않음(이미 적용된 규칙).
- 제목: 페이지 타이틀 `text-lg font-bold`, 카드/섹션 타이틀 `text-base font-semibold`.
- 폰트는 Pretendard Variable 고정 (`globals.css` `@font-face`).

## 바텀시트

- 새로운 정보 입력/확인이 "지금 이 화면에서 필요해진 순간"에만 쓴다 (계좌 등록, 자동연장 응답처럼). 마이페이지 같은 별도 설정 화면을 만들어 몰아두지 않는다.
- 배경 딤 `bg-black/40` + 카드 `rounded-t-2xl bg-white dark:bg-zinc-900 shadow-lg`, 하단에서 슬라이드업(`animate-sheet-up`, `globals.css`).
- 필수 입력(계좌 등록처럼 정산에 꼭 필요한 값)은 "나중에"로 닫아도 값이 채워지기 전까지 다음 방문마다 다시 뜨게 한다 —로컬스토리지 등으로 영구 스킵시키지 않는다.

## 공통 컴포넌트로 뽑는 기준

- 두 군데 이상에서 같은 입력 필드/버튼 조합이 반복되면 즉시 `src/components/`로 분리한다 (예: `SeasonFeeFields`, `BankForm`, `RenewalToggle`).
- 조회(값 있음)/입력(값 없음 또는 수정 중) 두 모드가 있는 데이터는 한 컴포넌트 안에서 `isEditing` 상태로 분기한다 — 별도 컴포넌트로 쪼개지 않는다. 조회 모드는 값 한 줄 + "변경" 버튼, 입력 모드는 폼 전체를 보여주고 저장 성공 시 조회 모드로 자동 전환 (저장 확인 문구를 따로 안 둬도 모드 전환 자체가 확인 역할을 함).
