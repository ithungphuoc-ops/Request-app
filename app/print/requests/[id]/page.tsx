"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import type { CategoryGroup, RequestInstance } from "@/lib/types";
import { fieldDataTypeLabels } from "@/lib/types";

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    // Bảng nhiều dòng (string[][]) — in gộp thành văn bản, giữ đơn giản cho bản in.
    if (Array.isArray(value[0])) {
      return (value as string[][])
        .map((row) => row.filter(Boolean).join(" / "))
        .filter(Boolean)
        .join("; ");
    }
    // Tệp đính kèm hoặc lựa chọn nhiều giá trị.
    if (typeof value[0] === "object") {
      return (value as { name?: string }[]).map((v) => v.name ?? "").filter(Boolean).join(", ");
    }
    return (value as string[]).join(", ");
  }
  return String(value);
}

export default function PrintRequestPage() {
  const params = useParams<{ id: string }>();
  const [request, setRequest] = useState<RequestInstance | null>(null);
  const [footerNote, setFooterNote] = useState<string | null>(null);
  const [includeDiscussion, setIncludeDiscussion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/requests/${params.id}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}) as { error?: string });
          throw new Error(body.error ?? "Không thể tải đề xuất.");
        }
        return res.json() as Promise<{ request: RequestInstance }>;
      })
      .then((data) => setRequest(data.request))
      .catch((err) => setError(err instanceof Error ? err.message : "Có lỗi xảy ra."));
  }, [params.id]);

  useEffect(() => {
    if (!request?.groupId) return;
    fetch("/api/groups")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { categoryGroups: CategoryGroup[] } | null) => {
        if (!data) return;
        for (const cat of data.categoryGroups) {
          const found = cat.groups.find((g) => g.id === request.groupId);
          if (found) {
            setFooterNote(found.printFooterNote ?? null);
            return;
          }
        }
      })
      .catch(() => {});
  }, [request?.groupId]);

  if (error) {
    return <p className="p-8 text-[13px] text-[var(--color-danger-red)]">{error}</p>;
  }
  if (!request) {
    return <p className="p-8 text-[13px] text-gray-400">Đang tải...</p>;
  }

  const sortedFields = [...request.fieldsSnapshot].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-white px-6 py-3">
        <p className="text-[13px] text-gray-500">Bản in đề xuất — {request.groupNameSnapshot}</p>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-[12px] text-gray-600">
            <input
              type="checkbox"
              checked={includeDiscussion}
              onChange={(e) => setIncludeDiscussion(e.target.checked)}
            />
            In kèm thảo luận
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex h-9 items-center gap-1.5 rounded bg-[var(--color-action-blue)] px-4 text-[13px] font-medium text-white hover:brightness-95"
          >
            <Printer size={15} /> In đề xuất
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[720px] bg-white px-10 py-8 text-[13px] text-gray-800 print:max-w-none print:p-0">
        <p className="text-center text-[16px] font-bold uppercase">HP Cons</p>
        <p className="mt-1 text-center text-[14px] font-semibold uppercase text-gray-700">
          {request.groupNameSnapshot}
        </p>
        <p className="mt-0.5 text-center text-[12px] text-gray-400">
          Mã đề xuất: {request.code ?? request.id}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 border-b border-gray-200 pb-4">
          <p>
            <span className="text-gray-400">Người tạo:</span> {request.submittedBy.name}
          </p>
          <p>
            <span className="text-gray-400">Thời gian tạo:</span>{" "}
            {new Date(request.submittedAt).toLocaleString("vi-VN")}
          </p>
          <p>
            <span className="text-gray-400">Trạng thái:</span>{" "}
            {request.status === "approved"
              ? "Đã chấp thuận"
              : request.status === "rejected"
                ? "Đã từ chối"
                : request.status === "returned"
                  ? "Đã trả lại"
                  : request.status === "draft"
                    ? "Nháp"
                    : "Đang chờ duyệt"}
          </p>
          {request.deadlineAt && (
            <p>
              <span className="text-gray-400">Thời hạn:</span>{" "}
              {new Date(request.deadlineAt).toLocaleString("vi-VN")}
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          {sortedFields.map((field, index) => (
            <div key={field.id}>
              <span className="text-gray-400">
                {String(index + 1).padStart(2, "0")}. {field.name}
                <span className="ml-1 text-[11px]">({fieldDataTypeLabels[field.dataType]})</span>:
              </span>{" "}
              <span className="font-medium">{formatValue(request.values[field.id])}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="mb-2 text-[12px] font-semibold uppercase text-gray-500">Người xét duyệt</p>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="py-1 font-medium">Họ tên</th>
                <th className="py-1 font-medium">Kết quả</th>
                <th className="py-1 font-medium">Chữ ký</th>
              </tr>
            </thead>
            <tbody>
              {request.approversSnapshot.map((approver) => {
                const state = request.approvers.find((a) => a.id === approver.id);
                return (
                  <tr key={approver.id} className="border-t border-gray-100">
                    <td className="py-2">{approver.name}</td>
                    <td className="py-2">
                      {state?.decision === "approved"
                        ? "Đã duyệt"
                        : state?.decision === "rejected"
                          ? "Đã từ chối"
                          : "Chưa xử lý"}
                    </td>
                    <td className="py-2 text-gray-300">......................</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {includeDiscussion && request.comments.length > 0 && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <p className="mb-2 text-[12px] font-semibold uppercase text-gray-500">Thảo luận</p>
            <div className="flex flex-col gap-2">
              {request.comments.map((c) => (
                <div key={c.id} className="text-[12px]">
                  <span className="font-medium">{c.authorName}</span> ({new Date(c.at).toLocaleString("vi-VN")}
                  ): {c.text}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 whitespace-pre-line text-center text-[12px] text-gray-600">
          {footerNote || "Người lập phiếu\n\n\nNgười duyệt"}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
