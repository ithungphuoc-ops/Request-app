import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SSO_COOKIE_NAME, getHpcoreDb, hpcoreLoginUrl, verifyHpcore } from "@/lib/hpcore";
import { canManageGroupsAtAppScope, type Role } from "@/lib/permissions";

export interface Session {
  uid: string;
  email: string;
  name: string;
  role: Role;
  /** Ảnh đại diện đồng bộ trực tiếp từ users/{uid}.avatarUrl (app tổng) — đọc
   * sống mỗi lần xác minh phiên, null nếu app tổng chưa có ảnh. */
  avatarUrl: string | null;
}

const VALID_ROLES: readonly Role[] = ["owner", "admin", "manager", "employee"];

/**
 * Đọc thẳng hồ sơ users/{uid} của app tổng — vai trò TOÀN CỤC (không phải
 * per-app), họ tên, và ảnh đại diện, gộp 1 lần đọc SỐNG (không cache) mỗi
 * lần xác minh phiên, để avatar cập nhật ở app tổng lan sang ngay lần đăng
 * nhập/SSO check kế tiếp. Không dùng app_permissions: app này không có hệ
 * vai trò riêng, không cần bước gán quyền thủ công nào thêm.
 * Lỗi đọc cross-project → rơi về "employee" + email + không avatar (không
 * chặn đăng nhập).
 */
async function fetchProfile(
  uid: string,
  email: string,
): Promise<{ role: Role; name: string; avatarUrl: string | null }> {
  try {
    const snap = await getHpcoreDb().collection("users").doc(uid).get();
    const data = snap.data();
    const role = data?.role;
    const fullName = (data?.fullName as string | undefined)?.trim();
    const avatarUrl = (data?.avatarUrl as string | undefined)?.trim();
    return {
      role: typeof role === "string" && VALID_ROLES.includes(role as Role) ? (role as Role) : "employee",
      name: fullName || email.split("@")[0],
      avatarUrl: avatarUrl || null,
    };
  } catch {
    return { role: "employee", name: email.split("@")[0], avatarUrl: null };
  }
}

const DEV_FALLBACK_USER: Session = {
  uid: "dev-owner",
  email: "dev@hpcons.com.vn",
  name: "Dev Owner",
  role: "owner",
  avatarUrl: null,
};

/** Phiên hiện tại, hoặc null nếu chưa đăng nhập. Không tự chuyển hướng. */
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const identity = await verifyHpcore(jar.get(SSO_COOKIE_NAME)?.value);

  if (!identity) {
    // Local dev chưa có SSO thật → dùng user giả (owner) để phát triển được.
    if (process.env.NODE_ENV !== "production") return DEV_FALLBACK_USER;
    return null;
  }

  const { role, name, avatarUrl } = await fetchProfile(identity.uid, identity.email);
  return { uid: identity.uid, email: identity.email, name, role, avatarUrl };
}

export class AuthError extends Error {}
export class ForbiddenError extends Error {}

/** Dùng trong API route: ném lỗi thay vì chuyển hướng, route tự map ra HTTP status. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new AuthError("Chưa đăng nhập.");
  return session;
}

/** Dùng trong API route cần quyền cấu hình nhóm ở mức toàn ứng dụng. */
export async function requireWriteAccess(): Promise<Session> {
  const session = await requireSession();
  if (!canManageGroupsAtAppScope(session.role)) {
    throw new ForbiddenError("Chỉ Owner hoặc Admin (vai trò app tổng) được cấu hình nhóm đề xuất.");
  }
  return session;
}

/** Dùng trong Server Component (trang): chuyển hướng về hpcore nếu chưa đăng nhập. */
export async function requireSessionForPage(): Promise<Session> {
  const session = await getSession();
  if (session) return session;
  redirect(hpcoreLoginUrl("https://request.hpcore.vn/request/groups"));
}
