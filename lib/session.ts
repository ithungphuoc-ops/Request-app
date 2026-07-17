import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  REQUEST_APP_PERMISSION_KEY,
  SSO_COOKIE_NAME,
  getHpcoreDb,
  hpcoreLoginUrl,
  verifyHpcore,
} from "@/lib/hpcore";
import { canManageGroupsAtAppScope, type Role } from "@/lib/permissions";

export interface Session {
  uid: string;
  email: string;
  name: string;
  role: Role;
}

const VALID_ROLES: readonly Role[] = ["owner", "app_admin", "admin", "member"];

/**
 * Vai trò THẬT SỰ do app tổng gán (app_permissions/{uid}.request_app) — nguồn
 * quyết định duy nhất, app này không có trang phân quyền riêng. Lỗi đọc
 * cross-project → null, rơi về "member" mặc định (không chặn đăng nhập).
 */
async function fetchCentralRole(uid: string): Promise<Role | null> {
  try {
    const snap = await getHpcoreDb().collection("app_permissions").doc(uid).get();
    const role = snap.data()?.[REQUEST_APP_PERMISSION_KEY];
    return typeof role === "string" && VALID_ROLES.includes(role as Role)
      ? (role as Role)
      : null;
  } catch {
    return null;
  }
}

async function fetchDisplayName(uid: string, email: string): Promise<string> {
  try {
    const snap = await getHpcoreDb().collection("users").doc(uid).get();
    const fullName = (snap.data()?.fullName as string | undefined)?.trim();
    if (fullName) return fullName;
  } catch {
    /* đọc hồ sơ app tổng lỗi → rơi về email */
  }
  return email.split("@")[0];
}

const DEV_FALLBACK_USER: Session = {
  uid: "dev-owner",
  email: "dev@hpcons.com.vn",
  name: "Dev Owner",
  role: "owner",
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

  const [role, name] = await Promise.all([
    fetchCentralRole(identity.uid),
    fetchDisplayName(identity.uid, identity.email),
  ]);

  return { uid: identity.uid, email: identity.email, name, role: role ?? "member" };
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
    throw new ForbiddenError("Chỉ Owner hoặc App Admin được cấu hình nhóm đề xuất.");
  }
  return session;
}

/** Dùng trong Server Component (trang): chuyển hướng về hpcore nếu chưa đăng nhập. */
export async function requireSessionForPage(): Promise<Session> {
  const session = await getSession();
  if (session) return session;
  redirect(hpcoreLoginUrl("https://request.hpcore.vn/request/groups"));
}
