import { describe, expect, it } from "vitest";
import {
  ApprovalActionError,
  applyApproverDecision,
  canApproverAct,
  dedupeApprovers,
  forwardApprover,
  getRequestStatus,
  missingRequiredNote,
  type ApproverState,
} from "./approval-logic";
import type { TaggedUser } from "./types";

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

describe("missingRequiredNote", () => {
  it("rejected luôn bắt buộc ghi chú, không phụ thuộc cấu hình nhóm", () => {
    expect(missingRequiredNote("rejected", undefined, undefined)).toBe(true);
    expect(missingRequiredNote("rejected", "  ", undefined)).toBe(true);
    expect(missingRequiredNote("rejected", "Lý do", undefined)).toBe(false);
  });

  it("returned luôn bắt buộc ghi chú, không phụ thuộc cấu hình nhóm", () => {
    expect(missingRequiredNote("returned", undefined, { approve: true })).toBe(true);
    expect(missingRequiredNote("returned", "Lý do", undefined)).toBe(false);
  });

  it("approved không bắt buộc khi nhóm chưa bật cờ", () => {
    expect(missingRequiredNote("approved", undefined, undefined)).toBe(false);
    expect(missingRequiredNote("approved", undefined, { approve: false })).toBe(false);
  });

  it("approved bắt buộc khi nhóm bật cờ approve", () => {
    expect(missingRequiredNote("approved", undefined, { approve: true })).toBe(true);
    expect(missingRequiredNote("approved", "Ok", { approve: true })).toBe(false);
  });

  it("forwarded không bắt buộc khi nhóm chưa bật cờ", () => {
    expect(missingRequiredNote("forwarded", undefined, undefined)).toBe(false);
  });

  it("forwarded bắt buộc khi nhóm bật cờ forward", () => {
    expect(missingRequiredNote("forwarded", undefined, { forward: true })).toBe(true);
    expect(missingRequiredNote("forwarded", "Chuyển", { forward: true })).toBe(false);
  });
});

function user(id: string): TaggedUser {
  return { id, name: id, username: id, avatarInitial: id[0] };
}

describe("dedupeApprovers", () => {
  it("giữ nguyên khi không ai trùng", () => {
    const list = [user("a"), user("b"), user("c")];
    expect(dedupeApprovers(list)).toEqual(list);
  });

  it("người trùng 2 bước chỉ giữ 1 lần, ở vị trí lần xuất hiện sau cùng", () => {
    const [a, b] = [user("a"), user("b")];
    const result = dedupeApprovers([a, b, a]);
    expect(result).toEqual([b, a]);
  });

  it("trùng nhiều id khác nhau xen kẽ vẫn đúng thứ tự theo lần cuối", () => {
    const [a, b, c] = [user("a"), user("b"), user("c")];
    // a(0) b(1) c(2) a(3) b(4) -> giữ c(2), a(3), b(4) theo đúng thứ tự đó
    const result = dedupeApprovers([a, b, c, a, b]);
    expect(result.map((u) => u.id)).toEqual(["c", "a", "b"]);
  });

  it("danh sách rỗng trả về rỗng", () => {
    expect(dedupeApprovers([])).toEqual([]);
  });
});
