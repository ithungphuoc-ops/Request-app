import { NextResponse } from "next/server";
import { adminDb, getAttachmentsBucket } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/http";
import { requireWriteAccess } from "@/lib/session";
import type { PrintTemplate, ProposalGroup } from "@/lib/types";

// Cần Node runtime (không phải Edge) để dùng firebase-admin/storage.
export const runtime = "nodejs";

const MAX_TEMPLATE_SIZE = 5 * 1024 * 1024; // 5MB

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** Tải mẫu in (.docx) lên cho 1 nhóm đề xuất — thay thế mẫu cũ nếu có. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireWriteAccess();
    const { id } = await params;

    const ref = adminDb.collection("groups").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Không tìm thấy nhóm đề xuất." }, { status: 404 });
    }
    const group = snap.data() as Omit<ProposalGroup, "id">;

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Chưa chọn tệp mẫu in." }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".docx")) {
      return NextResponse.json({ error: "Chỉ nhận file Word (.docx)." }, { status: 400 });
    }
    if (file.size > MAX_TEMPLATE_SIZE) {
      return NextResponse.json({ error: "File mẫu in vượt quá 5MB." }, { status: 400 });
    }

    const bucket = getAttachmentsBucket();
    const previousPath = group.printTemplate?.path;
    if (previousPath) {
      await bucket
        .file(previousPath)
        .delete()
        .catch(() => {});
    }

    const path = `print-templates/${id}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await bucket.file(path).save(buffer, {
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const printTemplate: PrintTemplate = {
      fileName: file.name,
      path,
      uploadedAt: new Date().toISOString(),
    };
    await ref.update({ printTemplate });

    return NextResponse.json({ printTemplate }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** Xoá mẫu in hiện có của 1 nhóm đề xuất. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireWriteAccess();
    const { id } = await params;

    const ref = adminDb.collection("groups").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Không tìm thấy nhóm đề xuất." }, { status: 404 });
    }
    const group = snap.data() as Omit<ProposalGroup, "id">;

    if (group.printTemplate?.path) {
      await getAttachmentsBucket()
        .file(group.printTemplate.path)
        .delete()
        .catch(() => {});
    }
    await ref.update({ printTemplate: null });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
