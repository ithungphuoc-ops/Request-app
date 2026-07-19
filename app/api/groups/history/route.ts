import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/http";
import { requireWriteAccess } from "@/lib/session";
import type { GroupHistoryEntry } from "@/lib/types";

export async function GET() {
  try {
    await requireWriteAccess();
    const snap = await adminDb.collection("groupHistory").get();
    const entries = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as GroupHistoryEntry)
      .sort((a, b) => b.at.localeCompare(a.at));
    return NextResponse.json({ entries });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
