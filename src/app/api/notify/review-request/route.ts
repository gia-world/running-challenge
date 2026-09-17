import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyUserByKakao } from "@/lib/kakao";

// Notifies a team's admins over KakaoTalk when a re-review request comes
// in. Re-derives the notification from actual DB state (a genuinely
// pending request for this activity) rather than trusting the caller's
// say-so, and always responds 200 — a missed notification isn't worth
// surfacing as an error to the UI, since the request itself already
// succeeded before this endpoint was ever called.
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const activityId = body?.activityId;
  if (typeof activityId !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: pendingRequest } = await supabase
    .from("activity_review_requests")
    .select("id")
    .eq("activity_id", activityId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (!pendingRequest) {
    return NextResponse.json({ ok: true });
  }

  const { data: activity } = await supabase
    .from("activities")
    .select("season_id")
    .eq("id", activityId)
    .maybeSingle();

  const { data: season } = activity
    ? await supabase.from("seasons").select("team_id").eq("id", activity.season_id).maybeSingle()
    : { data: null };

  if (!season) {
    return NextResponse.json({ ok: true });
  }

  const { data: admins } = await supabase
    .from("team_memberships")
    .select("user_id")
    .eq("team_id", season.team_id)
    .eq("role", "admin");

  await Promise.all(
    (admins ?? []).map((admin) =>
      notifyUserByKakao(supabase, admin.user_id, "재인증 요청이 들어왔어요. 확인해주세요!", "/admin/review"),
    ),
  );

  return NextResponse.json({ ok: true });
}
