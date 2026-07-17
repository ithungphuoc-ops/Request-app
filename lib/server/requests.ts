import "server-only";
import type { ApproverState } from "@/lib/approval-logic";
import { getHpcoreDb } from "@/lib/hpcore";
import type { ApproverStepDef, ProposalField, ProposalGroup, TaggedUser } from "@/lib/types";

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

/** Ném khi không xác định được người duyệt bước "quản lý phòng ban người gửi". */
export class MissingApproverError extends Error {}

/**
 * Tra cứu trưởng đơn vị của CHÍNH NGƯỜI GỬI (users/{uid}.departmentId →
 * departments/{id}.leaderId) trong Firestore app tổng. Ném MissingApproverError
 * nếu người gửi chưa có phòng ban, hoặc phòng ban chưa có trưởng đơn vị —
 * quyết định: chặn gửi rõ ràng thay vì âm thầm bỏ qua bước duyệt.
 */
async function resolveSubmitterManager(submitterUid: string): Promise<TaggedUser> {
  const userSnap = await getHpcoreDb().collection("users").doc(submitterUid).get();
  const departmentId = userSnap.data()?.departmentId as string | null | undefined;
  if (!departmentId) {
    throw new MissingApproverError(
      "Bạn chưa thuộc phòng ban nào nên không xác định được người duyệt (quản lý phòng ban). Liên hệ admin để được gán phòng ban.",
    );
  }

  const deptSnap = await getHpcoreDb().collection("departments").doc(departmentId).get();
  const leaderId = deptSnap.data()?.leaderId as string | null | undefined;
  if (!leaderId) {
    throw new MissingApproverError(
      "Phòng ban của bạn chưa có trưởng đơn vị nên không xác định được người duyệt. Liên hệ admin để gán trưởng đơn vị.",
    );
  }

  const leaderSnap = await getHpcoreDb().collection("users").doc(leaderId).get();
  const leaderData = leaderSnap.data();
  if (!leaderSnap.exists || !leaderData) {
    throw new MissingApproverError(
      "Không tìm thấy hồ sơ trưởng đơn vị của phòng ban bạn. Liên hệ admin.",
    );
  }

  const fullName = (leaderData.fullName as string | undefined)?.trim() || leaderId;
  const email = (leaderData.email as string | undefined) ?? "";
  return {
    id: leaderId,
    name: fullName,
    username: email ? email.split("@")[0] : leaderId,
    avatarInitial: fullName.charAt(0).toUpperCase(),
  };
}

/**
 * Phân giải danh sách bước duyệt của nhóm thành danh sách người duyệt cụ thể
 * tại thời điểm gửi đề xuất — "fixed" giữ nguyên, "submitter_manager" tra
 * cứu lại theo phòng ban của người gửi (kết quả SNAPSHOT vào đề xuất, không
 * tự đổi nếu trưởng đơn vị đổi sau này).
 */
export async function resolveApproverSteps(
  steps: ApproverStepDef[],
  submitterUid: string,
): Promise<TaggedUser[]> {
  const resolved: TaggedUser[] = [];
  for (const step of steps) {
    resolved.push(step.kind === "fixed" ? step.user : await resolveSubmitterManager(submitterUid));
  }
  return resolved;
}
