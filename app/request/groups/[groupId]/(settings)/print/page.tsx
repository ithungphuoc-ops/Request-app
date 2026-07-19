"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import RequireAdminRole from "@/components/request/RequireAdminRole";
import { useRequestContext } from "@/context/RequestContext";
import { confirmButtonClass, textareaClass } from "@/components/shared/form-styles";
import { fieldDataTypeLabels } from "@/lib/types";

export default function PrintSettingsPage() {
  return (
    <RequireAdminRole>
      <PrintSettingsPageInner />
    </RequireAdminRole>
  );
}

function PrintSettingsPageInner() {
  const params = useParams<{ groupId: string }>();
  const { getGroupById, updateGroup } = useRequestContext();
  const group = getGroupById(params.groupId);
  const [footerNote, setFooterNote] = useState(group?.printFooterNote ?? "");
  const [saved, setSaved] = useState(false);

  if (!group) return null;

  const save = () => {
    updateGroup(group.id, { printFooterNote: footerNote });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sortedFields = [...group.fields].sort((a, b) => a.order - b.order);

  return (
    <div>
      <h2 className="mb-4 text-[15px] font-semibold text-gray-800">In đề xuất</h2>

      <div className="flex gap-6">
        <div className="w-[320px] shrink-0">
          <label className="mb-1 block text-[13px] font-medium text-gray-700">
            Ghi chú chân trang mẫu in
          </label>
          <textarea
            className={textareaClass}
            rows={3}
            value={footerNote}
            onChange={(e) => setFooterNote(e.target.value)}
            placeholder="Ví dụ: Người lập phiếu&#10;&#10;&#10;Người duyệt"
          />
          <p className="mt-1 text-[12px] text-gray-400">
            Hiện ở cuối trang khi in đề xuất thuộc nhóm này. Để trống dùng ghi chú mặc định.
          </p>
          <button type="button" onClick={save} className={`${confirmButtonClass} mt-3 px-4`}>
            {saved ? "Đã lưu" : "Lưu thay đổi"}
          </button>
          <p className="mt-4 text-[12px] text-gray-400">
            Xem bản in thật ở trang chi tiết của từng đề xuất đã gửi (nút &quot;In đề xuất&quot;).
            Bên phải là bản xem trước với dữ liệu mẫu.
          </p>
        </div>

        <div className="min-w-0 flex-1 rounded-[3px] border border-[var(--color-border)] bg-white p-6">
          <div className="mx-auto max-w-[560px] border border-gray-200 p-6 text-[13px]">
            <p className="text-center text-[15px] font-bold uppercase">HP Cons</p>
            <p className="mt-1 text-center text-[13px] font-semibold uppercase text-gray-600">
              {group.name}
            </p>
            <div className="mt-4 flex flex-col gap-1 text-[12px] text-gray-600">
              <p>Người tạo: Nguyễn Văn A</p>
              <p>Thời gian tạo: 01/01/2026 08:00</p>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {sortedFields.length === 0 ? (
                <p className="text-[12px] text-gray-400">Nhóm chưa có trường dữ liệu.</p>
              ) : (
                sortedFields.map((f) => (
                  <div key={f.id} className="text-[12px]">
                    <span className="text-gray-400">
                      {f.name} ({fieldDataTypeLabels[f.dataType]}):
                    </span>{" "}
                    <span className="text-gray-700">—</span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 whitespace-pre-line text-center text-[12px] text-gray-600">
              {footerNote || "Người lập phiếu\n\n\nNgười duyệt"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
