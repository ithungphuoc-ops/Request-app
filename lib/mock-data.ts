import type {
  ApproverStepDef,
  AuditEntry,
  CategoryGroup,
  ProposalField,
  ProposalGroup,
  TaggedUser,
} from "./types";

function user(id: string, name: string, username: string): TaggedUser {
  return { id, name, username, avatarInitial: name.charAt(0) };
}

function fixedStep(u: TaggedUser): ApproverStepDef {
  return { kind: "fixed", user: u };
}

const hr = user("u1", "Trần Văn Long", "long.tran");
const finance = user("u2", "Lê Minh Anh", "anh.le");
const ceo = user("u3", "Nguyễn Quốc Bảo", "bao.nguyen");
const sales = user("u4", "Phạm Đức Duy", "duy.pham");

const leaveFields: ProposalField[] = [
  { id: "f1", name: "Loại nghỉ phép", dataType: "single_choice", required: true, order: 1, options: ["Nghỉ phép năm", "Nghỉ không lương", "Nghỉ ốm"] },
  { id: "f2", name: "Từ ngày", dataType: "date", required: true, order: 2 },
  { id: "f3", name: "Đến ngày", dataType: "date", required: true, order: 3 },
  { id: "f4", name: "Lý do", dataType: "paragraph", required: false, order: 4 },
];

const paymentFields: ProposalField[] = [
  { id: "f5", name: "Số tiền đề nghị", dataType: "currency", required: true, order: 1 },
  { id: "f6", name: "Nội dung thanh toán", dataType: "short_text", required: true, order: 2 },
  { id: "f7", name: "Chứng từ đính kèm", dataType: "file", required: false, order: 3 },
];

export const proposalGroups: ProposalGroup[] = [
  {
    id: "g1",
    name: "Đề xuất xin nghỉ phép",
    description: "Dùng khi nhân viên cần xin nghỉ phép năm, nghỉ không lương hoặc nghỉ ốm.",
    category: "sales",
    status: "active",
    approvalFlow: "sequential",
    slaHours: 24,
    notifyManager: true,
    usedFor: [],
    approverSteps: [fixedStep(hr)],
    followers: [ceo],
    fields: leaveFields,
    pinned: true,
    createdAt: "2022-06-01",
  },
  {
    id: "g2",
    name: "Đề xuất thanh toán",
    description: "Đề nghị thanh toán chi phí phát sinh trong quá trình làm việc.",
    category: "sales",
    status: "active",
    approvalFlow: "concurrent",
    slaHours: 48,
    notifyManager: false,
    usedFor: [],
    approverSteps: [fixedStep(finance), fixedStep(ceo)],
    followers: [],
    fields: paymentFields,
    pinned: false,
    createdAt: "2022-06-02",
  },
  {
    id: "g3",
    name: "Đề xuất mua hàng",
    description: "Đề nghị mua sắm thiết bị, vật tư phục vụ công việc.",
    category: "purchasing",
    status: "active",
    approvalFlow: "single",
    slaHours: 72,
    notifyManager: true,
    usedFor: [sales],
    approverSteps: [fixedStep(finance), fixedStep(hr)],
    followers: [],
    fields: [],
    pinned: false,
    createdAt: "2022-06-03",
  },
  {
    id: "g4",
    name: "Đề xuất công tác",
    description: "Đăng ký đi công tác trong và ngoài nước.",
    category: "purchasing",
    status: "closed",
    approvalFlow: "sequential",
    slaHours: null,
    notifyManager: true,
    usedFor: [],
    approverSteps: [fixedStep(hr), fixedStep(ceo)],
    followers: [],
    fields: [],
    pinned: false,
    createdAt: "2022-06-04",
  },
];

export const categoryGroups: CategoryGroup[] = [
  {
    id: "c1",
    code: "01",
    name: "Phòng Kinh Doanh",
    groups: proposalGroups.filter((g) => g.category === "sales"),
  },
  {
    id: "c2",
    code: "02",
    name: "Phòng Mua Hàng",
    groups: proposalGroups.filter((g) => g.category === "purchasing"),
  },
];

export const auditHistory: AuditEntry[] = [];

export const categoryOptions = ["Phòng Kinh Doanh", "Phòng Mua Hàng", "Phòng Nhân Sự", "Phòng Kế Toán"];

export const groupTemplates = [
  { id: "t1", name: "Đề xuất xin nghỉ phép" },
  { id: "t2", name: "Đề xuất thanh toán" },
  { id: "t3", name: "Đề xuất mua hàng" },
  { id: "t4", name: "Đề xuất công tác" },
];
