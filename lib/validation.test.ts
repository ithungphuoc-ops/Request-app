import { describe, expect, it } from "vitest";
import {
  validateFieldCodeUnique,
  validateFieldName,
  validateFieldOptions,
  validateGroupName,
  validatePermissionSelection,
  validateSlaHours,
} from "./validation";

describe("validateGroupName", () => {
  it("báo lỗi khi tên trống", () => {
    expect(validateGroupName("").valid).toBe(false);
    expect(validateGroupName("   ").valid).toBe(false);
  });

  it("hợp lệ khi có tên", () => {
    expect(validateGroupName("Đề xuất xin nghỉ phép").valid).toBe(true);
  });
});

describe("validateSlaHours", () => {
  it("cho phép để trống", () => {
    expect(validateSlaHours(null).valid).toBe(true);
  });

  it("từ chối số âm", () => {
    expect(validateSlaHours(-5).valid).toBe(false);
  });

  it("chấp nhận số không âm", () => {
    expect(validateSlaHours(0).valid).toBe(true);
    expect(validateSlaHours(24).valid).toBe(true);
  });
});

describe("validateFieldName", () => {
  it("báo lỗi khi tên trường trống", () => {
    expect(validateFieldName("").valid).toBe(false);
  });

  it("hợp lệ khi có tên", () => {
    expect(validateFieldName("Số điện thoại").valid).toBe(true);
  });
});

describe("validateFieldOptions", () => {
  it("yêu cầu ít nhất một phương án cho kiểu một lựa chọn", () => {
    expect(validateFieldOptions("single_choice", []).valid).toBe(false);
    expect(validateFieldOptions("single_choice", ["  "]).valid).toBe(false);
    expect(validateFieldOptions("single_choice", ["Có"]).valid).toBe(true);
  });

  it("yêu cầu ít nhất một phương án cho kiểu nhiều lựa chọn", () => {
    expect(validateFieldOptions("multiple_choice", []).valid).toBe(false);
    expect(validateFieldOptions("multiple_choice", ["A", "B"]).valid).toBe(true);
  });

  it("không áp dụng cho các kiểu dữ liệu khác", () => {
    expect(validateFieldOptions("short_text", []).valid).toBe(true);
  });
});

describe("validateFieldCodeUnique", () => {
  it("báo lỗi khi mã trường đã tồn tại", () => {
    expect(validateFieldCodeUnique(["ten", "email"], "email").valid).toBe(false);
  });

  it("hợp lệ khi mã trường chưa tồn tại", () => {
    expect(validateFieldCodeUnique(["ten", "email"], "so_dien_thoai").valid).toBe(true);
  });
});

describe("validatePermissionSelection", () => {
  it("báo lỗi khi chưa chọn quyền nào", () => {
    expect(validatePermissionSelection([]).valid).toBe(false);
  });

  it("hợp lệ khi đã chọn ít nhất một quyền", () => {
    expect(validatePermissionSelection(["request.admin"]).valid).toBe(true);
  });
});
