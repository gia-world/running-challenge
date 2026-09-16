export function LoadingSpinner() {
  return (
    <div
      role="status"
      aria-label="불러오는 중"
      className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-orange-500 dark:border-zinc-700 dark:border-t-orange-500"
    />
  );
}
