import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/http";
import { ensureCategoryExists } from "@/lib/server/groups";
import { requireWriteAccess } from "@/lib/session";
import type { ProposalGroup } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireWriteAccess();
    const { id } = await params;
    const patch = (await request.json()) as Partial<Omit<ProposalGroup, "id">>;

    const ref = adminDb.collection("groups").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "Không tìm thấy nhóm đề xuất." },
        { status: 404 },
      );
    }

    if (patch.category) {
      await ensureCategoryExists(patch.category.trim());
      patch.category = patch.category.trim();
    }

    await ref.update({ ...patch });
    const group: ProposalGroup = {
      id: ref.id,
      ...(snap.data() as Omit<ProposalGroup, "id">),
      ...patch,
    };
    return NextResponse.json({ group });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
