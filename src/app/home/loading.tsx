import { PageShell } from "@/components/PageShell";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Loading() {
  return (
    <PageShell
      eyebrowSkeleton
      header={<div className="mt-1 h-6 w-32 animate-pulse rounded bg-muted-strong" />}
      mainClassName="mx-auto flex w-full max-w-md flex-1 items-center justify-center gap-8 px-6 py-10"
      bottomNav={{ active: "home" }}
    >
      <LoadingSpinner />
    </PageShell>
  );
}
