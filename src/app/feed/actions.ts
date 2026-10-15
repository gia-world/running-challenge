"use server";

import { requireTeamViewer } from "@/lib/viewer";
import { loadFeed } from "./loadFeed";

/** "더보기" 버튼이 호출하는 서버 액션 — 다음 페이지를 이어서 불러온다. */
export async function loadMoreFeed(cursor: string) {
  const { user } = await requireTeamViewer();
  return loadFeed({ userId: user.id, cursor });
}
