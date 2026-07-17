import { describe, expect, it } from "vitest";
import {
  ApprovalActionError,
  applyApproverDecision,
  canApproverAct,
  forwardApprover,
  getRequestStatus,
  type ApproverState,
} from "./approval-logic";

function approvers(...ids: string[]): ApproverState[] {
  return ids.map((id) => ({ id, decision: "pending" as const }));
}

describe("Xử lý đồng thời (concurrent)", () => {
  it("cho phép mọi người duyệt thao tác bất kỳ lúc nào", () => {
    const list = approvers("a", "b", "c");
    expect(canApproverAct("concurrent", list, "a")).toBe(true);
    expect(canApproverAct("concurrent", list, "b")).toBe(true);
    expect(canApproverAct("concurrent", list, "c")).toBe(true);
  });

  it("chỉ hoàn tất khi TẤT CẢ người duyệt cần thiết đã chấp thuận", () => {
    let list = approvers("a", "b");
    list = applyApproverDecision("concurrent", list, "a", "approved");
    expect(getRequestStatus("concurrent", list)).toBe("pending");

    list = applyApproverDecision("concurrent", list, "b", "approved");
    expect(getRequestStatus("concurrent", list)).toBe("approved");
  });

  it("từ chối ngay khi có một người từ chối", () => {
    let list = approvers("a", "b");
    list = applyApproverDecision("concurrent", list, "b", "rejected");
    expect(getRequestStatus("concurrent", list)).toBe("rejected");
  });
});

describe("Xử lý lần lượt (sequential)", () => {
  it("chỉ người đầu tiên còn pending theo thứ tự được phép thao tác", () => {
    const list = approvers("a", "b", "c");
    expect(canApproverAct("sequential", list, "a")).toBe(true);
    expect(canApproverAct("sequential", list, "b")).toBe(false);
    expect(canApproverAct("sequential", list, "c")).toBe(false);
  });

  it("người thứ hai chỉ được thao tác sau khi người đầu đã xử lý xong", () => {
    let list = approvers("a", "b", "c");
    list = applyApproverDecision("sequential", list, "a", "approved");

    expect(canApproverAct("sequential", list, "b")).toBe(true);
    expect(canApproverAct("sequential", list, "c")).toBe(false);
  });

  it("ném lỗi nếu người chưa tới lượt cố thao tác", () => {
    const list = approvers("a", "b");
    expect(() => applyApproverDecision("sequential", list, "b", "approved")).toThrow(
      ApprovalActionError,
    );
  });

  it("hoàn tất khi tất cả đã duyệt theo đúng thứ tự", () => {
    let list = approvers("a", "b");
    list = applyApproverDecision("sequential", list, "a", "approved");
    list = applyApproverDecision("sequential", list, "b", "approved");
    expect(getRequestStatus("sequential", list)).toBe("approved");
  });
});

describe("Chỉ cần một người duyệt (single)", () => {
  it("hoàn tất ngay khi một người hợp lệ chấp thuận", () => {
    let list = approvers("a", "b", "c");
    list = applyApproverDecision("single", list, "b", "approved");
    expect(getRequestStatus("single", list)).toBe("approved");
  });

  it("chỉ từ chối khi tất cả đều từ chối", () => {
    let list = approvers("a", "b");
    list = applyApproverDecision("single", list, "a", "rejected");
    expect(getRequestStatus("single", list)).toBe("pending");

    list = applyApproverDecision("single", list, "b", "rejected");
    expect(getRequestStatus("single", list)).toBe("rejected");
  });

  it("ai cũng có thể thao tác trước khi có người chấp thuận", () => {
    const list = approvers("a", "b");
    expect(canApproverAct("single", list, "a")).toBe(true);
    expect(canApproverAct("single", list, "b")).toBe(true);
  });
});

describe("Ràng buộc chung", () => {
  it("không cho một người duyệt thao tác hai lần", () => {
    let list = approvers("a");
    list = applyApproverDecision("concurrent", list, "a", "approved");
    expect(() => applyApproverDecision("concurrent", list, "a", "approved")).toThrow(
      ApprovalActionError,
    );
  });
});

describe("Chuyển tiếp (forwardApprover)", () => {
  it("đồng thời: thay đúng người, giữ pending, không đổi người khác", () => {
    const list = approvers("a", "b");
    const result = forwardApprover("concurrent", list, "a", "z");
    expect(result).toEqual([
      { id: "z", decision: "pending" },
      { id: "b", decision: "pending" },
    ]);
  });

  it("lần lượt: người mới kế thừa đúng lượt của người cũ (giữ vị trí)", () => {
    const list = approvers("a", "b", "c");
    const result = forwardApprover("sequential", list, "a", "z");
    expect(canApproverAct("sequential", result, "z")).toBe(true);
    expect(canApproverAct("sequential", result, "b")).toBe(false);
    expect(canApproverAct("sequential", result, "c")).toBe(false);
  });

  it("lần lượt: không cho chuyển tiếp khi chưa tới lượt", () => {
    const list = approvers("a", "b");
    expect(() => forwardApprover("sequential", list, "b", "z")).toThrow(
      ApprovalActionError,
    );
  });

  it("không cho chuyển tiếp cho người đã có trong danh sách duyệt", () => {
    const list = approvers("a", "b");
    expect(() => forwardApprover("concurrent", list, "a", "b")).toThrow(
      ApprovalActionError,
    );
  });

  it("không cho chuyển tiếp khi người chuyển đã quyết định rồi", () => {
    let list = approvers("a", "b");
    list = applyApproverDecision("concurrent", list, "a", "approved");
    expect(() => forwardApprover("concurrent", list, "a", "z")).toThrow(
      ApprovalActionError,
    );
  });

  it("một người duyệt: chuyển tiếp không làm mất khả năng hoàn tất của người còn lại", () => {
    const list = approvers("a", "b");
    const result = forwardApprover("single", list, "a", "z");
    const afterApprove = applyApproverDecision("single", result, "z", "approved");
    expect(getRequestStatus("single", afterApprove)).toBe("approved");
  });
});
