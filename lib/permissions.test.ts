import { describe, expect, it } from "vitest";
import { canManageGroupsAtAppScope, isFollowerAllowedToApprove, isWithinUsedForScope } from "./permissions";
import type { TaggedUser } from "./types";

const alice: TaggedUser = { id: "u1", name: "Alice", username: "alice", avatarInitial: "A" };
const bob: TaggedUser = { id: "u2", name: "Bob", username: "bob", avatarInitial: "B" };

describe("canManageGroupsAtAppScope", () => {
  it("chỉ owner và app_admin được quản lý ở mức toàn ứng dụng", () => {
    expect(canManageGroupsAtAppScope("owner")).toBe(true);
    expect(canManageGroupsAtAppScope("app_admin")).toBe(true);
    expect(canManageGroupsAtAppScope("admin")).toBe(false);
    expect(canManageGroupsAtAppScope("member")).toBe(false);
  });
});

describe("isWithinUsedForScope", () => {
  it("để trống usedFor nghĩa là toàn công ty được dùng", () => {
    expect(isWithinUsedForScope([], { userId: "anyone", groupIds: [] })).toBe(true);
  });

  it("cho phép người dùng có id nằm trong usedFor", () => {
    expect(isWithinUsedForScope([alice], { userId: "u1", groupIds: [] })).toBe(true);
    expect(isWithinUsedForScope([alice], { userId: "u2", groupIds: [] })).toBe(false);
  });

  it("cho phép người dùng thuộc nhóm nằm trong usedFor", () => {
    expect(isWithinUsedForScope([bob], { userId: "u1", groupIds: ["u2"] })).toBe(true);
  });
});

describe("isFollowerAllowedToApprove", () => {
  it("người theo dõi không tự động có quyền duyệt", () => {
    expect(isFollowerAllowedToApprove()).toBe(false);
  });
});
