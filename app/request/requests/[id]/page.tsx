"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, Forward, X } from "lucide-react";
import RequestStatusBadge from "@/components/request/RequestStatusBadge";
import ForwardModal from "@/components/request/ForwardModal";
import { canApproverAct } from "@/lib/approval-logic";
import { fieldDataTypeLabels } from "@/lib/types";
import type { RequestInstance, TaggedUser } from "@/lib/types";

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return String(value);
}

function isOverdue(request: RequestInstance): boolean {
  if (request.status !== "pending" || !request.deadlineAt) return false;
  return new Date(request.deadlineAt).getTime() < Date.now();
}

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<RequestInstance | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  const load = () => {
    fetch(`/api/requests/${params.id}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}) as { error?: string });
          throw new Error(body.error ?? "Không thể tải đề xuất.");
        }
        return res.json() as Promise<{ request: RequestInstance }>;
      })
      .then((data) => setRequest(data.request))
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Có lỗi xảy ra."));
  };

  useEffect(load, [params.id]);

  useEffect(() => {
    fetch("/api/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { uid: string } | null) => setCurrentUid(data?.uid ?? null))
      .catch(() => setCurrentUid(null));
  }, []);

  if (loadError) {
    return (
      <div className="px-8 py-6">
        <p className="text-[13px] text-[var(--color-danger-red)]">{loadError}</p>
      </div>
    );
  }
  if (!request) {
    return (
      <div className="px-8 py-6">
        <p className="text-[13px] text-gray-400">Đang tải...</p>
      </div>
    );
  }

  const canAct =
    currentUid !== null && canApproverAct(request.approvalFlow, request.approvers, currentUid);

  const decide = async (decision: "approved" | "rejected") => {
    setActingOn(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/requests/${request.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error ?? "Không thể xử lý quyết định.");
      }
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
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
    load();
  };

  return (
    <div className="flex gap-6 px-8 py-6">
      <div className="min-w-0 flex-[3]">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-3 text-[12px] text-gray-500 hover:underline"
        >
          ← Quay lại
        </button>

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
          <span className="shrink-0 text-[11px] text-gray-400">Mã: {request.id}</span>
        </div>

        {request.deadlineAt && (
          <p className="mt-2 text-[13px] text-gray-500">
            Hạn xử lý: {new Date(request.deadlineAt).toLocaleString("vi-VN")}
          </p>
        )}

        {canAct && (
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => decide("approved")}
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
              onClick={() => decide("rejected")}
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
              <dt className="text-gray-400">Thời gian tạo</dt>
              <dd className="font-medium text-gray-800">
                {new Date(request.submittedAt).toLocaleString("vi-VN")}
              </dd>
            </div>
          </dl>
        </div>

        {request.fieldsSnapshot.length > 0 && (
          <div className="mt-4 rounded-[3px] border border-[var(--color-border)] bg-white p-4">
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-gray-500">
              Dữ liệu biểu mẫu
            </h2>
            <dl className="flex flex-col gap-3 text-[13px]">
              {request.fieldsSnapshot
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((field, index) => (
                  <div key={field.id}>
                    <dt className="text-gray-400">
                      {String(index + 1).padStart(2, "0")}. {field.name}
                      <span className="ml-2 text-[11px] text-gray-300">
                        {fieldDataTypeLabels[field.dataType]}
                      </span>
                    </dt>
                    <dd className="font-medium text-gray-800">
                      {formatValue(request.values[field.id])}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        )}
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
    </div>
  );
}
