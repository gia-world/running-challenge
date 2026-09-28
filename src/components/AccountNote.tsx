import type { ReactNode } from "react";
import { CopyButton } from "./CopyButton";

/**
 * "계좌 텍스트 + 복사 버튼" 줄 — 시즌 리포트의 내 계좌/팀 계좌 안내,
 * SeasonGate의 참가비 입금 계좌 안내에서 반복되던 마크업을 뽑았다.
 * 설명 문구는 호출부마다 완전히 달라서(Link 포함 여부, 한 줄/두 줄) 그대로
 * children으로 받는다 — accountNumber는 복사 버튼에만 쓰인다.
 */
export function AccountNote({
  accountNumber,
  className = "",
  children,
}: {
  accountNumber: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg bg-subtle px-3 py-2 text-sm${className ? ` ${className}` : ""}`}
    >
      <span className="text-ink-secondary">{children}</span>
      <CopyButton value={accountNumber} />
    </div>
  );
}
