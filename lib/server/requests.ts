import "server-only";
import type { ApproverState } from "@/lib/approval-logic";
import type { ProposalField, ProposalGroup, TaggedUser } from "@/lib/types";

export function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Trường bắt buộc còn thiếu giá trị — dùng khi gửi chính thức (không dùng khi lưu nháp). */
export function findMissingRequiredFields(
  fields: ProposalField[],
  values: Record<string, unknown>,
): ProposalField[] {
  return fields.filter((f) => f.required && isEmptyValue(values?.[f.id]));
}

/** Khởi tạo approvers "pending" theo đúng thứ tự của danh sách người duyệt. */
export function buildInitialApprovers(approvers: TaggedUser[]): ApproverState[] {
  return approvers.map((a) => ({ id: a.id, decision: "pending" as const }));
}

/** Hạn xử lý = thời điểm gửi + slaHours giờ; null nếu nhóm không đặt SLA. */
export function computeDeadline(slaHours: number | null, from: Date): string | null {
  if (slaHours === null || slaHours === undefined) return null;
  return new Date(from.getTime() + slaHours * 60 * 60 * 1000).toISOString();
}

/** true nếu đề xuất đang pending và đã qua deadlineAt — nhãn phái sinh, không lưu. */
export function isOverdue(status: string, deadlineAt: string | null, now = new Date()): boolean {
  if (status !== "pending" || !deadlineAt) return false;
  return new Date(deadlineAt).getTime() < now.getTime();
}

export function toProposalGroup(id: string, data: Record<string, unknown>): ProposalGroup {
  return { id, ...(data as Omit<ProposalGroup, "id">) };
}
