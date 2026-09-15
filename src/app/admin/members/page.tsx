import { createClient } from "@/lib/supabase/server";
import { currentWeekRangeInSeoul, WEEKLY_GOAL } from "@/lib/week";
import type { Profile } from "@/lib/types";

export default async function AdminMembersPage() {
  const supabase = await createClient();
  const { start, end } = currentWeekRangeInSeoul();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, role")
    .order("name", { ascending: true })
    .returns<Pick<Profile, "id" | "name" | "role">[]>();

  const { data: weekActivities } = await supabase
    .from("activities")
    .select("user_id")
    .eq("status", "approved")
    .gte("activity_date", start)
    .lte("activity_date", end)
    .returns<{ user_id: string }[]>();

  const countByUser = new Map<string, number>();
  for (const activity of weekActivities ?? []) {
    countByUser.set(activity.user_id, (countByUser.get(activity.user_id) ?? 0) + 1);
  }

  const members = profiles ?? [];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
        크루원 관리 ({members.length}명)
      </h1>

      <ul className="flex flex-col gap-2">
        {members.map((member) => {
          const achieved = countByUser.get(member.id) ?? 0;
          const isDone = achieved >= WEEKLY_GOAL;
          return (
            <li
              key={member.id}
              className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-zinc-900"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {member.name}
                </span>
                {member.role === "admin" && (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                    관리자
                  </span>
                )}
              </div>
              <span
                className={
                  isDone
                    ? "text-sm font-semibold text-orange-500"
                    : "text-sm font-medium text-zinc-500 dark:text-zinc-400"
                }
              >
                {achieved} / {WEEKLY_GOAL}회
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
