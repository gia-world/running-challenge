import { CREW_NAME } from "@/lib/config";

export function CrewEyebrow({
  suffix,
  size = "sm",
}: {
  suffix?: string;
  size?: "sm" | "lg";
}) {
  return (
    <p
      className={
        size === "lg"
          ? "text-sm font-medium text-orange-500"
          : "text-xs font-medium text-orange-500"
      }
    >
      {suffix ? `${CREW_NAME} · ${suffix}` : CREW_NAME}
    </p>
  );
}
