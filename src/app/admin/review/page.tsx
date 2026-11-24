import { SegmentedTabs } from "@/components/SegmentedTabs";
import { ReviewRequestList } from "./ReviewRequestList";
import { DropoutRequestList } from "./DropoutRequestList";

export default async function AdminReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const activeType = type === "dropout" ? "dropout" : "review";

  return (
    <SegmentedTabs
      items={[
        {
          key: "review",
          label: "재인증 요청",
          href: "/admin/review",
          isActive: activeType === "review",
        },
        {
          key: "dropout",
          label: "중도하차 요청",
          href: "/admin/review?type=dropout",
          isActive: activeType === "dropout",
        },
      ]}
    >
      {activeType === "review" ? <ReviewRequestList /> : <DropoutRequestList />}
    </SegmentedTabs>
  );
}
