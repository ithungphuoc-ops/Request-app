"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useRequestContext } from "@/context/RequestContext";
import {
  cancelButtonClass,
  confirmButtonClass,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/shared/form-styles";
import type { ProposalField, RequestInstance } from "@/lib/types";

type FieldValues = Record<string, unknown>;

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export default function SubmitRequestPage() {
  const params = useParams<{ groupId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getGroupById } = useRequestContext();
  const group = getGroupById(params.groupId);

  const [draftId, setDraftId] = useState<string | null>(searchParams.get("draftId"));
  const [values, setValues] = useState<FieldValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!draftId) return;
    fetch(`/api/requests/${draftId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("fetch failed"))))
      .then((data: { request: RequestInstance }) => setValues(data.request.values ?? {}))
      .catch(() => setSubmitError("Không tải được bản nháp."));
  }, [draftId]);

  if (!group) return null;

  const setFieldValue = (fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const saveDraft = async () => {
    setSavingDraft(true);
    setSubmitError(null);
    try {
      if (draftId) {
        const res = await fetch(`/api/requests/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values, isDraft: true }),
        });
        if (!res.ok) throw new Error("Không thể lưu nháp.");
      } else {
        const res = await fetch("/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: group.id, values, isDraft: true }),
        });
        if (!res.ok) throw new Error("Không thể lưu nháp.");
        const data = (await res.json()) as { request: RequestInstance };
        setDraftId(data.request.id);
      }
      setDraftSavedAt(Date.now());
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};
    for (const field of group.fields) {
      if (field.required && isEmptyValue(values[field.id])) {
        nextErrors[field.id] = "Trường này là bắt buộc.";
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = draftId
        ? await fetch(`/api/requests/${draftId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ values, isDraft: false }),
          })
        : await fetch("/api/requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupId: group.id, values }),
          });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error ?? "Không thể gửi đề xuất, vui lòng thử lại.");
      }
      router.push("/request/list?scope=mine");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[820px] px-8 py-6">
      <h1 className="text-[22px] font-bold text-gray-900">Gửi đề xuất: {group.name}</h1>
      {group.description && (
        <p className="mt-1 text-[13px] text-gray-500">{group.description}</p>
      )}

      <div className="mt-5 rounded-[6px] border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5">
          {group.fields.length === 0 && (
            <p className="text-[13px] text-gray-400">Nhóm này chưa có trường dữ liệu nào.</p>
          )}
          {group.fields
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                value={values[field.id]}
                error={errors[field.id]}
                onChange={(value) => setFieldValue(field.id, value)}
              />
            ))}
        </div>

        {submitError && (
          <p className="mt-5 text-[13px] text-[var(--color-danger-red)]">{submitError}</p>
        )}

        <div className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-5">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || savingDraft}
            className={`${confirmButtonClass} flex-none px-6`}
          >
            {submitting ? "Đang gửi..." : "Gửi đề xuất"}
          </button>
          <button
            type="button"
            onClick={saveDraft}
            disabled={submitting || savingDraft}
            className={`${cancelButtonClass} flex-none px-6`}
          >
            {savingDraft ? "Đang lưu..." : "Lưu nháp"}
          </button>
          {draftSavedAt && (
            <span className="text-[12px] text-gray-400">
              Đã lưu nháp lúc {new Date(draftSavedAt).toLocaleTimeString("vi-VN")}
            </span>
          )}
          <button
            type="button"
            onClick={() => router.back()}
            className="text-[13px] text-gray-500 hover:underline"
          >
            Hủy bỏ
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldRow({
  field,
  value,
  error,
  onChange,
}: {
  field: ProposalField;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}) {
  if (field.dataType === "section_title") {
    return (
      <div className="-mx-6 mt-1 border-b border-gray-100 bg-gray-50 px-6 py-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-gray-500">
          {field.name}
        </h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
      <label className="shrink-0 pt-1.5 text-[13px] font-semibold text-gray-700 sm:w-[220px]">
        {field.name}
        {field.required && <span className="ml-0.5 text-[var(--color-danger-red)]">*</span>}
      </label>
      <div className="min-w-0 flex-1">
        <FieldControl field={field} value={value} onChange={onChange} />
        {error && <p className="mt-1 text-[12px] text-[var(--color-danger-red)]">{error}</p>}
      </div>
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: ProposalField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (field.dataType) {
    case "short_text":
      return (
        <input
          className={inputClass}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "paragraph":
      return (
        <textarea
          className={textareaClass}
          rows={3}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "integer":
      return (
        <input
          type="number"
          step={1}
          className={inputClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
      );
    case "decimal":
    case "currency":
      return (
        <input
          type="number"
          step="any"
          className={inputClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
      );
    case "date":
      return (
        <input
          type="date"
          className={inputClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "datetime":
      return (
        <input
          type="datetime-local"
          className={inputClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "single_choice":
      return (
        <select
          className={selectClass}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Chọn một giá trị</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case "multiple_choice": {
      const selected = new Set((value as string[]) ?? []);
      return (
        <div className="flex flex-col gap-1.5">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-[13px] text-gray-700">
              <input
                type="checkbox"
                checked={selected.has(opt)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(opt);
                  else next.delete(opt);
                  onChange(Array.from(next));
                }}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }
    case "file":
      return (
        <p className="text-[12px] text-gray-400">
          Đính kèm tệp tin chưa được hỗ trợ trong bản này.
        </p>
      );
    case "table":
    case "base_table": {
      const columns = field.tableColumns ?? [];
      const rows = (value as string[][]) ?? [];

      const updateCell = (rowIndex: number, colIndex: number, cellValue: string) => {
        const next = rows.map((row) => [...row]);
        if (!next[rowIndex]) next[rowIndex] = columns.map(() => "");
        next[rowIndex][colIndex] = cellValue;
        onChange(next);
      };
      const addRow = () => onChange([...rows, columns.map(() => "")]);
      const removeRow = (rowIndex: number) => onChange(rows.filter((_, i) => i !== rowIndex));

      if (columns.length === 0) {
        return (
          <p className="text-[12px] text-gray-400">
            Trường bảng này chưa cấu hình cột — vào Mẫu biểu đề xuất để thêm cột.
          </p>
        );
      }

      return (
        <div className="overflow-hidden rounded border border-[var(--color-border)]">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-8 px-2 py-1.5 text-left text-gray-400">#</th>
                  {columns.map((col, i) => (
                    <th key={i} className="min-w-[120px] px-2 py-1.5 text-left font-medium text-gray-600">
                      {col}
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 2} className="px-2 py-4 text-center text-gray-400">
                      Chưa có dòng nào.
                    </td>
                  </tr>
                )}
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-gray-100">
                    <td className="px-2 py-1 text-gray-400">{rowIndex + 1}</td>
                    {columns.map((_, colIndex) => (
                      <td key={colIndex} className="px-1 py-1">
                        <input
                          value={row[colIndex] ?? ""}
                          onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                          className="h-8 w-full rounded border border-transparent px-2 text-[12px] outline-none hover:border-[var(--color-border)] focus:border-[var(--color-action-blue)]"
                        />
                      </td>
                    ))}
                    <td className="px-1 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(rowIndex)}
                        aria-label="Xóa dòng"
                        className="text-gray-300 hover:text-[var(--color-danger-red)]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={addRow}
            className="flex w-full items-center justify-center gap-1 border-t border-gray-100 py-2 text-[12px] text-[var(--color-action-blue)] hover:bg-blue-50"
          >
            <Plus size={13} /> Thêm dòng
          </button>
        </div>
      );
    }
    case "formula":
      return (
        <p className="text-[12px] text-gray-400">
          Loại trường &quot;{field.name}&quot; chưa được hỗ trợ khi gửi đề xuất.
        </p>
      );
    default:
      return null;
  }
}
