import { NextResponse } from "next/server";
import {
  applyApproverDecision,
  forwardApprover,
  getRequestStatus,
} from "@/lib/approval-logic";
import { adminDb } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/http";
import { requireSession } from "@/lib/session";
import type { RequestInstance, TaggedUser } from "@/lib/types";

interface DecisionBody {
  decision: "approved" | "rejected" | "forwarded";
  /** Chỉ dùng khi decision = "forwarded" — người nhận quyền xử lý mới. */
  target?: TaggedUser;
  note?: string;
}

const ACTION_LABEL: Record<DecisionBody["decision"], string> = {
  approved: "Đã chấp thuận",
  rejected: "Đã từ chối",
  forwarded: "Đã chuyển tiếp",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = (await request.json()) as DecisionBody;

    const ref = adminDb.collection("requests").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Không tìm thấy đề xuất." }, { status: 404 });
    }
    const current = { id: snap.id, ...snap.data() } as RequestInstance;
    const nowIso = new Date().toISOString();

    if (body.decision === "forwarded") {
      if (!body.target) {
        return NextResponse.json(
          { error: "Thiếu người nhận chuyển tiếp." },
          { status: 400 },
        );
      }
      // forwardApprover ném ApprovalActionError nếu chưa tới lượt, đã quyết
      // định rồi, hoặc người nhận đã có mặt — apiErrorResponse map thành 409.
      const approvers = forwardApprover(
        current.approvalFlow,
        current.approvers,
        session.uid,
        body.target.id,
      );
      const approversSnapshot = current.approversSnapshot.map((a) =>
        a.id === session.uid ? body.target! : a,
      );
      const history = [
        ...current.history,
        {
          at: nowIso,
          actor: session.name,
          action: ACTION_LABEL.forwarded,
          target: body.target.name,
          note: body.note,
        },
      ];
      await ref.update({ approvers, approversSnapshot, history, updatedAt: nowIso });
      const updated: RequestInstance = {
        ...current,
        approvers,
        approversSnapshot,
        history,
        updatedAt: nowIso,
      };
      return NextResponse.json({ request: updated });
    }

    // applyApproverDecision ném ApprovalActionError nếu chưa tới lượt hoặc đã
    // quyết định rồi — apiErrorResponse tự map lỗi này thành 409.
    const approvers = applyApproverDecision(
      current.approvalFlow,
      current.approvers,
      session.uid,
      body.decision,
    );
    const status = getRequestStatus(current.approvalFlow, approvers);
    const history = [
      ...current.history,
      { at: nowIso, actor: session.name, action: ACTION_LABEL[body.decision], note: body.note },
    ];

    await ref.update({ approvers, status, history, updatedAt: nowIso });

    const updated: RequestInstance = {
      ...current,
      approvers,
      status,
      history,
      updatedAt: nowIso,
    };
    return NextResponse.json({ request: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
