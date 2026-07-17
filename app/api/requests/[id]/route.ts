import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/http";
import { canManageGroupsAtAppScope, type Role } from "@/lib/permissions";
import {
  buildInitialApprovers,
  computeDeadline,
  findMissingRequiredFields,
  resolveApproverSteps,
  toProposalGroup,
} from "@/lib/server/requests";
import { requireSession } from "@/lib/session";
import type { RequestInstance, TaggedUser } from "@/lib/types";

async function loadRequest(id: string): Promise<RequestInstance | null> {
  const snap = await adminDb.collection("requests").doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as RequestInstance;
}

/**
 * Nháp chỉ chủ đề xuất xem/sửa được (§ Requirement "Lưu nháp"). Đề xuất đã
 * gửi thì người tạo, người duyệt, người theo dõi hoặc owner/app_admin xem
 * được — không rò rỉ nội dung cho người không liên quan.
 */
function canView(req: RequestInstance, uid: string, role: Role): boolean {
  const isOwner = req.submittedBy.uid === uid;
  if (req.status === "draft") return isOwner;
  const isApprover = req.approversSnapshot.some((a) => a.id === uid);
  const isFollower = req.followers.some((f) => f.id === uid);
  return isOwner || isApprover || isFollower || canManageGroupsAtAppScope(role);
}

export async function GET(
  _request: Request,
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
    return NextResponse.json({ request: found });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

interface UpdateDraftBody {
  values?: Record<string, unknown>;
  title?: string;
  description?: string;
  approvers?: TaggedUser[];
  followers?: TaggedUser[];
  /** true (mặc định) = vẫn lưu nháp; false = gửi chính thức, chuyển sang "pending". */
  isDraft?: boolean;
}

export async function PATCH(
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
    if (found.status !== "draft" || found.submittedBy.uid !== session.uid) {
      return NextResponse.json(
        { error: "Chỉ chủ đề xuất mới sửa được nháp của chính mình." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as UpdateDraftBody;
    const wantsSubmit = body.isDraft === false;

    const values = body.values !== undefined ? { ...body.values } : found.values;
    let groupNameSnapshot = found.groupNameSnapshot;
    let approversSnapshot = found.approversSnapshot;
    const followers = body.followers ?? found.followers;

    if (found.groupId === null) {
      if (body.title !== undefined) groupNameSnapshot = body.title.trim() || groupNameSnapshot;
      if (body.description !== undefined) values.description = body.description;
      if (body.approvers !== undefined) approversSnapshot = body.approvers;
    }

    if (!wantsSubmit) {
      const ref = adminDb.collection("requests").doc(id);
      await ref.update({ values, groupNameSnapshot, approversSnapshot, followers });
      const updated: RequestInstance = {
        ...found,
        values,
        groupNameSnapshot,
        approversSnapshot,
        followers,
      };
      return NextResponse.json({ request: updated });
    }

    // Gửi chính thức: khởi tạo approvers/deadlineAt tại THỜI ĐIỂM GỬI NÀY,
    // không phải thời điểm tạo nháp trước đó.
    if (found.groupId) {
      const groupSnap = await adminDb.collection("groups").doc(found.groupId).get();
      if (!groupSnap.exists) {
        return NextResponse.json(
          { error: "Nhóm đề xuất gốc không còn tồn tại." },
          { status: 404 },
        );
      }
      const group = toProposalGroup(groupSnap.id, groupSnap.data()!);
      const missing = findMissingRequiredFields(group.fields, values);
      if (missing.length > 0) {
        return NextResponse.json(
          {
            error: "Còn thiếu trường bắt buộc.",
            missingFields: missing.map((f) => ({ id: f.id, name: f.name })),
          },
          { status: 400 },
        );
      }
      approversSnapshot = await resolveApproverSteps(group.approverSteps, session.uid);
      const deadlineAt = computeDeadline(group.slaHours, new Date());
      const nowIso = new Date().toISOString();
      const ref = adminDb.collection("requests").doc(id);
      const patch = {
        values,
        groupNameSnapshot: group.name,
        fieldsSnapshot: group.fields,
        approvalFlow: group.approvalFlow,
        approversSnapshot,
        approvers: buildInitialApprovers(approversSnapshot),
        followers: group.followers,
        status: "pending" as const,
        deadlineAt,
        history: [...found.history, { at: nowIso, actor: session.name, action: "Đã gửi đề xuất" }],
      };
      await ref.update(patch);
      return NextResponse.json({ request: { ...found, ...patch } });
    }

    // Đề xuất trực tiếp.
    if (!groupNameSnapshot.trim()) {
      return NextResponse.json({ error: "Thiếu tên đề xuất." }, { status: 400 });
    }
    if (approversSnapshot.length === 0) {
      return NextResponse.json(
        { error: "Cần ít nhất một người xét duyệt." },
        { status: 400 },
      );
    }
    const nowIso = new Date().toISOString();
    const ref = adminDb.collection("requests").doc(id);
    const patch = {
      values,
      groupNameSnapshot,
      approversSnapshot,
      approvers: buildInitialApprovers(approversSnapshot),
      followers,
      status: "pending" as const,
      deadlineAt: null,
      history: [...found.history, { at: nowIso, actor: session.name, action: "Đã gửi đề xuất" }],
    };
    await ref.update(patch);
    return NextResponse.json({ request: { ...found, ...patch } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
