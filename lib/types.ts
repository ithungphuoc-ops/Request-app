import type { ApproverState } from "./approval-logic";

export type ApprovalFlowType = "concurrent" | "sequential" | "single";

export const approvalFlowLabels: Record<ApprovalFlowType, string> = {
  concurrent: "Xử lý đồng thời",
  sequential: "Xử lý lần lượt",
  single: "Chỉ cần một người duyệt",
};

export const approvalFlowDescriptions: Record<ApprovalFlowType, string> = {
  concurrent:
    "Tất cả người duyệt có thể xử lý không theo thứ tự; đề xuất chỉ hoàn tất khi mọi người cần thiết đều chấp thuận.",
  sequential: "Người được xếp trước phải xử lý xong mới tới người tiếp theo.",
  single: "Một trong các người duyệt chấp thuận là đủ để hoàn tất bước duyệt.",
};

export interface TaggedUser {
  id: string;
  name: string;
  username: string;
  avatarInitial: string;
}

export interface ProposalField {
  id: string;
  name: string;
  dataType: FieldDataType;
  required: boolean;
  order: number;
  placeholder?: string;
  options?: string[];
  tableColumns?: string[];
  formula?: string;
}

export type FieldDataType =
  | "integer"
  | "decimal"
  | "short_text"
  | "paragraph"
  | "date"
  | "datetime"
  | "single_choice"
  | "multiple_choice"
  | "file"
  | "table"
  | "currency"
  | "formula"
  | "base_table"
  | "section_title";

export const fieldDataTypeLabels: Record<FieldDataType, string> = {
  integer: "Số nguyên",
  decimal: "Số thập phân",
  short_text: "Văn bản ngắn",
  paragraph: "Văn bản đoạn",
  date: "Ngày",
  datetime: "Ngày giờ",
  single_choice: "Một lựa chọn",
  multiple_choice: "Nhiều lựa chọn",
  file: "Tệp tin",
  table: "Bảng",
  currency: "Tiền tệ",
  formula: "Công thức",
  base_table: "Base Table",
  section_title: "Tiêu đề phân đoạn",
};

/**
 * Định nghĩa 1 bước duyệt của nhóm — "fixed" là một người cố định (giống
 * nhau cho mọi đề xuất); "submitter_manager" là quản lý trực tiếp/trưởng
 * đơn vị của CHÍNH NGƯỜI GỬI, được tra cứu lại (department.leaderId) tại
 * thời điểm gửi từng đề xuất — khác nhau tuỳ người gửi.
 */
export type ApproverStepDef =
  | { kind: "fixed"; user: TaggedUser }
  | { kind: "submitter_manager" };

export interface ProposalGroup {
  id: string;
  name: string;
  description: string;
  category: string;
  status: "active" | "closed";
  approvalFlow: ApprovalFlowType;
  slaHours: number | null;
  notifyManager: boolean;
  usedFor: TaggedUser[];
  approverSteps: ApproverStepDef[];
  followers: TaggedUser[];
  fields: ProposalField[];
  pinned: boolean;
  createdAt: string;
}

export interface CategoryGroup {
  id: string;
  code: string;
  name: string;
  groups: ProposalGroup[];
}

/**
 * "returned" (Đã trả lại) chưa có hành động riêng dựng trên UI (chưa xác
 * nhận chắc chắn từ đặc tả gốc — xem design.md Decision 7 / Open Questions).
 * Giữ chỗ trong type để không phải đổi schema lần 2 khi xác nhận xong.
 */
export type RequestStatus = "draft" | "pending" | "approved" | "rejected" | "returned";

export interface RequestSubmitter {
  uid: string;
  email: string;
  name: string;
}

export interface RequestHistoryEntry {
  at: string;
  actor: string;
  action: string;
  /** Người nhận khi action là chuyển tiếp. */
  target?: string;
  note?: string;
}

export interface RequestComment {
  id: string;
  authorUid: string;
  authorName: string;
  avatarInitial: string;
  text: string;
  at: string;
}

/**
 * Một đề xuất cụ thể đã gửi từ một nhóm (ProposalGroup), hoặc "Đề xuất trực
 * tiếp" (groupId null) — xem design.md Decision 10. Chụp lại field và người
 * duyệt tại thời điểm gửi (không tham chiếu sống tới nhóm gốc) để sửa nhóm
 * sau này không làm đổi hình dạng các đề xuất đang chờ xử lý — xem design.md
 * của change add-core-request-flow-and-hpcore-sso.
 */
export interface RequestInstance {
  id: string;
  /** Mã hiển thị cho người dùng — 6 chữ số, cấp khi gửi chính thức (null lúc còn nháp). */
  code: string | null;
  /** null = "Đề xuất trực tiếp", không gắn với nhóm/mẫu nào. */
  groupId: string | null;
  groupNameSnapshot: string;
  fieldsSnapshot: ProposalField[];
  values: Record<string, unknown>;
  submittedBy: RequestSubmitter;
  submittedAt: string;
  /** Cập nhật mỗi lần sửa nháp, gửi chính thức, hoặc có quyết định duyệt/chuyển tiếp. */
  updatedAt: string;
  approvalFlow: ApprovalFlowType;
  /** Thông tin hiển thị (tên/avatar) của người duyệt, cùng thứ tự với `approvers`. */
  approversSnapshot: TaggedUser[];
  /** Trạng thái quyết định — dùng nguyên với lib/approval-logic.ts, không đổi shape. */
  approvers: ApproverState[];
  followers: TaggedUser[];
  status: RequestStatus;
  /**
   * Hạn xử lý tính từ slaHours của nhóm tại thời điểm gửi; null nếu nhóm
   * không đặt SLA hoặc đề xuất còn là nháp. "Quá hạn" là nhãn tính lúc đọc
   * (status vẫn "pending"), không lưu thành trạng thái riêng.
   */
  deadlineAt: string | null;
  history: RequestHistoryEntry[];
  comments: RequestComment[];
}

export type ModalWindowStatus =
  | "closed"
  | "open"
  | "submitting"
  | "success"
  | "error";

export type FieldRowStatus = "normal" | "dragging" | "editing" | "invalid";

export type PermissionAssignmentStatus =
  | "unselected"
  | "selected"
  | "saving"
  | "saved"
  | "error";

export type ListLoadStatus = "loading" | "loaded" | "empty" | "error";

export type RequestListScope = "all" | "sent-to-me" | "mine" | "following" | "group";

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  before: string;
  after: string;
  at: string;
}
