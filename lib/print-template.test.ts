import { describe, expect, it } from "vitest";
import { buildPrintTemplateData, ensureFieldCodes, slugifyFieldName } from "./print-template";
import type { ProposalField, RequestInstance } from "./types";

describe("slugifyFieldName", () => {
  it("bỏ dấu tiếng Việt và thay khoảng trắng bằng gạch dưới", () => {
    expect(slugifyFieldName("Bộ Phận")).toBe("bo_phan");
    expect(slugifyFieldName("Tên đề xuất")).toBe("ten_de_xuat");
    expect(slugifyFieldName("chi tiết")).toBe("chi_tiet");
  });
});

describe("ensureFieldCodes", () => {
  it("sinh code từ tên cho field chưa có, không đổi code đã có sẵn", () => {
    const fields: ProposalField[] = [
      { id: "f1", name: "Bộ Phận", dataType: "short_text", required: false, order: 1 },
      {
        id: "f2",
        name: "Tên khác hẳn",
        dataType: "short_text",
        required: false,
        order: 2,
        code: "bo_phan",
      },
    ];
    const { fields: result, changed } = ensureFieldCodes(fields);
    expect(changed).toBe(true);
    // f2 đã có code "bo_phan" từ trước -> f1 (trùng slug) phải nhường, lấy hậu tố _2.
    expect(result[0].code).toBe("bo_phan_2");
    expect(result[1].code).toBe("bo_phan");
  });

  it("không đổi gì và changed=false nếu mọi field đã có code", () => {
    const fields: ProposalField[] = [
      { id: "f1", name: "A", dataType: "short_text", required: false, order: 1, code: "a" },
    ];
    const { fields: result, changed } = ensureFieldCodes(fields);
    expect(changed).toBe(false);
    expect(result[0].code).toBe("a");
  });

  it("đổi tên field sau khi đã có code KHÔNG làm đổi code", () => {
    const fields: ProposalField[] = [
      {
        id: "f1",
        name: "Tên đã đổi",
        dataType: "short_text",
        required: false,
        order: 1,
        code: "ten_ban_dau",
      },
    ];
    const { fields: result } = ensureFieldCodes(fields);
    expect(result[0].code).toBe("ten_ban_dau");
  });
});

function makeField(overrides: Partial<ProposalField>): ProposalField {
  return {
    id: overrides.id ?? "f1",
    name: overrides.name ?? "Trường",
    dataType: overrides.dataType ?? "short_text",
    required: overrides.required ?? false,
    order: overrides.order ?? 1,
    ...overrides,
  } as ProposalField;
}

function makeRequest(overrides: Partial<RequestInstance>): RequestInstance {
  return {
    id: "req1",
    code: "000123",
    groupId: "g1",
    groupNameSnapshot: "1. PDN Thiết Bị IT",
    fieldsSnapshot: [],
    values: {},
    submittedBy: { uid: "u1", email: "a@hpcons.com.vn", name: "Nguyễn Văn A" },
    submittedAt: "2026-07-20T01:00:00.000Z",
    updatedAt: "2026-07-20T01:00:00.000Z",
    approvalFlow: "sequential",
    approversSnapshot: [],
    approvers: [],
    followers: [],
    status: "pending",
    deadlineAt: null,
    history: [],
    comments: [],
    deletedAt: null,
    ...overrides,
  } as RequestInstance;
}

