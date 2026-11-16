"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatKoreanDate } from "@/lib/format";
import { Textarea } from "@/components/Textarea";
import { Button } from "@/components/Button";
import { SectionTitle } from "@/components/SectionTitle";
import { EmptyState } from "@/components/EmptyState";

const ANNOUNCEMENT_MAX_LENGTH = 300;

type Announcement = { id: string; body: string; created_at: string };

/**
 * 공지 작성 + 지난 공지 목록/삭제를 한 컴포넌트에서 다룬다 — 작성 직후
 * 목록에 바로 반영돼야 하고, 삭제도 즉시 반영돼야 해서 폼과 목록을
 * 따로 쪼개면 둘이 state를 주고받을 일만 늘어난다.
 */
export function AnnouncementManager({
  teamId,
  userId,
  initialAnnouncements,
}: {
  teamId: string;
  userId: string;
  initialAnnouncements: Announcement[];
}) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const trimmed = body.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("announcements")
        .insert({ team_id: teamId, created_by: userId, body: trimmed })
        .select("id, body, created_at")
        .single();
      if (insertError || !data) throw insertError;

      setAnnouncements((prev) => [data, ...prev]);
      setBody("");
    } catch (err) {
      console.error("[admin/announcements] create failed:", err);
      setError("공지 등록에 실패했어요. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const previous = announcements;
    setAnnouncements((list) => list.filter((a) => a.id !== id));

    const supabase = createClient();
    const { error: deleteError } = await supabase.from("announcements").delete().eq("id", id);
    if (deleteError) {
      console.error("[admin/announcements] delete failed:", deleteError.message);
      setAnnouncements(previous);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <SectionTitle>새 공지 작성</SectionTitle>
        <Textarea
          value={body}
          onChange={setBody}
          maxLength={ANNOUNCEMENT_MAX_LENGTH}
          placeholder="예: 댓글 기능이 추가됐어요!"
        />
        {error && <span className="text-sm text-danger">{error}</span>}
        <Button onClick={handleCreate} disabled={isSubmitting || !body.trim()}>
          {isSubmitting ? "등록 중..." : "공지 등록"}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <SectionTitle>지난 공지</SectionTitle>
        {announcements.length === 0 ? (
          <EmptyState className="mt-2">아직 공지한 내용이 없어요.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {announcements.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <p className="text-base text-ink">{a.body}</p>
                  <p className="text-sm text-ink-tertiary">
                    {formatKoreanDate(a.created_at.slice(0, 10))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  className="shrink-0 text-sm text-ink-tertiary hover:text-danger"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
