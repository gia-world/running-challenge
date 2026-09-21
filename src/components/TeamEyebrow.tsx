import { DEFAULT_TEAM_NAME } from "@/lib/config";

export function TeamEyebrow({
  teamName,
  suffix,
  size = "sm",
  as: Tag = "p",
}: {
  teamName?: string | null;
  suffix?: string;
  size?: "sm" | "lg";
  /**
   * PageHeader (the persistent in-app header) renders this as "h2" — the
   * team name is the second rung of the app's heading chain there. The
   * standalone auth screens (login/onboarding/join) use it as a plain
   * eyebrow above their own h1 and leave this as "p".
   */
  as?: "p" | "h2";
}) {
  const name = teamName ?? DEFAULT_TEAM_NAME;

  return (
    <Tag
      className={
        size === "lg"
          ? "text-base font-medium text-primary"
          : "text-sm font-medium text-primary"
      }
    >
      {suffix ? `${name} · ${suffix}` : name}
    </Tag>
  );
}
