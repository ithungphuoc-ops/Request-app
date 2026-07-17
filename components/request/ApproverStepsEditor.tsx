"use client";

import { Plus, Trash2, Users } from "lucide-react";
import TagUserInput from "@/components/shared/TagUserInput";
import { selectClass } from "@/components/shared/form-styles";
import type { ApproverStepDef, TaggedUser } from "@/lib/types";

/**
 * Trạng thái đang soạn của 1 bước duyệt — khác `ApproverStepDef` ở chỗ bước
 * "fixed" có thể tạm chưa chọn người (user: null) trong lúc đang sửa form.
 * Dùng `toApproverSteps()` để xác thực + chuyển sang `ApproverStepDef[]`
 * thật trước khi gửi lên API.
 */
export type DraftApproverStep = { kind: "fixed"; user: TaggedUser | null } | { kind: "submitter_manager" };

export function fromApproverSteps(steps: ApproverStepDef[]): DraftApproverStep[] {
  return steps.map((s) => (s.kind === "fixed" ? { kind: "fixed", user: s.user } : s));
}

/** null nếu còn bước "Người cố định" chưa chọn ai — chặn submit ở nơi gọi. */
export function toApproverSteps(steps: DraftApproverStep[]): ApproverStepDef[] | null {
  const result: ApproverStepDef[] = [];
  for (const step of steps) {
    if (step.kind === "submitter_manager") {
      result.push(step);
    } else {
      if (!step.user) return null;
      result.push({ kind: "fixed", user: step.user });
    }
  }
  return result;
}

/**
 * Danh sách bước duyệt của 1 nhóm — mỗi bước là "Cố định" (một người cụ thể,
 * giống nhau cho mọi đề xuất) hoặc "Quản lý phòng ban người gửi" (tự động
 * tra theo phòng ban của người gửi, khác nhau tuỳ ai gửi). Thứ tự bước quyết
 * định thứ tự duyệt khi Quy trình xử lý = "Lần lượt".
 */
export default function ApproverStepsEditor({
  value,
  onChange,
}: {
  value: DraftApproverStep[];
  onChange: (steps: DraftApproverStep[]) => void;
}) {
  const addStep = () => {
    onChange([...value, { kind: "fixed", user: null }]);
  };

  const removeStep = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const setKind = (index: number, kind: DraftApproverStep["kind"]) => {
    onChange(
      value.map((step, i) =>
        i === index
          ? kind === "submitter_manager"
            ? { kind: "submitter_manager" as const }
            : { kind: "fixed" as const, user: null }
          : step,
      ),
    );
  };

  const setFixedUser = (index: number, user: TaggedUser | undefined) => {
    onChange(value.map((step, i) => (i === index ? { kind: "fixed" as const, user: user ?? null } : step)));
  };

  return (
    <div className="flex flex-col gap-2.5">
      {value.length === 0 && (
        <p className="text-[12px] text-gray-400">Chưa có bước duyệt nào.</p>
      )}
      {value.map((step, index) => (
        <div key={index} className="flex items-start gap-2 rounded border border-[var(--color-border)] p-2.5">
          <span className="mt-1.5 shrink-0 text-[12px] font-semibold text-gray-500">
            Bước {index + 1}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <select
              className={selectClass}
              value={step.kind}
              onChange={(e) => setKind(index, e.target.value as DraftApproverStep["kind"])}
            >
              <option value="fixed">Người cố định</option>
              <option value="submitter_manager">Quản lý phòng ban của người gửi</option>
            </select>

            {step.kind === "fixed" ? (
              <TagUserInput
                value={step.user ? [step.user] : []}
                onChange={(users) => setFixedUser(index, users.slice(-1)[0])}
                placeholder="Gõ @ để chọn người duyệt"
              />
            ) : (
              <p className="flex items-center gap-1.5 text-[12px] text-gray-500">
                <Users size={13} />
                Tự động: trưởng đơn vị của người gửi (tra tại thời điểm gửi đề xuất).
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeStep(index)}
            aria-label={`Xoá bước duyệt ${index + 1}`}
            className="mt-1 shrink-0 text-gray-300 hover:text-[var(--color-danger-red)]"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addStep}
        className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-[var(--color-action-blue)] hover:underline"
      >
        <Plus size={14} /> Thêm bước duyệt
      </button>
    </div>
  );
}
