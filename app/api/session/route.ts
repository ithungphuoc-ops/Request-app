import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/http";
import { requireSession } from "@/lib/session";

/** Danh tính phiên hiện tại cho client component (biết "đây có phải tôi không"). */
export async function GET() {
  try {
    const session = await requireSession();
    return NextResponse.json({
      uid: session.uid,
      email: session.email,
      name: session.name,
      role: session.role,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
