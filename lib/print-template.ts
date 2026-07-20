import { deserializeTableRows } from "@/lib/table-field";
import type { ProposalField, RequestInstance } from "@/lib/types";

const COMBINING_MARKS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

/**
 * Biến tên trường tiếng Việt thành khoá thẻ giữ chỗ trong mẫu in, ví dụ
 * "Bộ Phận" -> "bo_phan", "Tên đề xuất" -> "ten_de_xuat". Người dùng gõ thẻ
 * ${khoa} trực tiếp vào file Word mẫu (xem lib/print-template.ts).
 */
export function slugifyFieldName(name: string): string {
  return name
    .normalize("NFD")
    .replace(COMBINING_MARKS_REGEX, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatFieldValueForPrint(field: ProposalField, value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (field.dataType === "table" || field.dataType === "base_table") {
    return deserializeTableRows(value)
      .map((row) => row.filter(Boolean).join(" / "))
      .filter(Boolean)
      .join("; ");
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    if (typeof value[0] === "object") {
      return (value as { name?: string }[]).map((v) => v.name ?? "").filter(Boolean).join(", ");
    }
    return (value as string[]).join(", ");
  }
  return String(value);
}

/** Danh sách thẻ hệ thống luôn có sẵn, không phụ thuộc trường tuỳ chỉnh của nhóm. */
export const SYSTEM_TEMPLATE_KEYS = [
  { key: "ma_de_xuat", label: "Mã đề xuất" },
  { key: "nhom_de_xuat", label: "Tên nhóm đề xuất" },
  { key: "nguoi_tao", label: "Tên người tạo" },
  { key: "thoi_gian_tao", label: "Thời gian tạo" },
];

export function fieldTemplateKeys(fields: ProposalField[]): { key: string; label: string }[] {
  return fields.map((f) => ({ key: slugifyFieldName(f.name), label: f.name }));
}

/**
 * Dựng bảng khoá->giá trị (chuỗi) để điền vào mẫu docx bằng docxtemplater.
 * Trùng khoá giữa 2 trường tuỳ chỉnh (VD 2 trường cùng tên) — trường sau ghi
 * đè trường trước, không báo lỗi (chấp nhận được, hiếm khi xảy ra).
 */
export function buildPrintTemplateData(request: RequestInstance): Record<string, string> {
  const data: Record<string, string> = {
    ma_de_xuat: request.code ?? request.id,
    nhom_de_xuat: request.groupNameSnapshot,
    nguoi_tao: request.submittedBy.name,
    thoi_gian_tao: new Date(request.submittedAt).toLocaleString("vi-VN"),
  };

  for (const field of request.fieldsSnapshot) {
    const key = slugifyFieldName(field.name);
    if (!key) continue;
    data[key] = formatFieldValueForPrint(field, request.values[field.id]);
  }

  return data;
}
