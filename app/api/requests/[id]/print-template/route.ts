import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { NextResponse } from "next/server";
import { adminDb, getAttachmentsBucket } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/http";
import { buildPrintTemplateData } from "@/lib/print-template";
import { canView, loadRequest } from "@/lib/server/requests";
import { requireSession } from "@/lib/session";
import type { ProposalGroup } from "@/lib/types";

// Cần Node runtime (không phải Edge) để dùng firebase-admin/storage + docxtemplater.
export const runtime = "nodejs";

/** Điền dữ liệu đề xuất vào mẫu in .docx của nhóm và trả về file Word đã điền. */
export async function GET(
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
        { error: "Bạn không có quyền xem đề xuất này." },
        { status: 403 },
      );
    }
    if (!found.groupId) {
      return NextResponse.json(
        { error: "Đề xuất trực tiếp không có mẫu in tuỳ chỉnh." },
        { status: 404 },
      );
    }

    const groupSnap = await adminDb.collection("groups").doc(found.groupId).get();
    const group = groupSnap.data() as Omit<ProposalGroup, "id"> | undefined;
    const template = group?.printTemplate;
    if (!template) {
      return NextResponse.json(
        { error: "Nhóm đề xuất này chưa có mẫu in tuỳ chỉnh (.docx)." },
        { status: 404 },
      );
    }

    const [fileBuffer] = await getAttachmentsBucket().file(template.path).download();

    let rendered: Buffer;
    try {
      const zip = new PizZip(fileBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: "${", end: "}" },
        nullGetter: () => "",
      });
      doc.render(buildPrintTemplateData(found));
      rendered = doc.getZip().generate({ type: "nodebuffer" });
    } catch {
      return NextResponse.json(
        {
          error:
            "Mẫu in (.docx) đang lỗi cú pháp thẻ ${...} — kiểm tra lại file mẫu đã tải lên ở Thiết lập nhóm > In đề xuất.",
        },
        { status: 422 },
      );
    }

    const downloadName = `${found.code ?? found.id}-${template.fileName}`;
    return new NextResponse(new Uint8Array(rendered), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(downloadName)}"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
