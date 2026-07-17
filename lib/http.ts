import { NextResponse } from "next/server";
import { ApprovalActionError } from "@/lib/approval-logic";
import { AuthError, ForbiddenError } from "@/lib/session";

/** Ánh xạ lỗi ném ra từ tầng session/nghiệp vụ sang HTTP response cho API route. */
export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof ApprovalActionError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  const message = error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
  return NextResponse.json({ error: message }, { status: 400 });
}
