"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RequestStatusBadge from "@/components/request/RequestStatusBadge";
import type { ListLoadStatus, RequestInstance } from "@/lib/types";

function isOverdue(r: RequestInstance): boolean {
  return r.status === "pending" && !!r.deadlineAt && new Date(r.deadlineAt).getTime() < Date.now();
}

export default function InboxPage() {
  const [requests, setRequests] = useState<RequestInstance[]>([]);
  const [status, setStatus] = useState<ListLoadStatus>("loading");

  useEffect(() => {
    fetch("/api/requests?scope=inbox")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("fetch failed"))))
      .then((data: { requests: RequestInstance[] }) => {
        setRequests(data.requests ?? []);
        setStatus(data.requests?.length ? "loaded" : "empty");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="px-8 py-6">
      <h1 className="text-[23px] font-bold text-gray-900">Chờ tôi duyệt</h1>

      {status === "loading" && (
        <p className="mt-6 text-[13px] text-gray-400">Đang tải...</p>
      )}
      {status === "error" && (
        <p className="mt-6 text-[13px] text-[var(--color-danger-red)]">
          Không tải được hộp thư chờ duyệt.
        </p>
      )}
      {status === "empty" && (
        <div className="mt-6 flex min-h-[200px] items-center justify-center rounded-[3px] border border-dashed border-[var(--color-border)] bg-white">
          <p className="text-[13px] text-gray-400">Không có đề xuất nào đang chờ bạn duyệt.</p>
        </div>
      )}

      {status === "loaded" && (
        <div className="mt-6 overflow-hidden rounded-[3px] border border-[var(--color-border)] bg-white">
          {requests.map((r) => (
            <Link
              key={r.id}
              href={`/request/requests/${r.id}`}
              className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 text-[13px] last:border-0 hover:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-800">{r.groupNameSnapshot}</p>
                <p className="text-[12px] text-gray-400">
                  Gửi bởi {r.submittedBy.name} lúc {new Date(r.submittedAt).toLocaleString("vi-VN")}
                </p>
              </div>
              {isOverdue(r) && (
                <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-red-100 px-2.5 text-[12px] font-medium text-[var(--color-danger-red)]">
                  Quá hạn
                </span>
              )}
              <RequestStatusBadge status={r.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
