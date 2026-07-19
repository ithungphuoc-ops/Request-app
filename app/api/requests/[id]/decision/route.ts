import { NextResponse } from "next/server";
import {
  applyApproverDecision,
  canApproverAct,
  forwardApprover,
  getRequestStatus,
} from "@/lib/approval-logic";
import { adminDb } from "@/lib/firebase/admin";
import { apiErrorResponse } from "@/lib/http";
import { requireSession } from "@/lib/session";
import type { RequestInstance, TaggedUser } from "@/lib/types";

interface DecisionBody {
  decision: "approved" | "rejected" | "forwarded" | "returned";
  /** Chỉ dùng khi decision = "forwarded" — người nhận quyền xử lý mới. */
  target?: TaggedUser;
  /** Bắt buộc khi decision = "rejected" hoặc "returned" (§4.4 quy định phải có lý do). */
  note?: string;
}

const ACTION_LABEL: Record<DecisionBody["decision"], string> = {
  approved: "Đã chấp thuận",
  rejected: "Đã từ chối",
  forwarded: "Đã chuyển tiếp",
  returned: "Đã trả lại",
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

    if ((body.decision === "rejected" || body.decision === "returned") && !body.note?.trim()) {
      return NextResponse.json(
        { error: "Cần nhập lý do khi từ chối hoặc trả lại đề xuất." },
        { status: 400 },
      );
    }

    if (body.decision === "returned") {
      if (!canApproverAct(current.approvalFlow, current.approvers, session.uid)) {
        return NextResponse.json(
          { error: "Bạn chưa tới lượt hoặc đã xử lý đề xuất này." },
          { status: 409 },
        );
      }
      // Trả lại reset toàn bộ người duyệt về "pending" — khi người tạo gửi lại,
      // quy trình duyệt chạy lại từ đầu (khớp sơ đồ trạng thái §3.5).
      const approvers = current.approvers.map((a) => ({ ...a, decision: "pending" as const }));
      const history = [
        ...current.history,
        { at: nowIso, actor: session.name, action: ACTION_LABEL.returned, note: body.note },
      ];
      await ref.update({ approvers, status: "returned", history, updatedAt: nowIso });
      const updated: RequestInstance = {
        ...current,
        approvers,
        status: "returned",
        history,
        updatedAt: nowIso,
      };
      return NextResponse.json({ request: updated });
    }

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
