"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Forward, Paperclip, PenLine, RotateCcw, Send, Trash2, Undo2, X } from "lucide-react";
import RequestStatusBadge from "@/components/request/RequestStatusBadge";
import ForwardModal from "@/components/request/ForwardModal";
import ReasonModal from "@/components/request/ReasonModal";
import { canApproverAct } from "@/lib/approval-logic";
import { useCurrentSession } from "@/lib/useCurrentSession";
import { fieldDataTypeLabels } from "@/lib/types";
import type { RequestAttachment, RequestInstance, TaggedUser } from "@/lib/types";

function editLinkFor(request: RequestInstance): string {
  return request.groupId
    ? `/request/groups/${request.groupId}/submit?draftId=${request.id}`
    : `/request/direct/new?draftId=${request.id}`;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return String(value);
}

function isOverdue(request: RequestInstance): boolean {
  if (request.status !== "pending" || !request.deadlineAt) return false;
  return new Date(request.deadlineAt).getTime() < Date.now();
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

function formatCountdown(deadlineAt: string, now: number): string {
  const diff = new Date(deadlineAt).getTime() - now;
  if (diff <= 0) return "Đã quá hạn";
  const totalSeconds = Math.floor(diff / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function RequestDetailView({
  request,
  currentUid,
  onActed,
}: {
  request: RequestInstance;
  currentUid: string | null;
  onActed: () => void;
}) {
  const router = useRouter();
  const { isAdmin } = useCurrentSession();
  const [actingOn, setActingOn] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [managing, setManaging] = useState(false);

  const isOwnRequest = currentUid !== null && currentUid === request.submittedBy.uid;
  const canManage = isOwnRequest || isAdmin;

  const duplicateRequest = async () => {
    setDuplicating(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/requests/${request.id}/duplicate`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error ?? "Không thể nhân bản đề xuất.");
      }
      const data = (await res.json()) as { request: RequestInstance };
      router.push(editLinkFor(data.request));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setDuplicating(false);
    }
  };

  const deleteRequest = async () => {
    if (!window.confirm("Xóa đề xuất này? Có thể khôi phục lại sau qua admin.")) return;
    setManaging(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/requests/${request.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error ?? "Không thể xóa đề xuất.");
      }
      onActed();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setManaging(false);
    }
  };

  const restoreRequest = async () => {
    setManaging(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/requests/${request.id}/restore`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error ?? "Không thể khôi phục đề xuất.");
      }
      onActed();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setManaging(false);
    }
  };

  useEffect(() => {
    if (request.status !== "pending" || !request.deadlineAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [request.status, request.deadlineAt]);

  const canAct =
    currentUid !== null && canApproverAct(request.approvalFlow, request.approvers, currentUid);

  const decide = async (decision: "approved" | "rejected" | "returned", note?: string) => {
    setActingOn(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/requests/${request.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error ?? "Không thể xử lý quyết định.");
      }
      setRejectOpen(false);
      setReturnOpen(false);
      onActed();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      throw err;
    } finally {
      setActingOn(false);
    }
  };

  const forward = async (target: TaggedUser, note: string) => {
    const res = await fetch(`/api/requests/${request.id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "forwarded", target, note }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}) as { error?: string });
      throw new Error(body.error ?? "Không thể chuyển tiếp.");
    }
    setForwardOpen(false);
    onActed();
  };

  const postComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    setPostingComment(true);
    setCommentError(null);
    try {
      const res = await fetch(`/api/requests/${request.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error ?? "Không thể gửi thảo luận.");
      }
      setCommentText("");
      onActed();
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setPostingComment(false);
    }
  };

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-[3]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">{request.groupNameSnapshot}</h1>
            <div className="mt-2 flex items-center gap-2">
              <RequestStatusBadge status={request.status} />
              {isOverdue(request) && (
                <span className="inline-flex h-6 items-center rounded-full bg-red-100 px-2.5 text-[12px] font-medium text-[var(--color-danger-red)]">
                  Quá hạn
                </span>
              )}
            </div>
          </div>
          <span className="shrink-0 text-[11px] text-gray-400">
            Mã đề xuất: <span className="font-medium text-gray-500">{request.code ?? request.id}</span>
          </span>
        </div>

        {request.deletedAt && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded border border-red-100 bg-red-50 px-3 py-2 text-[13px] text-[var(--color-danger-red)]">
            <span>Đề xuất đã bị xóa lúc {new Date(request.deletedAt).toLocaleString("vi-VN")}.</span>
            {isAdmin && (
              <button
                type="button"
                onClick={restoreRequest}
                disabled={managing}
                className="flex shrink-0 items-center gap-1 rounded bg-white px-2.5 py-1 text-[12px] font-medium text-[var(--color-danger-red)] ring-1 ring-inset ring-red-200 hover:bg-red-100 disabled:opacity-60"
              >
                <RotateCcw size={13} /> Khôi phục
              </button>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {request.status === "returned" && isOwnRequest && (
            <a
              href={editLinkFor(request)}
              className="flex h-8 items-center gap-1.5 rounded border border-[var(--color-action-blue)] px-3 text-[12px] font-medium text-[var(--color-action-blue)] hover:bg-blue-50"
            >
              <PenLine size={13} /> Sửa và gửi lại
            </a>
          )}
          {currentUid && (
            <button
              type="button"
              onClick={duplicateRequest}
              disabled={duplicating}
              className="flex h-8 items-center gap-1.5 rounded border border-[var(--color-border)] px-3 text-[12px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
            >
              <Copy size={13} /> {duplicating ? "Đang nhân bản..." : "Nhân bản"}
            </button>
          )}
          {canManage && !request.deletedAt && (
            <button
              type="button"
              onClick={deleteRequest}
              disabled={managing}
              className="flex h-8 items-center gap-1.5 rounded border border-[var(--color-border)] px-3 text-[12px] font-medium text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-[var(--color-danger-red)] disabled:opacity-60"
            >
              <Trash2 size={13} /> Xóa
            </button>
          )}
        </div>

        {canAct && (
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => decide("approved").catch(() => {})}
              disabled={actingOn}
              className="flex h-9 items-center gap-1.5 rounded bg-[var(--color-confirm-green)] px-4 text-[13px] font-medium text-white hover:brightness-95 disabled:opacity-60"
            >
              <Check size={15} /> Chấp thuận
            </button>
            <button
              type="button"
              onClick={() => setForwardOpen(true)}
              disabled={actingOn}
              className="flex h-9 items-center gap-1.5 rounded bg-teal-500 px-4 text-[13px] font-medium text-white hover:brightness-95 disabled:opacity-60"
            >
              <Forward size={15} /> Chuyển tiếp
            </button>
            <button
              type="button"
              onClick={() => setReturnOpen(true)}
              disabled={actingOn}
              className="flex h-9 items-center gap-1.5 rounded bg-orange-500 px-4 text-[13px] font-medium text-white hover:brightness-95 disabled:opacity-60"
            >
              <Undo2 size={15} /> Trả lại
            </button>
            <button
              type="button"
              onClick={() => setRejectOpen(true)}
              disabled={actingOn}
              className="flex h-9 items-center gap-1.5 rounded bg-[var(--color-danger-red)] px-4 text-[13px] font-medium text-white hover:brightness-95 disabled:opacity-60"
            >
              <X size={15} /> Từ chối
            </button>
          </div>
        )}
        {actionError && (
          <p className="mt-2 text-[13px] text-[var(--color-danger-red)]">{actionError}</p>
        )}

        <div className="mt-6 rounded-[3px] border border-[var(--color-border)] bg-white p-4">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-gray-500">
            Thông tin đề xuất
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
            <div>
              <dt className="text-gray-400">Người tạo</dt>
              <dd className="font-medium text-gray-800">{request.submittedBy.name}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Nhóm đề xuất</dt>
              <dd className="font-medium text-[var(--color-action-blue)]">
                {request.groupNameSnapshot}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400">Thời gian tạo</dt>
              <dd className="font-medium text-gray-800">
                {new Date(request.submittedAt).toLocaleString("vi-VN")}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400">Cập nhật gần nhất</dt>
              <dd className="font-medium text-gray-800">
                {formatRelativeTime(request.updatedAt ?? request.submittedAt)}
              </dd>
            </div>
            {request.deadlineAt && (
              <>
                <div>
                  <dt className="text-gray-400">Thời hạn của đề xuất</dt>
                  <dd className="font-medium text-gray-800">
                    {new Date(request.deadlineAt).toLocaleString("vi-VN")}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400">Thời gian còn lại</dt>
                  <dd
                    className={`font-medium ${
                      isOverdue(request) ? "text-[var(--color-danger-red)]" : "text-gray-800"
                    }`}
                  >
                    {request.status === "pending"
                      ? formatCountdown(request.deadlineAt, now)
                      : "—"}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </div>

        {request.fieldsSnapshot.length > 0 && (
          <div className="mt-4 rounded-[3px] border border-[var(--color-border)] bg-white p-4">
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-gray-500">
              Thông tin khác (mẫu đăng ký đề xuất)
            </h2>
            <dl className="flex flex-col gap-3 text-[13px]">
              {request.fieldsSnapshot
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((field, index) => {
                  const isTable = field.dataType === "table" || field.dataType === "base_table";
                  const isFile = field.dataType === "file";
                  return (
                    <div key={field.id}>
                      <dt className="text-gray-400">
                        {String(index + 1).padStart(2, "0")}. {field.name}
                        <span className="ml-2 text-[11px] text-gray-300">
                          {fieldDataTypeLabels[field.dataType]}
                        </span>
                      </dt>
                      {isTable ? (
                        <TableValueView
                          columns={field.tableColumns ?? []}
                          rows={(request.values[field.id] as string[][]) ?? []}
                        />
                      ) : isFile ? (
                        <FileValueView
                          requestId={request.id}
                          attachments={(request.values[field.id] as RequestAttachment[]) ?? []}
                        />
                      ) : (
                        <dd className="font-medium text-gray-800">
                          {formatValue(request.values[field.id])}
                        </dd>
                      )}
                    </div>
                  );
                })}
            </dl>
          </div>
        )}

        <div className="mt-4 rounded-[3px] border border-[var(--color-border)] bg-white p-4">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-gray-500">
            Thảo luận
          </h2>

          <div className="flex items-start gap-2">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  postComment();
                }
              }}
              rows={2}
              placeholder="Viết thảo luận của bạn"
              className="min-w-0 flex-1 rounded border border-[var(--color-border)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-action-blue)]"
            />
            <button
              type="button"
              onClick={postComment}
              disabled={postingComment || !commentText.trim()}
              aria-label="Gửi thảo luận"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[var(--color-action-blue)] text-white hover:brightness-95 disabled:opacity-50"
            >
              <Send size={15} />
            </button>
          </div>
          {commentError && (
            <p className="mt-1 text-[12px] text-[var(--color-danger-red)]">{commentError}</p>
          )}

          <div className="mt-4 flex flex-col gap-3">
            {(request.comments ?? []).length === 0 && (
              <p className="text-[13px] text-gray-400">Chưa có thảo luận nào.</p>
            )}
            {(request.comments ?? [])
              .slice()
              .reverse()
              .map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-400 text-[11px] font-semibold text-white">
                    {c.avatarInitial}
                  </span>
                  <div className="min-w-0 flex-1 rounded bg-gray-50 px-3 py-2">
                    <p className="text-[13px] font-medium text-gray-800">{c.authorName}</p>
                    <p className="text-[13px] text-gray-700">{c.text}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {new Date(c.at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="flex w-[300px] shrink-0 flex-col gap-4">
        <div className="rounded-[3px] border border-[var(--color-border)] bg-white p-4">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
            Người xét duyệt
          </h3>
          <div className="flex flex-col gap-2">
            {request.approversSnapshot.map((approver) => {
              const state = request.approvers.find((a) => a.id === approver.id);
              return (
                <div key={approver.id} className="flex items-center gap-2 text-[13px]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-action-blue)] text-[10px] font-semibold text-white">
                    {approver.avatarInitial}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-gray-700">{approver.name}</span>
                  <span
                    className={`shrink-0 text-[11px] ${
                      state?.decision === "approved"
                        ? "text-[var(--color-confirm-green)]"
                        : state?.decision === "rejected"
                          ? "text-[var(--color-danger-red)]"
                          : "text-gray-400"
                    }`}
                  >
                    {state?.decision === "approved"
                      ? "Đã duyệt"
                      : state?.decision === "rejected"
                        ? "Đã từ chối"
                        : "Chưa xử lý"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {request.followers.length > 0 && (
          <div className="rounded-[3px] border border-[var(--color-border)] bg-white p-4">
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
              Người theo dõi
            </h3>
            <div className="flex flex-col gap-2">
              {request.followers.map((f) => (
                <div key={f.id} className="flex items-center gap-2 text-[13px] text-gray-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-400 text-[10px] font-semibold text-white">
                    {f.avatarInitial}
                  </span>
                  {f.name}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-[3px] border border-[var(--color-border)] bg-white p-4">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
            Lịch sử hoạt động
          </h3>
          <div className="flex flex-col gap-3">
            {request.history
              .slice()
              .reverse()
              .map((entry, index) => (
                <div key={index} className="text-[12px]">
                  <p className="text-gray-700">
                    <span className="font-medium">{entry.actor}</span> {entry.action}
                    {entry.target && <> → {entry.target}</>}
                  </p>
                  {entry.note && <p className="text-gray-400">&quot;{entry.note}&quot;</p>}
                  <p className="text-gray-400">{new Date(entry.at).toLocaleString("vi-VN")}</p>
                </div>
              ))}
          </div>
        </div>
      </div>

      {forwardOpen && (
        <ForwardModal onClose={() => setForwardOpen(false)} onConfirm={forward} />
      )}
      {rejectOpen && (
        <ReasonModal
          title="Từ chối đề xuất"
          confirmLabel="Từ chối"
          onClose={() => setRejectOpen(false)}
          onConfirm={(note) => decide("rejected", note)}
        />
      )}
      {returnOpen && (
        <ReasonModal
          title="Trả lại đề xuất"
          confirmLabel="Trả lại"
          onClose={() => setReturnOpen(false)}
          onConfirm={(note) => decide("returned", note)}
        />
      )}
    </div>
  );
}

function FileValueView({
  requestId,
  attachments,
}: {
  requestId: string;
  attachments: RequestAttachment[];
}) {
  if (attachments.length === 0) {
    return <p className="font-medium text-gray-800">—</p>;
  }
  return (
    <ul className="mt-1 flex flex-col gap-1">
      {attachments.map((att) => (
        <li key={att.path}>
          <a
            href={`/api/requests/${requestId}/attachments?path=${encodeURIComponent(att.path)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[13px] text-[var(--color-action-blue)] hover:underline"
          >
            <Paperclip size={13} className="shrink-0" />
            <span className="truncate">{att.name}</span>
            <span className="shrink-0 text-gray-400">({(att.size / 1024 / 1024).toFixed(1)}MB)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function TableValueView({ columns, rows }: { columns: string[]; rows: string[][] }) {
  if (columns.length === 0) {
    return <p className="font-medium text-gray-800">—</p>;
  }
  const filledRows = rows.filter((row) => row.some((cell) => cell?.trim()));
  if (filledRows.length === 0) {
    return <p className="font-medium text-gray-800">—</p>;
  }

  return (
    <div className="mt-1 overflow-x-auto rounded border border-[var(--color-border)]">
      <table className="w-full text-[12px]">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-8 px-2 py-1.5 text-left text-gray-400">#</th>
            {columns.map((col, i) => (
              <th key={i} className="px-2 py-1.5 text-left font-medium text-gray-600">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filledRows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-gray-100">
              <td className="px-2 py-1.5 text-gray-400">{rowIndex + 1}</td>
              {columns.map((_, colIndex) => (
                <td key={colIndex} className="px-2 py-1.5 text-gray-800">
                  {row[colIndex] || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
