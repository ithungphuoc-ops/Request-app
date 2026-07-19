import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/http";
import { canManageGroupsAtAppScope } from "@/lib/permissions";
import { loadRequest } from "@/lib/server/requests";
import { requireSession } from "@/lib/session";

/** Khôi phục đề xuất đã xóa mềm — chỉ Owner/Admin (tránh nhân viên tự khôi
 * phục lại đề xuất đã bị xóa vì lý do quản trị). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    if (!canManageGroupsAtAppScope(session.role)) {
      return NextResponse.json(
        { error: "Chỉ Owner hoặc Admin mới khôi phục được đề xuất." },
        { status: 403 },
      );
    }
    const { id } = await params;
    const found = await loadRequest(id);
    if (!found) {
      return NextResponse.json({ error: "Không tìm thấy đề xuất." }, { status: 404 });
    }
    if (!found.deletedAt) {
      return NextResponse.json({ request: found });
    }

    const nowIso = new Date().toISOString();
    const history = [
      ...found.history,
      { at: nowIso, actor: session.name, action: "Đã khôi phục đề xuất" },
    ];
    await adminDb.collection("requests").doc(id).update({ deletedAt: null, history });
    return NextResponse.json({ request: { ...found, deletedAt: null, history } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
