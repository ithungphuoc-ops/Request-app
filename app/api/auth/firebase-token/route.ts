import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/http";
import { requireSession } from "@/lib/session";

/**
 * Cầu nối đăng nhập Firebase Auth phía trình duyệt cho riêng nhu cầu nghe
 * real-time (`onSnapshot`) — KHÔNG thay thế đăng nhập SSO chính (cookie
 * `session`). Xác minh session SSO như mọi route khác, rồi ký 1 custom token
 * bằng Admin SDK của CHÍNH project base-request-app (không phải "hpcore") vì
 * dữ liệu cần nghe (`requests`) nằm ở project này. Xem design.md của change
 * add-comment-mentions-realtime, Decision 1.
 */
export async function POST() {
  try {
    const session = await requireSession();
    const token = await adminAuth.createCustomToken(session.uid);
    return NextResponse.json({ token });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
