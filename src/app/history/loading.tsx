import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col bg-canvas pb-20">
      <PageHeader eyebrowSkeleton>
        <div className="mt-1 h-4 w-10 animate-pulse rounded bg-muted-strong" />
        <div className="mt-2 h-6 w-32 animate-pulse rounded bg-muted-strong" />
      </PageHeader>

      <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-6 py-6">
        <LoadingSpinner />
      </main>

      <BottomNav active="home" />
    </div>
  );
}
