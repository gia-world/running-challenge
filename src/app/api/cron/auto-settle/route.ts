import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { autoSettleTeamSeasons } from "@/lib/autoSettle";

/**
 * Vercel Cron 전용 엔드포인트(vercel.json의 `crons` 설정이 매일 호출) —
 * 지금까지 autoSettleTeamSeasons는 관리자가 /admin/... 페이지를 열 때만
 * 실행됐는데(admin/layout.tsx), 그러면 그레이스 기간이 끝나도 관리자가
 * 실제로 admin 페이지를 열어보기 전까지는 자동 정산도, (이번에 추가한)
 * 다음 시즌 자동 생성도 일어나지 않는다. 이 라우트는 그 지연 없이,
 * 모든 팀을 돌면서 정산/시즌 생성이 그 자체로 매일 실행되게 한다.
 *
 * 세션이 없는 크론 호출이라 RLS로 범위를 좁혀줄 "로그인한 관리자"가
 * 없다 — 그래서 RLS를 우회하는 service client로 직접 teamId를 넘겨서
 * 호출한다(autoSettleTeamSeasons 자체는 어떤 SupabaseClient를 받든
 * 동작하도록 이미 짜여 있다).
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
    console.error("[cron/auto-settle] failed to load teams:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  for (const team of teams ?? []) {
    await autoSettleTeamSeasons(supabase, team.id);
  }

  return NextResponse.json({ ok: true, teamsChecked: (teams ?? []).length });
}
