import type { SupabaseClient } from "@supabase/supabase-js";
import { seasonWeekIndexForDate, seasonWeekRange } from "@/lib/season";
import { todayInSeoul } from "@/lib/week";

/**
 * "매 시즌 물어보지 않고 계속 참여"(profiles.auto_renew_preference)를
 * 켜둔 참여자는, 시즌 마지막 주에 아직 연장 여부를 안 정했으면
 * season_memberships.renew_next_season을 자동으로 true로 채워준다 —
 * 원래 useNotificationData.ts(모든 화면에서 자기 몫만 채움)에만 있던
 * 로직인데, "본인이 선택한 옵션인데 앱을 안 열어도 확실히 처리돼야
 * 한다"는 요청으로 팀 전체를 도는 이 버전을 추가했다. 크론이 매일
 * 돌려서, 그 주가 시작된 날 그 사람이 앱을 한 번도 안 열어도 안전망
 * 역할을 한다. 클라이언트 쪽 버전은 "앱을 열면 즉시 반영"하는 역할로
 * 그대로 둔다 — 둘 다 같은 조건이라 중복 실행돼도 안전하다(멱등).
 */
export async function autoFillRenewalPreferences(
  supabase: SupabaseClient,
  teamId: string,
): Promise<void> {
  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, start_date, end_date")
    .eq("team_id", teamId)
    .is("settled_at", null);

  const today = todayInSeoul();
  const seasonIdsInLastWeek = (seasons ?? [])
    .filter((season) => {
      const lastWeekIndex = seasonWeekIndexForDate(season.start_date, season.end_date);
      if (lastWeekIndex === null) return false;
      const lastWeekStart = seasonWeekRange(season.start_date, lastWeekIndex).start;
      return today >= lastWeekStart;
    })
    .map((season) => season.id);

  if (seasonIdsInLastWeek.length === 0) return;

  const { data: pendingMemberships } = await supabase
    .from("season_memberships")
    .select("season_id, user_id")
    .in("season_id", seasonIdsInLastWeek)
    .is("renew_next_season", null);

  if (!pendingMemberships || pendingMemberships.length === 0) return;

  const userIds = Array.from(new Set(pendingMemberships.map((m) => m.user_id)));
  const { data: autoRenewProfiles } = await supabase
    .from("profiles")
    .select("id")
    .in("id", userIds)
    .eq("auto_renew_preference", true);

  const autoRenewUserIds = new Set((autoRenewProfiles ?? []).map((p) => p.id));
  const toFill = pendingMemberships.filter((m) => autoRenewUserIds.has(m.user_id));

  await Promise.all(
    toFill.map((m) =>
      supabase
        .from("season_memberships")
        .update({ renew_next_season: true })
        .eq("season_id", m.season_id)
        .eq("user_id", m.user_id),
    ),
  );
}
