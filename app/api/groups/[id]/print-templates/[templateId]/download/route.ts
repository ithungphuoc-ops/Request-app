import { NextResponse } from "next/server";
import { getAttachmentsBucket } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/http";
import { getPrintTemplate } from "@/lib/server/print-templates";
import { requireWriteAccess } from "@/lib/session";

// Cần Node runtime (không phải Edge) để dùng firebase-admin/storage.
export const runtime = "nodejs";

/** Tải mẫu gốc (.docx) xuống — chỉ người quản lý mẫu in mới xem/tải được. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> },
) {
  try {
    await requireWriteAccess();
    const { id, templateId } = await params;
    const template = await getPrintTemplate(id, templateId);
    if (!template) {
      return NextResponse.json({ error: "Không tìm thấy mẫu in." }, { status: 404 });
    }

    const [signedUrl] = await getAttachmentsBucket()
      .file(template.path)
      .getSignedUrl({ action: "read", expires: Date.now() + 5 * 60 * 1000 });

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
