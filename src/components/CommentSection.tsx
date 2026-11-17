"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Textarea } from "@/components/Textarea";
import { Button } from "@/components/Button";
import type { CommentItem } from "@/app/feed/loadFeed";

const COMMENT_MAX_LENGTH = 300;

/**
 * 댓글 + 대댓글(1단계만) — ReactionBar 바로 아래, 피드 카드와
 * PhotoViewerModal 양쪽에서 똑같이 렌더링된다. 글쓰기는 낙관적 업데이트
 * 없이 저장 후 router.refresh()로 서버 데이터를 다시 받아온다 — 작성자
 * 이름 표시를 위해 본인 프로필 정보를 따로 들고 있을 필요가 없어진다.
 */
export function CommentSection({
  activityId,
  currentUserId,
  comments,
}: {
  activityId: string;
  currentUserId: string;
  comments: CommentItem[];
}) {
  const router = useRouter();
  const [newBody, setNewBody] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topLevel = comments.filter((c) => c.parentCommentId === null);
  const repliesByParent = new Map<string, CommentItem[]>();
  for (const comment of comments) {
    if (!comment.parentCommentId) continue;
    const list = repliesByParent.get(comment.parentCommentId) ?? [];
    list.push(comment);
    repliesByParent.set(comment.parentCommentId, list);
  }

  async function submitComment(body: string, parentCommentId: string | null) {
    const trimmed = body.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("activity_comments").insert({
        activity_id: activityId,
        user_id: currentUserId,
        parent_comment_id: parentCommentId,
        body: trimmed,
      });
      if (insertError) throw insertError;

      setNewBody("");
      setReplyBody("");
      setReplyingToId(null);
      router.refresh();
    } catch (err) {
      console.error("[feed] comment submit failed:", err);
      setError("댓글 등록에 실패했어요. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border-subtle px-4 py-3 text-sm">
      {topLevel.map((comment) => (
        <div key={comment.id} className="flex flex-col gap-1">
          <p>
            <span className="font-semibold text-ink-strong">{comment.profileName ?? "러너"}</span>{" "}
            <span className="text-ink">{comment.body}</span>
          </p>
          <button
            type="button"
            onClick={() => setReplyingToId((id) => (id === comment.id ? null : comment.id))}
            className="self-start text-ink-tertiary hover:text-ink"
          >
            답글
          </button>

          {(repliesByParent.get(comment.id) ?? []).map((reply) => (
            <p key={reply.id} className="pl-4">
              <span className="font-semibold text-ink-strong">{reply.profileName ?? "러너"}</span>{" "}
              <span className="text-ink">{reply.body}</span>
            </p>
          ))}

          {replyingToId === comment.id && (
            <div className="flex flex-col gap-2 pl-4">
              <Textarea
                value={replyBody}
                onChange={setReplyBody}
                maxLength={COMMENT_MAX_LENGTH}
                placeholder="답글을 입력하세요"
              />
              <Button
                size="pill"
                className="self-end"
                onClick={() => submitComment(replyBody, comment.id)}
                disabled={isSubmitting || !replyBody.trim()}
              >
                등록
              </Button>
            </div>
          )}
        </div>
      ))}

      {error && <span className="text-danger">{error}</span>}

      <div className="flex flex-col gap-2">
        <Textarea
          value={newBody}
          onChange={setNewBody}
          maxLength={COMMENT_MAX_LENGTH}
          placeholder="댓글을 입력하세요"
        />
        <Button
          size="pill"
          className="self-end"
          onClick={() => submitComment(newBody, null)}
          disabled={isSubmitting || !newBody.trim()}
        >
          등록
        </Button>
      </div>
    </div>
  );
}
