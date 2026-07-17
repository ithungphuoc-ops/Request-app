import { NextResponse } from "next/server";
import { canApproverAct } from "@/lib/approval-logic";
import { adminDb } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/http";
import { isWithinUsedForScope } from "@/lib/permissions";
import {
  buildInitialApprovers,
  computeDeadline,
  findMissingRequiredFields,
  toProposalGroup,
} from "@/lib/server/requests";
import { requireSession } from "@/lib/session";
import type {
  ApprovalFlowType,
  ProposalField,
  RequestInstance,
  TaggedUser,
} from "@/lib/types";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const scope = new URL(request.url).searchParams.get("scope") ?? "mine";

    if (scope === "mine") {
      // Gồm cả nháp — "Đề xuất của tôi" hiển thị mọi đề xuất do người này tạo.
      const snap = await adminDb
        .collection("requests")
        .where("submittedBy.uid", "==", session.uid)
        .orderBy("submittedAt", "desc")
        .get();
      const requests = snap.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as RequestInstance,
      );
      return NextResponse.json({ requests });
    }

    if (scope === "inbox") {
      // Không lọc được "còn tôi cần duyệt" bằng 1 Firestore query đơn giản
      // (approvers là mảng lồng) — lấy các đề xuất đang pending rồi lọc bằng
      // canApproverAct (đã có test, không viết lại).
      const snap = await adminDb
        .collection("requests")
        .where("status", "==", "pending")
        .orderBy("submittedAt", "desc")
        .get();
      const requests = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as RequestInstance)
        .filter((r) => canApproverAct(r.approvalFlow, r.approvers, session.uid));
      return NextResponse.json({ requests });
    }

    return NextResponse.json({ error: "scope không hợp lệ." }, { status: 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

interface SubmitBody {
  groupId: string | null;
  values?: Record<string, unknown>;
  isDraft?: boolean;
  // Chỉ dùng khi groupId null (Đề xuất trực tiếp) — xem design.md Decision 10.
  title?: string;
  description?: string;
  approvers?: TaggedUser[];
  followers?: TaggedUser[];
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = (await request.json()) as SubmitBody;
    const isDraft = body.isDraft === true;
    const now = new Date();
    const nowIso = now.toISOString();

    let groupNameSnapshot: string;
    let fieldsSnapshot: ProposalField[];
    let approvalFlow: ApprovalFlowType;
    let approversSnapshot: TaggedUser[];
    let followers: TaggedUser[];
    let deadlineAt: string | null;

    if (body.groupId) {
      const groupSnap = await adminDb.collection("groups").doc(body.groupId).get();
      if (!groupSnap.exists) {
        return NextResponse.json(
          { error: "Không tìm thấy nhóm đề xuất." },
          { status: 404 },
        );
      }
      const group = toProposalGroup(groupSnap.id, groupSnap.data()!);

      if (!isWithinUsedForScope(group.usedFor, { userId: session.uid, groupIds: [] })) {
        return NextResponse.json(
          { error: "Bạn không nằm trong phạm vi sử dụng của nhóm đề xuất này." },
          { status: 403 },
        );
      }

      if (!isDraft) {
        const missing = findMissingRequiredFields(group.fields, body.values ?? {});
        if (missing.length > 0) {
          return NextResponse.json(
            {
              error: "Còn thiếu trường bắt buộc.",
              missingFields: missing.map((f) => ({ id: f.id, name: f.name })),
            },
            { status: 400 },
          );
        }
      }

      groupNameSnapshot = group.name;
      fieldsSnapshot = group.fields;
      approvalFlow = group.approvalFlow;
      approversSnapshot = group.approvers;
      followers = group.followers;
      deadlineAt = isDraft ? null : computeDeadline(group.slaHours, now);
    } else {
      // Đề xuất trực tiếp: không có mẫu, người tạo tự chọn người duyệt.
      const title = body.title?.trim();
      if (!isDraft) {
        if (!title) {
          return NextResponse.json({ error: "Thiếu tên đề xuất." }, { status: 400 });
        }
        if (!body.approvers || body.approvers.length === 0) {
          return NextResponse.json(
            { error: "Cần ít nhất một người xét duyệt." },
            { status: 400 },
          );
        }
      }
      groupNameSnapshot = title || "Đề xuất trực tiếp (chưa đặt tên)";
      fieldsSnapshot = [];
      approvalFlow = "concurrent";
      approversSnapshot = body.approvers ?? [];
      followers = body.followers ?? [];
      deadlineAt = null;
    }

    const values = { ...(body.values ?? {}) };
    if (!body.groupId && body.description) values.description = body.description;

    const requestRef = adminDb.collection("requests").doc();
    const newRequest: Omit<RequestInstance, "id"> = {
      groupId: body.groupId ?? null,
      groupNameSnapshot,
      fieldsSnapshot,
      values,
      submittedBy: { uid: session.uid, email: session.email, name: session.name },
      submittedAt: nowIso,
      approvalFlow,
      approversSnapshot,
      approvers: isDraft ? [] : buildInitialApprovers(approversSnapshot),
      followers,
      status: isDraft ? "draft" : "pending",
      deadlineAt,
      history: [
        { at: nowIso, actor: session.name, action: isDraft ? "Đã lưu nháp" : "Đã gửi đề xuất" },
      ],
    };
    await requestRef.set(newRequest);

    const created: RequestInstance = { id: requestRef.id, ...newRequest };
    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
