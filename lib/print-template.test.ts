import { describe, expect, it } from "vitest";
import { buildPrintTemplateData, slugifyFieldName } from "./print-template";
import type { ProposalField, RequestInstance } from "./types";

describe("slugifyFieldName", () => {
  it("bỏ dấu tiếng Việt và thay khoảng trắng bằng gạch dưới", () => {
    expect(slugifyFieldName("Bộ Phận")).toBe("bo_phan");
    expect(slugifyFieldName("Tên đề xuất")).toBe("ten_de_xuat");
    expect(slugifyFieldName("chi tiết")).toBe("chi_tiet");
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
    expect(data.nhom_de_xuat).toBe("1. PDN Thiết Bị IT");
    expect(data.creator_name).toBe("Nguyễn Văn A");
    expect(data.status).toBe("Đang chờ duyệt");
  });

  it("lấy ${name} từ trường 'Tên đề xuất' nếu có, không thì dùng tên nhóm", () => {
    const titleField = makeField({ id: "f1", name: "Tên đề xuất" });
    const withField = makeRequest({
      fieldsSnapshot: [titleField],
      values: { f1: "Phòng hành chính nhân sự - IT 2" },
    });
    expect(buildPrintTemplateData(withField).name).toBe("Phòng hành chính nhân sự - IT 2");

    const withoutField = makeRequest({});
    expect(buildPrintTemplateData(withoutField).name).toBe("1. PDN Thiết Bị IT");
  });

  it("sinh khoá cho trường tuỳ chỉnh theo tên đã bỏ dấu", () => {
    const field = makeField({ id: "f2", name: "Bộ Phận" });
    const request = makeRequest({
      fieldsSnapshot: [field],
      values: { f2: "1. Phòng Hành chính Nhân sự - IT (HP Cons)" },
    });
    expect(buildPrintTemplateData(request).bo_phan).toBe(
      "1. Phòng Hành chính Nhân sự - IT (HP Cons)",
    );
  });

  it("sinh khoá cột dạng column.<khoa>.<so> từ dòng đầu tiên của trường Bảng", () => {
    const tableField = makeField({
      id: "f3",
      name: "chi tiết",
      dataType: "table",
      tableColumns: ["Tên thiết bị", "Số lượng"],
    });
    const request = makeRequest({
      fieldsSnapshot: [tableField],
      values: { f3: [{ cells: ["thùng PC", "1"] }, { cells: ["màn hình", "1"] }] },
    });
    const data = buildPrintTemplateData(request);
    expect(data["column.chi_tiet.0"]).toBe("thùng PC");
    expect(data["column.chi_tiet.1"]).toBe("1");
  });

  it("liệt kê người duyệt kèm trạng thái trong approvals_name_username_title_datetime", () => {
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

  it("khoá không tồn tại (VD chưa có trường) không làm crash, chỉ không xuất hiện trong data", () => {
    const request = makeRequest({});
    const data = buildPrintTemplateData(request);
    expect(data.ngay_de_nghi_cap).toBeUndefined();
  });
});
