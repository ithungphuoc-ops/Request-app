"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RequestStatusBadge from "@/components/request/RequestStatusBadge";
import type { ListLoadStatus, RequestInstance } from "@/lib/types";

function linkFor(r: RequestInstance): string {
  if (r.status !== "draft") return `/request/requests/${r.id}`;
  return r.groupId
    ? `/request/groups/${r.groupId}/submit?draftId=${r.id}`
    : `/request/direct/new?draftId=${r.id}`;
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<RequestInstance[]>([]);
  const [status, setStatus] = useState<ListLoadStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/requests?scope=mine")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("fetch failed"))))
      .then((data: { requests: RequestInstance[] }) => {
        if (cancelled) return;
        setRequests(data.requests ?? []);
        setStatus(data.requests?.length ? "loaded" : "empty");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-8 py-6">
      <h1 className="text-[23px] font-bold text-gray-900">Đề xuất của tôi</h1>

      {status === "loading" && (
        <p className="mt-6 text-[13px] text-gray-400">Đang tải...</p>
      )}
      {status === "error" && (
        <p className="mt-6 text-[13px] text-[var(--color-danger-red)]">
          Không tải được danh sách đề xuất.
        </p>
      )}
      {status === "empty" && (
        <div className="mt-6 flex min-h-[200px] items-center justify-center rounded-[3px] border border-dashed border-[var(--color-border)] bg-white">
          <p className="text-[13px] text-gray-400">Bạn chưa tạo đề xuất nào.</p>
        </div>
      )}

      {status === "loaded" && (
        <div className="mt-6 overflow-hidden rounded-[3px] border border-[var(--color-border)] bg-white">
          {requests.map((r) => (
            <Link
              key={r.id}
              href={linkFor(r)}
              className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 text-[13px] last:border-0 hover:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-800">{r.groupNameSnapshot}</p>
                <p className="text-[12px] text-gray-400">
                  {r.status === "draft" ? "Cập nhật" : "Gửi"} lúc{" "}
                  {new Date(r.submittedAt).toLocaleString("vi-VN")}
                </p>
              </div>
              <RequestStatusBadge status={r.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
