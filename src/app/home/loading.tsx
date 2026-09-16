import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 pb-20 dark:bg-black">
      <PageHeader>
        <div className="h-6 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </PageHeader>

      <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center gap-8 px-6 py-10">
        <LoadingSpinner />
      </main>

      <BottomNav active="home" />
    </div>
  );
}
