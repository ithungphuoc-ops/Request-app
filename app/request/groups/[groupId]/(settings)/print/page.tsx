"use client";

import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import RequireAdminRole from "@/components/request/RequireAdminRole";
import { useRequestContext } from "@/context/RequestContext";
import { cancelButtonClass, confirmButtonClass, textareaClass } from "@/components/shared/form-styles";
import { fieldDataTypeLabels } from "@/lib/types";
import type { PrintTemplate } from "@/lib/types";
import { SYSTEM_TEMPLATE_KEYS, fieldTemplateKeys } from "@/lib/print-template";

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
  const [uploading, setUploading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!group) return null;

  const save = () => {
    updateGroup(group.id, { printFooterNote: footerNote });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const uploadTemplate = async (file: File) => {
    setUploading(true);
    setTemplateError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/groups/${group.id}/print-template`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error ?? "Không thể tải mẫu in lên.");
      }
      const { printTemplate } = (await res.json()) as { printTemplate: PrintTemplate };
      updateGroup(group.id, { printTemplate });
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeTemplate = async () => {
    if (!window.confirm("Xoá mẫu in hiện tại?")) return;
    setUploading(true);
    setTemplateError(null);
    try {
      const res = await fetch(`/api/groups/${group.id}/print-template`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error ?? "Không thể xoá mẫu in.");
      }
      updateGroup(group.id, { printTemplate: null });
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setUploading(false);
    }
  };

  const sortedFields = [...group.fields].sort((a, b) => a.order - b.order);
  const placeholderKeys = [...SYSTEM_TEMPLATE_KEYS, ...fieldTemplateKeys(sortedFields)];

  return (
    <div>
      <h2 className="mb-4 text-[15px] font-semibold text-gray-800">In đề xuất</h2>

      <div className="mb-6 rounded-[3px] border border-[var(--color-border)] bg-white p-4">
        <h3 className="text-[13px] font-semibold text-gray-800">Mẫu in tự động (.docx)</h3>
        <p className="mt-1 text-[12px] text-gray-500">
          Tải lên file Word có sẵn logo/tiêu đề công ty, gõ thẻ giữ chỗ dạng{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5">${"{khoa}"}</code> vào đúng vị trí cần
          điền dữ liệu — hệ thống sẽ tự thay bằng dữ liệu thật khi tải về (dùng nút &quot;Tải Word
          theo mẫu&quot; ở trang chi tiết đề xuất).
        </p>

        {group.printTemplate ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded border border-[var(--color-border)] bg-gray-50 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2 text-[13px] text-gray-700">
              <FileText size={16} className="shrink-0 text-[var(--color-action-blue)]" />
              <span className="truncate">{group.printTemplate.fileName}</span>
              <span className="shrink-0 text-[11px] text-gray-400">
                — tải lên {new Date(group.printTemplate.uploadedAt).toLocaleString("vi-VN")}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={`${cancelButtonClass} h-8 px-3 text-[12px] disabled:opacity-60`}
              >
                Thay mẫu khác
              </button>
              <button
                type="button"
                onClick={removeTemplate}
                disabled={uploading}
                className="flex h-8 items-center gap-1 rounded px-2 text-[12px] text-gray-400 hover:text-[var(--color-danger-red)] disabled:opacity-60"
              >
                <Trash2 size={13} /> Xoá
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`${confirmButtonClass} mt-3 flex items-center gap-1.5 px-4 disabled:opacity-60`}
          >
            <Upload size={14} /> {uploading ? "Đang tải lên..." : "Tải mẫu Word lên"}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadTemplate(file);
          }}
        />
        {templateError && (
          <p className="mt-2 text-[12px] text-[var(--color-danger-red)]">{templateError}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {placeholderKeys.map((k) => (
            <code
              key={k.key}
              title={k.label}
              className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600"
            >
              ${"{" + k.key + "}"}
            </code>
          ))}
        </div>
      </div>

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
