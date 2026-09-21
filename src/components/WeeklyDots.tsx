export function WeeklyDots({
  achieved,
  goal,
}: {
  achieved: number;
  goal: number;
}) {
  const filled = Math.min(achieved, goal);

  return (
    <div
      className="flex items-center gap-3"
      role="img"
      aria-label={`이번 주 ${achieved}/${goal}회 인증`}
    >
      {Array.from({ length: goal }, (_, i) => (
        <span
          key={i}
          className={
            i < filled
              ? "flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg text-white shadow-sm"
              : "flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-border-strong text-lg text-ink-disabled"
          }
        >
          {i + 1}
        </span>
      ))}
    </div>
  );
}
