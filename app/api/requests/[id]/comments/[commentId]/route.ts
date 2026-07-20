import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/http";
import { canManageGroupsAtAppScope } from "@/lib/permissions";
import { canView, loadRequest } from "@/lib/server/requests";
import { requireSession } from "@/lib/session";
import type { RequestComment } from "@/lib/types";

interface EditBody {
  text: string;
}

/** Sửa nội dung 1 bình luận — chỉ tác giả. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const session = await requireSession();
    const { id, commentId } = await params;
    const found = await loadRequest(id);
    if (!found) {
      return NextResponse.json({ error: "Không tìm thấy đề xuất." }, { status: 404 });
    }
    if (!canView(found, session.uid, session.role)) {
      return NextResponse.json({ error: "Bạn không có quyền trên đề xuất này." }, { status: 403 });
    }

    const comments = found.comments ?? [];
    const target = comments.find((c) => c.id === commentId);
    if (!target) {
      return NextResponse.json({ error: "Không tìm thấy bình luận." }, { status: 404 });
    }
    if (target.authorUid !== session.uid) {
      return NextResponse.json({ error: "Chỉ tác giả mới sửa được bình luận này." }, { status: 403 });
    }

    const body = (await request.json()) as EditBody;
    const text = body.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "Nội dung không được để trống." }, { status: 400 });
    }

    const updated: RequestComment[] = comments.map((c) =>
      c.id === commentId ? { ...c, text, editedAt: new Date().toISOString() } : c,
    );
    await adminDb.collection("requests").doc(id).update({ comments: updated });

    return NextResponse.json({ comments: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** Xóa 1 bình luận — tác giả HOẶC Admin/Owner (kiểm duyệt). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const session = await requireSession();
    const { id, commentId } = await params;
    const found = await loadRequest(id);
    if (!found) {
      return NextResponse.json({ error: "Không tìm thấy đề xuất." }, { status: 404 });
    }
    if (!canView(found, session.uid, session.role)) {
      return NextResponse.json({ error: "Bạn không có quyền trên đề xuất này." }, { status: 403 });
    }

    const comments = found.comments ?? [];
    const target = comments.find((c) => c.id === commentId);
    if (!target) {
      return NextResponse.json({ error: "Không tìm thấy bình luận." }, { status: 404 });
    }
    const isAuthor = target.authorUid === session.uid;
    const isModerator = canManageGroupsAtAppScope(session.role);
    if (!isAuthor && !isModerator) {
      return NextResponse.json({ error: "Bạn không có quyền xóa bình luận này." }, { status: 403 });
    }

    const updated = comments.filter((c) => c.id !== commentId);
    await adminDb.collection("requests").doc(id).update({ comments: updated });

    return NextResponse.json({ comments: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
