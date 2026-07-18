import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/http";
import { canView, loadRequest } from "@/lib/server/requests";
import { requireSession } from "@/lib/session";
import type { RequestComment } from "@/lib/types";

interface CommentBody {
  text: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const found = await loadRequest(id);
    if (!found) {
      return NextResponse.json({ error: "Không tìm thấy đề xuất." }, { status: 404 });
    }
    if (!canView(found, session.uid, session.role)) {
      return NextResponse.json(
        { error: "Bạn không có quyền bình luận trên đề xuất này." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as CommentBody;
    const text = body.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "Nội dung thảo luận không được để trống." }, { status: 400 });
    }

    const comment: RequestComment = {
      id: crypto.randomUUID(),
      authorUid: session.uid,
      authorName: session.name,
      avatarInitial: session.name.trim().charAt(0).toUpperCase() || "?",
      text,
      at: new Date().toISOString(),
    };
    const comments = [...(found.comments ?? []), comment];

    await adminDb.collection("requests").doc(id).update({ comments });

    return NextResponse.json({ comments }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
