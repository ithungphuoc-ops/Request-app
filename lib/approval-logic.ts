import type { ApprovalFlowType, TaggedUser } from "./types";

export type ApproverDecision = "pending" | "approved" | "rejected";

export interface ApproverState {
  id: string;
  decision: ApproverDecision;
}

/**
 * Xác định người duyệt có được phép thao tác ngay bây giờ hay không.
 * - Đồng thời / một người duyệt: ai cũng có thể thao tác bất kỳ lúc nào (miễn còn "pending").
 * - Lần lượt: chỉ người đầu tiên còn "pending" theo thứ tự được phép thao tác (§5.3 quy tắc 3).
 */
export function canApproverAct(
  flow: ApprovalFlowType,
  approvers: ApproverState[],
  approverId: string,
): boolean {
  const approver = approvers.find((a) => a.id === approverId);
  if (!approver || approver.decision !== "pending") return false;

  if (flow !== "sequential") return true;

  const firstPendingIndex = approvers.findIndex((a) => a.decision === "pending");
  return approvers[firstPendingIndex]?.id === approverId;
}

/**
 * Trạng thái tổng thể của đề xuất dựa theo kiểu quy trình xử lý.
 * - Đồng thời: hoàn tất khi TẤT CẢ đã "approved"; hỏng ngay khi có một "rejected".
 * - Lần lượt: giống đồng thời về điều kiện hoàn tất/từ chối, nhưng thứ tự thao tác bị khóa bởi canApproverAct.
 * - Một người duyệt: hoàn tất ngay khi có MỘT approved; chỉ "rejected" khi tất cả đều từ chối.
 */
export function getRequestStatus(
  flow: ApprovalFlowType,
  approvers: ApproverState[],
): "pending" | "approved" | "rejected" {
  if (approvers.length === 0) return "pending";

  if (flow === "single") {
    if (approvers.some((a) => a.decision === "approved")) return "approved";
    if (approvers.every((a) => a.decision === "rejected")) return "rejected";
    return "pending";
  }

  // concurrent & sequential dùng chung điều kiện hoàn tất/từ chối
  if (approvers.some((a) => a.decision === "rejected")) return "rejected";
  if (approvers.every((a) => a.decision === "approved")) return "approved";
  return "pending";
}

/**
 * Loại người trùng khi cùng 1 người được nhiều bước duyệt cùng chọn (vd vừa
 * là "Quản lý trực tiếp" vừa là "Trưởng phòng") — chỉ giữ 1 lần, ở VỊ TRÍ
 * CỦA LẦN XUẤT HIỆN SAU CÙNG (đúng tuỳ chọn "Ưu tiên vai trò của khối xuất
 * hiện sau cùng nhất" của Base.vn) để thứ tự duyệt "Lần lượt" phản ánh đúng
 * bước sau cùng thay vì bước đầu tiên trùng người. Áp dụng TRƯỚC khi build
 * approversSnapshot/approvers ban đầu — không đổi shape ApproverState.
 */
export function dedupeApprovers(users: TaggedUser[]): TaggedUser[] {
  const lastIndexById = new Map<string, number>();
  users.forEach((u, i) => lastIndexById.set(u.id, i));
  return users.filter((u, i) => lastIndexById.get(u.id) === i);
}

export class ApprovalActionError extends Error {}

/**
 * Xác định 1 hành động duyệt có đang THIẾU ghi chú bắt buộc hay không —
 * "rejected"/"returned" LUÔN bắt buộc (không phụ thuộc cấu hình nhóm, giữ
 * đúng hành vi cũ); "approved"/"forwarded" chỉ bắt buộc khi nhóm bật cờ
 * tương ứng trong `requireDecisionNote`. Trả về true = còn thiếu (chặn),
 * false = đủ điều kiện tiếp tục.
 */
export function missingRequiredNote(
  decision: "approved" | "rejected" | "forwarded" | "returned",
  note: string | undefined,
  requireDecisionNote: { approve?: boolean; forward?: boolean } | undefined,
): boolean {
  const hasNote = Boolean(note?.trim());
  if (decision === "rejected" || decision === "returned") return !hasNote;
  if (decision === "approved") return Boolean(requireDecisionNote?.approve) && !hasNote;
  if (decision === "forwarded") return Boolean(requireDecisionNote?.forward) && !hasNote;
  return false;
}

/**
 * Chuyển tiếp quyền xử lý của một người duyệt sang người khác, giữ nguyên vị
 * trí trong thứ tự (quan trọng với quy trình lần lượt: người mới kế thừa
 * đúng lượt của người cũ) và trạng thái "pending" tại vị trí đó.
 * Ném lỗi nếu người chuyển chưa tới lượt/đã quyết định, hoặc người nhận đã
 * có mặt trong danh sách người duyệt.
 */
export function forwardApprover(
  flow: ApprovalFlowType,
  approvers: ApproverState[],
  fromApproverId: string,
  toApproverId: string,
): ApproverState[] {
  if (!canApproverAct(flow, approvers, fromApproverId)) {
    throw new ApprovalActionError(
      `Người duyệt ${fromApproverId} chưa tới lượt hoặc đã xử lý đề xuất này.`,
    );
  }
  if (approvers.some((a) => a.id === toApproverId)) {
    throw new ApprovalActionError(
      `${toApproverId} đã có mặt trong danh sách người duyệt của đề xuất này.`,
    );
  }

  return approvers.map((a) =>
    a.id === fromApproverId ? { id: toApproverId, decision: "pending" } : a,
  );
}

/**
 * Áp dụng quyết định của một người duyệt, tôn trọng ràng buộc thứ tự của quy trình lần lượt.
 * Ném lỗi nếu người này chưa tới lượt hoặc đã quyết định rồi.
 */
export function applyApproverDecision(
  flow: ApprovalFlowType,
  approvers: ApproverState[],
  approverId: string,
  decision: "approved" | "rejected",
): ApproverState[] {
  if (!canApproverAct(flow, approvers, approverId)) {
    throw new ApprovalActionError(
      `Người duyệt ${approverId} chưa tới lượt hoặc đã xử lý đề xuất này.`,
    );
  }

  return approvers.map((a) => (a.id === approverId ? { ...a, decision } : a));
}
