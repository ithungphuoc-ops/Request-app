import { NextResponse, type NextRequest } from "next/server";

/**
 * BẢO VỆ TRUY CẬP QUA SSO APP TỔNG (account.hpcore.vn).
 * base-request-app không có đăng nhập riêng: phải có cookie phiên "session"
 * do app tổng phát (dùng chung *.hpcore.vn). Middleware chạy ở Edge nên CHỈ
 * kiểm tra cookie có tồn tại; việc xác minh chữ ký/đọc danh tính do lớp
 * server (lib/session.ts) đảm nhiệm — đây là lớp phòng thủ đầu tiên, không
 * phải lớp cuối cùng.
 *
 * - Local dev (NODE_ENV != production): bỏ qua để còn chạy được khi chưa có SSO.
 */

const HPCORE_SESSION_COOKIE = "session";
const HPCORE_LOGIN_URL = "https://account.hpcore.vn/login";

export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (req.cookies.get(HPCORE_SESSION_COOKIE)?.value) return NextResponse.next();

  const returnTo = `${req.nextUrl.origin}${pathname}${search}`;
  const login = `${HPCORE_LOGIN_URL}?next=${encodeURIComponent(returnTo)}`;
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/request/:path*", "/print/:path*"],
};
