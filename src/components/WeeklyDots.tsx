export function WeeklyDots({ achieved, goal }: { achieved: number; goal: number }) {
  const filled = Math.min(achieved, goal);

  return (
    <div className="flex items-center gap-3" role="img" aria-label={`이번 주 ${achieved}/${goal}회 인증`}>
      {Array.from({ length: goal }, (_, i) => (
        <span
          key={i}
          className={
            i < filled
              ? "flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-lg text-white shadow-sm"
              : "flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-zinc-300 text-lg text-zinc-300 dark:border-zinc-700 dark:text-zinc-700"
          }
        >
          {i < filled ? "●" : "○"}
        </span>
      ))}
    </div>
  );
}
