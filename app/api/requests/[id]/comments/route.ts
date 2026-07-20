import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/http";
import { expandMentionsToUids } from "@/lib/server/mentions";
import { canView, loadRequest } from "@/lib/server/requests";
import { requireSession } from "@/lib/session";
import type { RequestComment } from "@/lib/types";

interface CommentBody {
  text: string;
  mentionIds?: string[];
  /** Nếu trỏ tới 1 trả lời (không phải gốc), server tự quy về gốc của trả lời đó. */
  parentId?: string | null;
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

    const existing = found.comments ?? [];
    // Trả lời 1 cấp: nếu parentId trỏ tới 1 bình luận đã có parentId riêng
    // (tức chính nó là 1 trả lời), quy về gốc của trả lời đó thay vì lồng thêm.
    let parentId = body.parentId ?? null;
    if (parentId) {
      const target = existing.find((c) => c.id === parentId);
      if (target?.parentId) parentId = target.parentId;
    }

    const mentionIds = Array.isArray(body.mentionIds) ? body.mentionIds : [];

    const comment: RequestComment = {
      id: crypto.randomUUID(),
      authorUid: session.uid,
      authorName: session.name,
      avatarInitial: session.name.trim().charAt(0).toUpperCase() || "?",
      text,
      at: new Date().toISOString(),
      mentionIds,
      parentId,
    };
    const comments = [...existing, comment];

    const patch: { comments: RequestComment[]; mentionedUids?: string[] } = { comments };
    if (mentionIds.length > 0) {
      const expanded = await expandMentionsToUids(mentionIds, session.uid);
      const merged = new Set([...(found.mentionedUids ?? []), ...expanded]);
      patch.mentionedUids = Array.from(merged);
    }

    await adminDb.collection("requests").doc(id).update(patch);

    return NextResponse.json({ comments }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
