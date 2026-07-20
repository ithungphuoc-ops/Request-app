"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { signInWithCustomToken } from "firebase/auth";
import { Check, Pencil, Reply, Send, Trash2, X } from "lucide-react";
import { getFirebaseAuth, getFirebaseFirestore } from "@/lib/firebase/client";
import type { RequestComment, TaggedUser } from "@/lib/types";

/** Tìm "@" đang gõ dở ngay trước con trỏ (không tính @ dính liền chữ trước đó). */
function findActiveMention(textUpToCursor: string): { start: number; query: string } | null {
  const match = /(?:^|\s)@([^\s@]*)$/.exec(textUpToCursor);
  if (!match) return null;
  const query = match[1];
  const start = textUpToCursor.length - query.length - 1;
  return { start, query };
}

/** Nguồn thật của mentionIds là các token "@username" còn trong nội dung —
 * xóa chữ thì tự động không còn tính là mention nữa. */
function extractMentionIds(text: string, directory: TaggedUser[]): string[] {
  const tokens = new Set(
    text
      .split(/\s+/)
      .filter((t) => t.startsWith("@") && t.length > 1)
      .map((t) => t.slice(1).toLowerCase()),
  );
  if (tokens.size === 0) return [];
  const ids = new Set<string>();
  for (const u of directory) {
    if (tokens.has(u.username.toLowerCase())) ids.add(u.id);
  }
  return Array.from(ids);
}

/**
 * Khung "Thảo luận" — @mention (người + nhóm/phòng ban), cập nhật real-time
 * qua Firestore Client SDK, sửa/xóa bình luận của mình, trả lời 1 cấp, Admin/
 * Owner kiểm duyệt xóa được bình luận bất kỳ. Xem design.md của change
 * add-comment-mentions-realtime.
 */
