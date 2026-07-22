"use client";

import { Plus, Trash2 } from "lucide-react";
import TagUserInput from "@/components/shared/TagUserInput";
import { inputClass, selectClass } from "@/components/shared/form-styles";
import type { ConditionRule, ProposalField, TaggedUser } from "@/lib/types";

export type FollowersConditionalItem = { condition: ConditionRule; users: TaggedUser[] };

const CONDITION_ELIGIBLE_TYPES = new Set(["single_choice", "multiple_choice", "department_select"]);

/**
 * Danh sách "Người theo dõi theo điều kiện" — mỗi mục: 1 điều kiện (field/
 * toán tử/giá trị) + danh sách người được thêm làm follower khi điều kiện đó
 * thoả mãn lúc gửi chính thức. Dùng chung khái niệm ConditionRule với bước
 * duyệt có điều kiện (ApproverStepsEditor.tsx).
 */
export default function FollowersConditionalEditor({
  value,
  onChange,
  fields,
}: {
  value: FollowersConditionalItem[];
  onChange: (items: FollowersConditionalItem[]) => void;
  fields: ProposalField[];
}) {
  const conditionFields = fields.filter((f) => f.code && CONDITION_ELIGIBLE_TYPES.has(f.dataType));

  if (conditionFields.length === 0) {
    return (
      <p className="text-[12px] text-gray-400">
        Nhóm chưa có trường kiểu &quot;một/nhiều lựa chọn&quot; nào để đặt điều kiện.
      </p>
    );
  }

  const addItem = () => {
    const first = conditionFields[0];
    if (!first.code) return;
    onChange([...value, { condition: { fieldCode: first.code, operator: "equals", value: "" }, users: [] }]);
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, condition: ConditionRule) => {
    onChange(value.map((item, i) => (i === index ? { ...item, condition } : item)));
  };

  const updateUsers = (index: number, users: TaggedUser[]) => {
    onChange(value.map((item, i) => (i === index ? { ...item, users } : item)));
  };

  return (
    <div className="flex flex-col gap-2.5">
      {value.length === 0 && (
        <p className="text-[12px] text-gray-400">Chưa có người theo dõi theo điều kiện nào.</p>
      )}
      {value.map((item, index) => (
        <div key={index} className="flex items-start gap-2 rounded border border-[var(--color-border)] p-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] text-gray-500">Khi</span>
              <select
                className={selectClass}
                value={item.condition.fieldCode}
                onChange={(e) => updateCondition(index, { ...item.condition, fieldCode: e.target.value })}
              >
                {conditionFields.map((f) => (
                  <option key={f.code} value={f.code}>
                    {f.name}
                  </option>
                ))}
              </select>
              <select
                className={selectClass}
                value={item.condition.operator}
                onChange={(e) =>
                  updateCondition(index, {
                    ...item.condition,
                    operator: e.target.value as ConditionRule["operator"],
                  })
                }
              >
                <option value="equals">bằng</option>
                <option value="not_equals">khác</option>
                <option value="includes">chứa</option>
              </select>
              <input
                className={inputClass}
                value={item.condition.value}
                placeholder="Giá trị"
                onChange={(e) => updateCondition(index, { ...item.condition, value: e.target.value })}
              />
            </div>
            <TagUserInput
              value={item.users}
              onChange={(users) => updateUsers(index, users)}
              placeholder="Gõ @ để thêm người theo dõi khi thoả điều kiện"
            />
          </div>
          <button
            type="button"
            onClick={() => removeItem(index)}
            aria-label={`Xoá điều kiện ${index + 1}`}
            className="mt-1 shrink-0 text-gray-300 hover:text-[var(--color-danger-red)]"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-[var(--color-action-blue)] hover:underline"
      >
        <Plus size={14} /> Thêm điều kiện
      </button>
    </div>
  );
}
