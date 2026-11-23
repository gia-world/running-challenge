import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyUserByKakao } from "@/lib/kakao";
import { isWithinCertificationGrace, todayInSeoul } from "@/lib/week";
import { nextSeasonStartDate, seasonEndDateForSameDuration } from "@/lib/season";

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
    .select("id, start_date, end_date, entry_fee, refund_per_certification, settlement_notified_at")
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
      await autoCreateNextSeason(supabase, teamId, season);
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
      (admins ?? []).flatMap((admin) => [
        notifyUserByKakao(
          service,
          admin.user_id,
          "그레이스 기간이 끝났는데 처리할 요청이 남아있어서 시즌이 자동으로 정산되지 않았어요. 확인해주세요!",
          `/admin/season/${season.id}`,
        ),
        service.from("notifications").insert({
          user_id: admin.user_id,
          type: "settlement_pending",
        }),
      ]),
    );

    await supabase
      .from("seasons")
      .update({ settlement_notified_at: new Date().toISOString() })
      .eq("id", season.id);
  }
}

type SettledSeason = {
  id: string;
  start_date: string;
  end_date: string;
  entry_fee: number | null;
  refund_per_certification: number | null;
};

/**
 * 자동 정산 직후, 팀이 "다음 시즌 자동 생성"을 켜뒀으면(teams.
 * auto_create_next_season) 방금 끝난 시즌 바로 다음 날부터 같은 기간
 * 길이로 새 시즌을 만들고, 참가비/환급 단가도 그대로 물려받는다.
 * 자동연장(renew_next_season=true)한 참여자도 SeasonForm의 "자동 연장
 * 참여자 포함"과 똑같이 그대로 옮겨준다 — 안 그러면 자동연장 기능 자체가
 * 무의미해진다(어차피 관리자가 수동으로 다시 넣어줘야 하므로).
 *
 * 이미 그 뒤를 커버하는 시즌이 있으면(관리자가 미리 만들어뒀거나) 조용히
 * 건너뛴다 — 겹치는 시즌을 또 만들지 않는다.
 */
async function autoCreateNextSeason(
  supabase: SupabaseClient,
  teamId: string,
  endedSeason: SettledSeason,
): Promise<void> {
  const { data: team } = await supabase
    .from("teams")
    .select("auto_create_next_season")
    .eq("id", teamId)
    .maybeSingle();
  if (!team?.auto_create_next_season) return;

  const newStartDate = nextSeasonStartDate(endedSeason.end_date);
  const newEndDate = seasonEndDateForSameDuration(
    newStartDate,
    endedSeason.start_date,
    endedSeason.end_date,
  );

  // 수동 생성(SeasonForm)은 겹치는 시즌이 있어도 "그래도 만들까요?"로
  // 관리자가 직접 확인하고 넘어갈 수 있지만, 자동 생성엔 그런 확인
  // 단계가 없다 — 그래서 조금이라도 겹치면 조용히 건너뛴다(관리자가
  // 미리 만들어뒀거나 특수한 사정으로 겹치게 만들어둔 경우 등).
  const { data: existingSeasons } = await supabase
    .from("seasons")
    .select("start_date, end_date")
    .eq("team_id", teamId);
  const overlapsExisting = (existingSeasons ?? []).some(
    (s) => newStartDate <= s.end_date && s.start_date <= newEndDate,
  );
  if (overlapsExisting) return;

  const { data: newSeason, error } = await supabase
    .from("seasons")
    .insert({
      team_id: teamId,
      start_date: newStartDate,
      end_date: newEndDate,
      entry_fee: endedSeason.entry_fee,
      refund_per_certification: endedSeason.refund_per_certification,
    })
    .select("id")
    .single();

  if (error || !newSeason) {
    console.error("[autoSettle] auto season creation failed:", error?.message);
    return;
  }

  const { data: renewingMembers } = await supabase
    .from("season_memberships")
    .select("user_id")
    .eq("season_id", endedSeason.id)
    .eq("renew_next_season", true);

  if (renewingMembers && renewingMembers.length > 0) {
    await supabase
      .from("season_memberships")
      .insert(renewingMembers.map((m) => ({ season_id: newSeason.id, user_id: m.user_id })));
  }

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
        `새 시즌이 자동으로 만들어졌어요 (${newStartDate} ~ ${newEndDate}). 확인해주세요!`,
        `/admin/season/${newSeason.id}`,
      ),
    ),
  );
}