export default function CommentSection({
  requestId,
  initialComments,
  currentUid,
  isAdmin,
}: {
  requestId: string;
  initialComments: RequestComment[];
  currentUid: string | null;
  isAdmin: boolean;
}) {
  const [comments, setComments] = useState<RequestComment[]>(initialComments);
  const [text, setText] = useState("");
  const [replyTarget, setReplyTarget] = useState<RequestComment | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const bootstrapped = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Danh bạ @mention (người + nhóm/phòng ban) — tải 1 lần, dùng để gợi ý khi
  // gõ "@" ngay trong ô bình luận và để suy ra mentionIds từ nội dung lúc gửi.
  const [directory, setDirectory] = useState<TaggedUser[]>([]);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState(0);

  useEffect(() => {
    fetch("/api/directory/mentionable")
      .then((res) => (res.ok ? res.json() : { directory: [] }))
      .then((data: { directory: TaggedUser[] }) => setDirectory(data.directory ?? []))
      .catch(() => setDirectory([]));
  }, []);

  const suggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const term = mentionQuery.trim().toLowerCase();
    const pool = term
      ? directory.filter(
          (u) => u.name.toLowerCase().includes(term) || u.username.toLowerCase().includes(term),
        )
      : directory;
    return pool.slice(0, 8);
  }, [mentionQuery, directory]);

  // Đồng bộ lại nếu component cha tải lại đề xuất (vd sau khi duyệt/chuyển tiếp).
  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  // Cầu nối real-time: mint custom token (server xác minh session SSO), đăng
  // nhập Firebase Auth ẩn, rồi mở onSnapshot trên document requests/{id}.
  // Lỗi ở bất kỳ bước nào chỉ tắt real-time — bình luận qua API vẫn hoạt
  // động bình thường (không real-time), không chặn nghiệp vụ chính.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const auth = getFirebaseAuth();
        if (!auth.currentUser) {
          const res = await fetch("/api/auth/firebase-token", { method: "POST" });
          if (!res.ok) return;
          const { token } = (await res.json()) as { token: string };
          await signInWithCustomToken(auth, token);
        }
        if (cancelled) return;

        const db = getFirebaseFirestore();
        unsubscribe = onSnapshot(doc(db, "requests", requestId), (snap) => {
          const data = snap.data() as { comments?: RequestComment[] } | undefined;
          if (data?.comments) setComments(data.comments);
        });
      } catch {
        // Real-time không khả dụng (thiếu config Firebase Client SDK, token
        // hết hạn...) — bỏ qua êm, khung bình luận vẫn dùng được qua API.
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [requestId]);

  const resetComposer = () => {
    setText("");
    setReplyTarget(null);
    setMentionStart(null);
    setMentionQuery(null);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    const cursor = e.target.selectionStart ?? value.length;
    const active = findActiveMention(value.slice(0, cursor));
    setMentionStart(active?.start ?? null);
    setMentionQuery(active?.query ?? null);
    setHighlighted(0);
  };

  const insertMention = (user: TaggedUser) => {
    if (mentionStart === null) return;
    const cursor = textareaRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, mentionStart);
    const after = text.slice(cursor);
    const insertion = `@${user.username} `;
    const nextText = `${before}${insertion}${after}`;
    setText(nextText);
    setMentionStart(null);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const pos = before.length + insertion.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((h) => (h + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((h) => (h - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        insertMention(suggestions[highlighted]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionStart(null);
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch(`/api/requests/${requestId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: value,
          mentionIds: extractMentionIds(value, directory),
          parentId: replyTarget?.id ?? null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error ?? "Không thể gửi thảo luận.");
      }
      const data = (await res.json()) as { comments: RequestComment[] };
      setComments(data.comments);
      resetComposer();
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setPosting(false);
    }
  };

  const startEdit = (comment: RequestComment) => {
    setEditingId(comment.id);
    setEditText(comment.text);
  };

  const saveEdit = async (id: string) => {
    const value = editText.trim();
    if (!value) return;
    try {
      const res = await fetch(`/api/requests/${requestId}/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error ?? "Không thể sửa bình luận.");
      }
      const data = (await res.json()) as { comments: RequestComment[] };
      setComments(data.comments);
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    }
  };

  const removeComment = async (id: string) => {
    if (!window.confirm("Xóa bình luận này?")) return;
    try {
      const res = await fetch(`/api/requests/${requestId}/comments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error ?? "Không thể xóa bình luận.");
      }
      const data = (await res.json()) as { comments: RequestComment[] };
      setComments(data.comments);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    }
  };

  const topLevel = comments.filter((c) => !c.parentId).slice().reverse();
  const repliesFor = (id: string) =>
    comments.filter((c) => c.parentId === id).slice().sort((a, b) => a.at.localeCompare(b.at));

  const renderComment = (comment: RequestComment, isReply: boolean) => {
    const isAuthor = currentUid !== null && currentUid === comment.authorUid;
    const canDelete = isAuthor || isAdmin;
    const editing = editingId === comment.id;

    return (
      <div key={comment.id} className={`flex items-start gap-2 ${isReply ? "ml-9" : ""}`}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-400 text-[11px] font-semibold text-white">
          {comment.avatarInitial}
        </span>
        <div className="min-w-0 flex-1 rounded bg-gray-50 px-3 py-2">
          {editing ? (
            <div className="flex items-start gap-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                className="min-w-0 flex-1 rounded border border-[var(--color-border)] px-2 py-1 text-[13px] outline-none focus:border-[var(--color-action-blue)]"
              />
              <button
                type="button"
                onClick={() => saveEdit(comment.id)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[var(--color-action-blue)] text-white hover:brightness-95"
              >
                <Check size={13} />
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <>
              <p className="text-[13px] font-medium text-gray-800">{comment.authorName}</p>
              <p className="whitespace-pre-wrap text-[13px] text-gray-700">{comment.text}</p>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400">
                <span>{new Date(comment.at).toLocaleString("vi-VN")}</span>
                {comment.editedAt && <span>(đã sửa)</span>}
                {!isReply && (
                  <button
                    type="button"
                    onClick={() => setReplyTarget(comment)}
                    className="flex items-center gap-0.5 text-gray-400 hover:text-[var(--color-action-blue)]"
                  >
                    <Reply size={11} /> Trả lời
                  </button>
                )}
                {isAuthor && (
                  <button
                    type="button"
                    onClick={() => startEdit(comment)}
                    className="flex items-center gap-0.5 text-gray-400 hover:text-[var(--color-action-blue)]"
                  >
                    <Pencil size={11} /> Sửa
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => removeComment(comment.id)}
                    className="flex items-center gap-0.5 text-gray-400 hover:text-[var(--color-danger-red)]"
                  >
                    <Trash2 size={11} /> Xóa
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {replyTarget && (
        <div className="mb-2 flex items-center justify-between rounded bg-blue-50 px-3 py-1.5 text-[12px] text-[var(--color-action-blue)]">
          <span>Đang trả lời {replyTarget.authorName}</span>
          <button type="button" onClick={() => setReplyTarget(null)} className="hover:text-blue-800">
            <X size={13} />
          </button>
        </div>
      )}

      <div className="relative flex items-start gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleTextareaKeyDown}
          onBlur={() => {
            // Trễ 1 nhịp để kịp xử lý click chọn gợi ý trước khi đóng dropdown.
            setTimeout(() => setMentionQuery(null), 150);
          }}
          rows={2}
          placeholder="Viết thảo luận của bạn — gõ @ để tag người hoặc nhóm/phòng ban"
          className="min-w-0 flex-1 rounded border border-[var(--color-border)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-action-blue)]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={posting || !text.trim()}
          aria-label="Gửi thảo luận"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[var(--color-action-blue)] text-white hover:brightness-95 disabled:opacity-50"
        >
          <Send size={15} />
        </button>

        {mentionQuery !== null && suggestions.length > 0 && (
          <div className="absolute left-0 top-full z-10 mt-1 max-h-[180px] w-[calc(100%-44px)] overflow-y-auto rounded border border-[var(--color-border)] bg-white shadow-lg">
            {suggestions.map((u, i) => (
              <button
                key={u.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertMention(u)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-gray-50 ${
                  i === highlighted ? "bg-gray-50" : ""
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${
                    u.kind === "group" ? "bg-teal-500" : "bg-[var(--color-action-blue)]"
                  }`}
                >
                  {u.avatarInitial}
                </span>
                <span>
                  {u.name} <span className="text-gray-400">@{u.username}</span>
                  {u.kind === "group" && (
                    <span className="ml-1 text-[10px] text-teal-600">(nhóm/phòng ban)</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {postError && <p className="mt-1 text-[12px] text-[var(--color-danger-red)]">{postError}</p>}

      <div className="mt-4 flex flex-col gap-3">
        {topLevel.length === 0 && <p className="text-[13px] text-gray-400">Chưa có thảo luận nào.</p>}
        {topLevel.map((comment) => (
          <div key={comment.id} className="flex flex-col gap-2">
            {renderComment(comment, false)}
            {repliesFor(comment.id).map((reply) => renderComment(reply, true))}
          </div>
        ))}
      </div>
    </div>
  );
}
