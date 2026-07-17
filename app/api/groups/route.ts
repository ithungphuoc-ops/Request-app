import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/http";
import { ensureCategoryExists } from "@/lib/server/groups";
import { requireSession, requireWriteAccess } from "@/lib/session";
import type { CategoryGroup, ProposalGroup } from "@/lib/types";

export async function GET() {
  try {
    await requireSession();

    const [categoriesSnap, groupsSnap] = await Promise.all([
      adminDb.collection("categories").orderBy("code").get(),
      adminDb.collection("groups").orderBy("createdAt").get(),
    ]);

    const groups = groupsSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as ProposalGroup,
    );

    const categoryGroups: CategoryGroup[] = categoriesSnap.docs.map((doc) => {
      const data = doc.data() as { code: string; name: string };
      return {
        id: doc.id,
        code: data.code,
        name: data.name,
        groups: groups.filter((g) => g.category === data.name),
      };
    });

    return NextResponse.json({ categoryGroups });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

type CreateGroupBody = Omit<
  ProposalGroup,
  "id" | "fields" | "pinned" | "createdAt" | "status"
>;

export async function POST(request: Request) {
  try {
    await requireWriteAccess();
    const body = (await request.json()) as CreateGroupBody;

    const categoryName = body.category?.trim() || "Chưa phân loại";
    await ensureCategoryExists(categoryName);

    const groupRef = adminDb.collection("groups").doc();
    const newGroup: Omit<ProposalGroup, "id"> = {
      ...body,
      category: categoryName,
      fields: [],
      pinned: false,
      createdAt: new Date().toISOString().slice(0, 10),
      status: "active",
    };
    await groupRef.set(newGroup);

    const group: ProposalGroup = { id: groupRef.id, ...newGroup };
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
