import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/http";
import { canView, loadRequest } from "@/lib/server/requests";
import { requireSession } from "@/lib/session";
import type { RequestInstance } from "@/lib/types";

/** Nhân bản đề xuất — tạo NHÁP mới thuộc về người bấm nhân bản, chỉ chép
 * dữ liệu biểu mẫu (không chép người duyệt/lịch sử/bình luận/trạng thái). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const source = await loadRequest(id);
    if (!source) {
      return NextResponse.json({ error: "Không tìm thấy đề xuất." }, { status: 404 });
    }
    if (!canView(source, session.uid, session.role)) {
      return NextResponse.json(
        { error: "Bạn không có quyền xem đề xuất này." },
        { status: 403 },
      );
    }

    const nowIso = new Date().toISOString();
    const ref = adminDb.collection("requests").doc();
    const duplicate: Omit<RequestInstance, "id"> = {
      code: null,
      groupId: source.groupId,
      groupNameSnapshot: source.groupNameSnapshot,
      fieldsSnapshot: source.fieldsSnapshot,
      values: JSON.parse(JSON.stringify(source.values)),
      submittedBy: { uid: session.uid, email: session.email, name: session.name },
      submittedAt: nowIso,
      updatedAt: nowIso,
      approvalFlow: source.approvalFlow,
      approversSnapshot: [],
      approvers: [],
      followers: [],
      status: "draft",
      deadlineAt: null,
      history: [{ at: nowIso, actor: session.name, action: `Đã nhân bản từ đề xuất ${source.code ?? source.id}` }],
      comments: [],
      deletedAt: null,
    };
    await ref.set(duplicate);

    return NextResponse.json({ request: { id: ref.id, ...duplicate } }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