describe("buildPrintTemplateData", () => {
  it("điền đúng các khoá hệ thống", () => {
    const request = makeRequest({});
    const data = buildPrintTemplateData(request);
    expect(data.id).toBe("000123");
    expect(data.group_name).toBe("1. PDN Thiết Bị IT");
    expect(data.nhom_de_xuat).toBe("1. PDN Thiết Bị IT"); // alias tương thích mẫu cũ
    expect(data.creator_name).toBe("Nguyễn Văn A");
    expect(data.creator_username).toBe("a");
    expect(data.company.length).toBeGreaterThan(0);
    expect(data.creator_title).toBe("");
    expect(data.status).toBe("Đang chờ duyệt");
  });

  it("lấy ${name} từ trường có code 'ten_de_xuat' nếu có, không thì dùng tên nhóm", () => {
    const titleField = makeField({ id: "f1", name: "Tên đề xuất", code: "ten_de_xuat" });
    const withField = makeRequest({
      fieldsSnapshot: [titleField],
      values: { f1: "Phòng hành chính nhân sự - IT 2" },
    });
    expect(buildPrintTemplateData(withField).name).toBe("Phòng hành chính nhân sự - IT 2");

    const withoutField = makeRequest({});
    expect(buildPrintTemplateData(withoutField).name).toBe("1. PDN Thiết Bị IT");
  });

  it("sinh khoá cho trường tuỳ chỉnh theo CODE (không phải slug tên hiện tại)", () => {
    const field = makeField({ id: "f2", name: "Tên đã đổi khác hẳn", code: "bo_phan" });
    const request = makeRequest({
      fieldsSnapshot: [field],
      values: { f2: "1. Phòng Hành chính Nhân sự - IT (HP Cons)" },
    });
    expect(buildPrintTemplateData(request).bo_phan).toBe(
      "1. Phòng Hành chính Nhân sự - IT (HP Cons)",
    );
  });

  it("liệt kê người duyệt kèm trạng thái trong approvals_name_username_title_datetime (khối gộp cũ)", () => {
    const request = makeRequest({
      approversSnapshot: [
        { id: "u2", name: "Trần Thị B", username: "tranthib", avatarInitial: "T" },
      ],
      approvers: [{ id: "u2", decision: "approved" }],
      history: [{ at: "2026-07-20T02:00:00.000Z", actor: "Trần Thị B", action: "Đã chấp thuận" }],
    });
    const block = buildPrintTemplateData(request).approvals_name_username_title_datetime;
    expect(block).toContain("Trần Thị B (tranthib)");
    expect(block).toContain("Đã chấp thuận");
  });

  it("approval_name_1/2 + approval_note đúng thứ tự thực tế, tối đa 20 người", () => {
    const request = makeRequest({
      approversSnapshot: [
        { id: "u1", name: "Người A", username: "nguoia", avatarInitial: "A" },
        { id: "u2", name: "Người B", username: "nguoib", avatarInitial: "B" },
      ],
      approvers: [
        { id: "u1", decision: "approved" },
        { id: "u2", decision: "pending" },
      ],
      history: [
        { at: "2026-07-20T02:00:00.000Z", actor: "Người A", action: "Đã chấp thuận", note: "OK" },
      ],
    });
    const data = buildPrintTemplateData(request);
    expect(data.approval_name_1).toBe("Người A");
    expect(data.approval_note_1).toBe("OK");
    expect(data.approval_name_2).toBe("Người B");
    expect(data.approval_datetime_2).toBe(""); // chưa xử lý -> để trống
    expect(data.approval_title_1).toBe(""); // chưa có dữ liệu chức vụ -> luôn trống
  });

  it("approval_final_* chỉ có giá trị khi status đã approved, lấy đúng người duyệt CUỐI", () => {
    const approvedRequest = makeRequest({
      status: "approved",
      approversSnapshot: [
        { id: "u1", name: "Người A", username: "nguoia", avatarInitial: "A" },
        { id: "u2", name: "Người B", username: "nguoib", avatarInitial: "B" },
      ],
      approvers: [
        { id: "u1", decision: "approved" },
        { id: "u2", decision: "approved" },
      ],
      history: [
        { at: "2026-07-20T02:00:00.000Z", actor: "Người A", action: "Đã chấp thuận" },
        { at: "2026-07-20T03:00:00.000Z", actor: "Người B", action: "Đã chấp thuận", note: "Duyệt cuối" },
      ],
    });
    const data = buildPrintTemplateData(approvedRequest);
    expect(data.approval_final_name).toBe("Người B");
    expect(data.approval_final_note).toBe("Duyệt cuối");

    const pendingRequest = makeRequest({ status: "pending" });
    expect(buildPrintTemplateData(pendingRequest).approval_final_name).toBe("");
  });

  it("rejection_* chỉ có giá trị khi status đã rejected", () => {
    const rejectedRequest = makeRequest({
      status: "rejected",
      approversSnapshot: [{ id: "u1", name: "Người A", username: "nguoia", avatarInitial: "A" }],
      approvers: [{ id: "u1", decision: "rejected" }],
      history: [
        { at: "2026-07-20T02:00:00.000Z", actor: "Người A", action: "Đã từ chối", note: "Thiếu chứng từ" },
      ],
    });
    const data = buildPrintTemplateData(rejectedRequest);
    expect(data.rejection_name).toBe("Người A");
    expect(data.rejection_note).toBe("Thiếu chứng từ");

    const approvedRequest = makeRequest({ status: "approved" });
    expect(buildPrintTemplateData(approvedRequest).rejection_name).toBe("");
  });

  it("khoá không tồn tại (VD chưa có trường) không làm crash, chỉ không xuất hiện trong data", () => {
    const request = makeRequest({});
    const data = buildPrintTemplateData(request);
    expect(data.ngay_de_nghi_cap).toBeUndefined();
  });
});
