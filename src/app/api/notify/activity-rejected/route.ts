import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyUserByKakao } from "@/lib/kakao";

// Notifies an activity's owner over KakaoTalk when it's rejected. Re-derives
// from actual DB state (the activity's current status) rather than trusting
// the caller's say-so.
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

  const { data: activity } = await supabase
    .from("activities")
    .select("user_id, status, rejected_reason")
    .eq("id", activityId)
    .maybeSingle();

  if (!activity || activity.status !== "rejected") {
    return NextResponse.json({ ok: true });
  }

  const reasonText = activity.rejected_reason ? ` (사유: ${activity.rejected_reason})` : "";
  await notifyUserByKakao(
    supabase,
    activity.user_id,
    `인증이 반려됐어요${reasonText}. 새로 업로드해주세요.`,
    "/history",
  );

  return NextResponse.json({ ok: true });
}
