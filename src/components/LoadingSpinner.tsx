export function LoadingSpinner() {
  return (
    <div
      role="status"
      aria-label="불러오는 중"
      className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary"
    />
  );
}
