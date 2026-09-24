import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyUserByKakao } from "@/lib/kakao";
import { isWithinCertificationGrace, todayInSeoul } from "@/lib/week";

/**
 * Runs on every admin page load (admin/layout.tsx) so a "settling" season
 * doesn't just sit there waiting for someone to click 정산완료. Once its
 * grace period has actually ended:
 * - no pending review/dropout requests left → settle it automatically.
 * - something's still pending → the admin has to resolve it themselves
 *   (재인증 요청함/중도하차 요청함), so nudge them over KakaoTalk once —
 *   `settlement_notified_at` stops this firing again on every subsequent
 *   visit while the same request is still sitting there.
 */
export async function autoSettleTeamSeasons(
  supabase: SupabaseClient,
  teamId: string,
): Promise<void> {
  const today = todayInSeoul();
  const { data: settlingSeasons } = await supabase
    .from("seasons")
    .select("id, end_date, settlement_notified_at")
    .eq("team_id", teamId)
    .is("settled_at", null)
    .lt("end_date", today);

  for (const season of settlingSeasons ?? []) {
    if (isWithinCertificationGrace(season.end_date)) continue;

    const { data: seasonActivities } = await supabase
      .from("activities")
      .select("id")
      .eq("season_id", season.id);
    const activityIds = (seasonActivities ?? []).map((a) => a.id);

    let hasPendingReviewRequests = false;
    if (activityIds.length > 0) {
      const { data: pendingRequests } = await supabase
        .from("activity_review_requests")
        .select("activity_id")
        .eq("status", "pending")
        .in("activity_id", activityIds);
      hasPendingReviewRequests = (pendingRequests ?? []).length > 0;
    }

    const { data: pendingDropoutRequests } = await supabase
      .from("season_dropout_requests")
      .select("id")
      .eq("season_id", season.id)
      .eq("status", "pending");
    const hasPendingDropoutRequests = (pendingDropoutRequests ?? []).length > 0;

    if (!hasPendingReviewRequests && !hasPendingDropoutRequests) {
      await supabase
        .from("seasons")
        .update({ settled_at: new Date().toISOString() })
        .eq("id", season.id);
      continue;
    }

    if (season.settlement_notified_at) continue;

    const service = createServiceClient();
    const { data: admins } = await service
      .from("team_memberships")
      .select("user_id")
      .eq("team_id", teamId)
      .eq("role", "admin");

    await Promise.all(
      (admins ?? []).map((admin) =>
        notifyUserByKakao(
          service,
          admin.user_id,
          "그레이스 기간이 끝났는데 처리할 요청이 남아있어서 시즌이 자동으로 정산되지 않았어요. 확인해주세요!",
          `/admin/season/${season.id}`,
        ),
      ),
    );

    await supabase
      .from("seasons")
      .update({ settlement_notified_at: new Date().toISOString() })
      .eq("id", season.id);
  }
}
