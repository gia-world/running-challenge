import { PageShell } from "@/components/PageShell";
import { PageTitle } from "@/components/PageTitle";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Loading() {
  return (
    <PageShell
      eyebrowSkeleton
      header={<PageTitle>현황판</PageTitle>}
      mainClassName="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-6 py-6"
      bottomNav={{ active: "status" }}
    >
      <LoadingSpinner />
    </PageShell>
  );
}
