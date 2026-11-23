import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { autoSettleTeamSeasons } from "@/lib/autoSettle";
import { autoFillRenewalPreferences } from "@/lib/autoRenewalFill";

/**
 * Vercel Cron 전용 엔드포인트(vercel.json의 `crons` 설정이 매일 호출) —
 * 지금까지 이 둘은 전부 "누군가 특정 화면을 열어야만" 실행됐다:
 * - autoSettleTeamSeasons: 관리자가 /admin/... 페이지를 열 때만
 *   (admin/layout.tsx) — 그레이스 기간이 끝나도 관리자가 실제로 admin
 *   페이지를 열어보기 전까지는 자동 정산도, 다음 시즌 자동 생성도
 *   일어나지 않았다.
 * - autoFillRenewalPreferences: "매 시즌 물어보지 않고 계속 참여"를
 *   켜둔 참여자 본인이 앱을 열 때만(useNotificationData.ts) — 본인이
 *   선택한 옵션인데 앱을 한 번도 안 열면 끝까지 안 채워졌다.
 *
 * 이 라우트는 그 지연 없이, 모든 팀을 돌면서 둘 다 매일 그 자체로
 * 실행되게 한다. 화면 쪽 버전은 "열자마자 즉시 반영"하는 역할로 그대로
 * 둔다 — 조건이 같아서 중복 실행돼도 안전하다(멱등).
 *
 * 세션이 없는 크론 호출이라 RLS로 범위를 좁혀줄 "로그인한 사용자"가
 * 없다 — 그래서 RLS를 우회하는 service client로 직접 teamId를 넘겨서
 * 호출한다(두 함수 다 어떤 SupabaseClient를 받든 동작하도록 이미 짜여
 * 있다).
 *
 * `Authorization: Bearer ${CRON_SECRET}` 헤더로만 호출을 허용한다 —
 * Vercel은 프로젝트에 CRON_SECRET 환경변수가 설정돼 있으면 자기가 호출할
 * 때 이 헤더를 알아서 붙여준다(https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: teams, error } = await supabase.from("teams").select("id");

  if (error) {
    console.error("[cron/daily-maintenance] failed to load teams:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  for (const team of teams ?? []) {
    await autoSettleTeamSeasons(supabase, team.id);
    await autoFillRenewalPreferences(supabase, team.id);
  }

  return NextResponse.json({ ok: true, teamsChecked: (teams ?? []).length });
}
