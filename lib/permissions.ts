import type { TaggedUser } from "./types";

/**
 * Vai trò TOÀN CỤC của app tổng hpcons-portal (users/{uid}.role) — dùng thẳng,
 * không có hệ vai trò riêng cho app này. Quyết định: owner/admin quản lý
 * nhóm đề xuất; manager/employee chỉ xem nhóm + gửi đề xuất. Không cần bước
 * gán quyền riêng qua app_permissions — ai đã là owner/admin ở app tổng thì
 * có quyền ngay, không phải chờ hpcore cấp thêm.
 */
export type Role = "owner" | "admin" | "manager" | "employee";

export interface ScopeUser {
  userId: string;
  groupIds: string[];
}

/** Chỉ Owner hoặc Admin (vai trò toàn cục app tổng) được tạo/cấu hình nhóm đề xuất. */
export function canManageGroupsAtAppScope(role: Role): boolean {
  return role === "owner" || role === "admin";
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
