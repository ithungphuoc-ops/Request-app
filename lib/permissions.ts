import type { TaggedUser } from "./types";

export type Role = "owner" | "app_admin" | "admin" | "member";

export interface ScopeUser {
  userId: string;
  groupIds: string[];
}

/**
 * §5.3 quy tắc 1: chỉ Owner hoặc App Admin được tạo/cấu hình nhóm ở mức toàn ứng dụng.
 */
export function canManageGroupsAtAppScope(role: Role): boolean {
  return role === "owner" || role === "app_admin";
}

/**
 * §5.3 quy tắc 2: người dùng chỉ nhìn thấy/tạo đề xuất trong nhóm nằm trong phạm vi "Sử dụng cho".
 * usedFor rỗng nghĩa là toàn công ty được dùng.
 */
export function isWithinUsedForScope(
  usedFor: TaggedUser[],
  user: ScopeUser,
): boolean {
  if (usedFor.length === 0) return true;
  const usedForIds = new Set(usedFor.map((u) => u.id));
  if (usedForIds.has(user.userId)) return true;
  return user.groupIds.some((id) => usedForIds.has(id));
}

/**
 * §5.3 quy tắc 4: người theo dõi được xem/nhận cập nhật nhưng không tự động có quyền duyệt.
 */
export function isFollowerAllowedToApprove(): boolean {
  return false;
}
