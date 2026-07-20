import { deserializeTableRows } from "@/lib/table-field";
import type { ProposalField, RequestInstance, RequestStatus } from "@/lib/types";

const COMBINING_MARKS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

/**
 * Biến tên trường tiếng Việt thành khoá thẻ giữ chỗ trong mẫu in, ví dụ
 * "Bộ Phận" -> "bo_phan", "Tên đề xuất" -> "ten_de_xuat". Người dùng gõ thẻ
 * ${khoa} trực tiếp vào file Word mẫu.
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

/** Vài cách đặt tên phổ biến cho trường "tiêu đề" của 1 đề xuất — dùng cho thẻ ${name}. */
const TITLE_FIELD_SLUGS = new Set([
  "ten_de_xuat",
  "ten_de_nghi",
  "ten_phieu",
  "ten_dang_ky",
]);

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

function statusLabel(status: RequestStatus): string {
  switch (status) {
    case "draft":
      return "Nháp";
    case "pending":
      return "Đang chờ duyệt";
    case "approved":
      return "Đã chấp thuận";
    case "rejected":
      return "Đã từ chối";
    case "returned":
      return "Đã trả lại";
    default:
      return status;
  }
}

/** Thời điểm approver ra quyết định — tra trong history theo tên (khớp action Đã chấp thuận/Đã từ chối). */
function findDecisionTimestamp(request: RequestInstance, approverName: string): string | null {
  const entry = [...request.history]
    .reverse()
    .find(
      (h) => h.actor === approverName && (h.action === "Đã chấp thuận" || h.action === "Đã từ chối"),
    );
  return entry?.at ?? null;
}

/** Khối chữ ký/duyệt nhiều dòng — "Tên (username) - trạng thái (thời gian)", mỗi người 1 dòng. */
function buildApprovalsBlock(request: RequestInstance): string {
  return request.approversSnapshot
    .map((approver, i) => {
      const state = request.approvers[i];
      const decisionLabel =
        state?.decision === "approved"
          ? "Đã chấp thuận"
          : state?.decision === "rejected"
            ? "Đã từ chối"
            : "Chưa xử lý";
      const at = findDecisionTimestamp(request, approver.name);
      const atLabel = at ? ` (${new Date(at).toLocaleString("vi-VN")})` : "";
      return `${approver.name} (${approver.username}) - ${decisionLabel}${atLabel}`;
    })
    .join("\n");
}

/** Giá trị của trường được coi là "tên đề xuất" (VD "Tên đề xuất") — nếu không có, dùng tên nhóm. */
function resolveNameValue(request: RequestInstance): string {
  for (const field of request.fieldsSnapshot) {
    if (TITLE_FIELD_SLUGS.has(slugifyFieldName(field.name))) {
      const value = formatFieldValueForPrint(field, request.values[field.id]);
      if (value) return value;
    }
  }
  return request.groupNameSnapshot;
}

/** Danh sách thẻ hệ thống luôn có sẵn, không phụ thuộc trường tuỳ chỉnh của nhóm. */
export const SYSTEM_TEMPLATE_KEYS = [
  { key: "id", label: "Mã đề xuất" },
  { key: "name", label: "Tên đề xuất (lấy từ trường \"Tên đề xuất\", nếu có)" },
  { key: "nhom_de_xuat", label: "Tên nhóm đề xuất" },
  { key: "creator_name", label: "Tên người tạo" },
  { key: "created_at_datetime", label: "Thời gian tạo" },
  { key: "status", label: "Trạng thái hiện tại" },
  { key: "approvals_name_username_title_datetime", label: "Danh sách người duyệt + trạng thái (nhiều dòng)" },
];

/**
 * Danh sách thẻ gợi ý theo trường tuỳ chỉnh của nhóm — trường kiểu Bảng sinh
 * thêm 1 thẻ cho mỗi cột theo dòng đầu tiên (column.<khoa_bang>.<số cột>),
 * vì mẫu in không lặp dòng bảng động (giai đoạn 1).
 */
export function fieldTemplateKeys(fields: ProposalField[]): { key: string; label: string }[] {
  const keys: { key: string; label: string }[] = [];
  for (const field of fields) {
    const slug = slugifyFieldName(field.name);
    if (!slug) continue;
    if (field.dataType === "table" || field.dataType === "base_table") {
      (field.tableColumns ?? []).forEach((col, i) => {
        keys.push({ key: `column.${slug}.${i}`, label: `${field.name} — ${col} (dòng 1)` });
      });
    } else {
      keys.push({ key: slug, label: field.name });
    }
  }
  return keys;
}

/**
 * Dựng bảng khoá->giá trị (chuỗi) để điền vào mẫu docx bằng docxtemplater.
 * docxtemplater KHÔNG tự hiểu "a.b.c" là truy cập lồng nhau — toàn bộ khoá ở
 * đây là CHUỖI PHẲNG (kể cả khoá có dấu chấm như "column.chi_tiet.0"), khớp
 * đúng 1-1 với chữ trong thẻ ${...} của file mẫu.
 */
export function buildPrintTemplateData(request: RequestInstance): Record<string, string> {
  const data: Record<string, string> = {
    id: request.code ?? request.id,
    name: resolveNameValue(request),
    nhom_de_xuat: request.groupNameSnapshot,
    creator_name: request.submittedBy.name,
    created_at_datetime: new Date(request.submittedAt).toLocaleString("vi-VN"),
    status: statusLabel(request.status),
    approvals_name_username_title_datetime: buildApprovalsBlock(request),
  };

  for (const field of request.fieldsSnapshot) {
    const slug = slugifyFieldName(field.name);
    if (!slug) continue;
    const value = request.values[field.id];
    data[slug] = formatFieldValueForPrint(field, value);

    if (field.dataType === "table" || field.dataType === "base_table") {
      const firstRow = deserializeTableRows(value)[0] ?? [];
      firstRow.forEach((cell, i) => {
        data[`column.${slug}.${i}`] = cell ?? "";
      });
    }
  }

  return data;
}
