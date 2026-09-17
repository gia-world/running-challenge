import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 pb-20 dark:bg-black">
      <PageHeader eyebrowSkeleton>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">인증하기</h1>
      </PageHeader>

      <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-6 py-6">
        <LoadingSpinner />
      </main>

      <BottomNav active="certify" />
    </div>
  );
}
