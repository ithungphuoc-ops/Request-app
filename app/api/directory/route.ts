import { NextResponse } from "next/server";
import { getHpcoreDb } from "@/lib/hpcore";
import { apiErrorResponse } from "@/lib/http";
import { requireSession } from "@/lib/session";
import type { TaggedUser } from "@/lib/types";

/**
 * Danh bạ người dùng để gắn thẻ (usedFor/approvers/followers) đọc trực tiếp
 * từ Firestore của app tổng (collection `users`, đang hoạt động) — hpcore là
 * nguồn danh tính duy nhất, app này không tự nuôi danh sách người dùng.
 */
export async function GET() {
  try {
    await requireSession();
    const snap = await getHpcoreDb().collection("users").where("isActive", "==", true).get();
    const directory: TaggedUser[] = snap.docs.map((doc) => {
      const data = doc.data() as { fullName?: string; email?: string };
      const name = data.fullName?.trim() || data.email?.split("@")[0] || doc.id;
      return {
        id: doc.id,
        name,
        username: data.email?.split("@")[0] ?? doc.id,
        avatarInitial: name.charAt(0).toUpperCase(),
      };
    });
    return NextResponse.json({ directory });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
