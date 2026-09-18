import { DEFAULT_TEAM_NAME } from "@/lib/config";

export function TeamEyebrow({
  teamName,
  suffix,
  size = "sm",
}: {
  teamName?: string | null;
  suffix?: string;
  size?: "sm" | "lg";
}) {
  const name = teamName ?? DEFAULT_TEAM_NAME;

  return (
    <p
      className={
        size === "lg"
          ? "text-base font-medium text-orange-500"
          : "text-sm font-medium text-orange-500"
      }
    >
      {suffix ? `${name} · ${suffix}` : name}
    </p>
  );
}
