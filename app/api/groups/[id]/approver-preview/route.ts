import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/http";
import { resolveApproverSteps, toProposalGroup } from "@/lib/server/requests";
import { requireSession } from "@/lib/session";

/**
 * Xem trước "ai sẽ duyệt đề xuất này" cho NGƯỜI ĐANG ĐĂNG NHẬP, dùng đúng
 * resolveApproverSteps() — cùng logic thật sự chạy lúc gửi chính thức (xem
 * app/api/requests/route.ts) — để preview khớp 100% với kết quả thật, không
 * lặp lại logic riêng có thể lệch nhau.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const snap = await adminDb.collection("groups").doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Không tìm thấy nhóm đề xuất." }, { status: 404 });
    }
    const group = toProposalGroup(snap.id, snap.data()!);

    const approvers = await resolveApproverSteps(group.approverSteps, session.uid);
    return NextResponse.json({ approvers });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
