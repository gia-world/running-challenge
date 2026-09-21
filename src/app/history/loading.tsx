import { PageShell } from "@/components/PageShell";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Loading() {
  return (
    <PageShell
      eyebrowSkeleton
      header={
        <>
          <div className="mt-1 h-4 w-10 animate-pulse rounded bg-muted-strong" />
          <div className="mt-2 h-6 w-32 animate-pulse rounded bg-muted-strong" />
        </>
      }
      mainClassName="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-6 py-6"
      bottomNav={{ active: "home" }}
    >
      <LoadingSpinner />
    </PageShell>
  );
}
