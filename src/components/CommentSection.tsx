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
 * PhotoViewerModal 양쪽에서 똑같이 렌더링된다. 글쓰기는 낙관적으로
 * 업데이트한다 — DB insert를 기다렸다가 router.refresh()로 피드 전체를
 * 새로 불러오면(사진 서명 URL 재발급까지 포함) 눈에 띄게 오래 걸리고
 * 화면이 덜컥거려서, 등록 누르자마자 로컬에 바로 추가해 보여주고
 * insert/refresh는 뒤에서 처리한다. 실패하면 그 항목만 빼고 입력값을
 * 되돌린다. comments prop이 갱신되면(= refresh가 실제로 도착하면) 그때
 * 로컬에 쌓아둔 낙관적 댓글은 전부 지운다 — 이제 서버 데이터 쪽에 진짜
 * 버전이 들어있을 거라서.
 */
export function CommentSection({
  activityId,
  currentUserId,
  currentUserName,
  comments,
}: {
  activityId: string;
  currentUserId: string;
  currentUserName: string | null;
  comments: CommentItem[];
}) {
  const router = useRouter();
  const [newBody, setNewBody] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticComments, setOptimisticComments] = useState<CommentItem[]>([]);

  const [prevComments, setPrevComments] = useState(comments);
  if (comments !== prevComments) {
    setPrevComments(comments);
    setOptimisticComments([]);
  }

  const allComments = [...comments, ...optimisticComments];
  const topLevel = allComments.filter((c) => c.parentCommentId === null);
  const repliesByParent = new Map<string, CommentItem[]>();
  for (const comment of allComments) {
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

    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    setOptimisticComments((prev) => [
      ...prev,
      {
        id: optimisticId,
        userId: currentUserId,
        profileName: currentUserName,
        body: trimmed,
        createdAt: new Date().toISOString(),
        parentCommentId,
      },
    ]);
    if (parentCommentId) {
      setReplyBody("");
      setReplyingToId(null);
    } else {
      setNewBody("");
    }

    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("activity_comments").insert({
        activity_id: activityId,
        user_id: currentUserId,
        parent_comment_id: parentCommentId,
        body: trimmed,
      });
      if (insertError) throw insertError;

      router.refresh();
    } catch (err) {
      console.error("[feed] comment submit failed:", err);
      setOptimisticComments((prev) => prev.filter((c) => c.id !== optimisticId));
      if (parentCommentId) {
        setReplyBody(trimmed);
        setReplyingToId(parentCommentId);
      } else {
        setNewBody(trimmed);
      }
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
