import type { ApproverStepDef, ConditionRule, ProposalField, TaggedUser } from "@/lib/types";

/**
 * Đánh giá 1 điều kiện dựa trên giá trị field của đề xuất — dùng chung cho
 * bước duyệt có điều kiện và người theo dõi theo điều kiện. Field tham
 * chiếu không còn tồn tại trong nhóm (đã bị xoá/sửa mã) coi là KHÔNG thoả
 * mãn, không throw — không được để lỗi cấu hình cũ chặn cả việc gửi đề xuất.
 *
 * Cố ý KHÔNG import "server-only" (giống lib/print-template.ts) để unit test
 * gọi thẳng được qua vitest — chỉ dùng lại từ code server (lib/server/requests.ts).
 */
export function evaluateCondition(
  rule: ConditionRule,
  values: Record<string, unknown>,
  fields: ProposalField[],
): boolean {
  const field = fields.find((f) => f.code === rule.fieldCode);
  if (!field) return false;

  const rawValue = values[field.id];

  if (rule.operator === "includes") {
    if (!Array.isArray(rawValue)) return false;
    return rawValue.some((v) => String(v) === rule.value);
  }

  const stringValue = rawValue === undefined || rawValue === null ? "" : String(rawValue);
  if (rule.operator === "equals") return stringValue === rule.value;
  return stringValue !== rule.value; // not_equals
}

/**
 * Lọc ra các bước duyệt ÁP DỤNG ĐƯỢC (không có điều kiện, hoặc điều kiện
 * thoả mãn) — tách riêng khỏi resolveApproverSteps() (lib/server/requests.ts,
 * "server-only" vì đụng Firestore) để phần logic lọc thuần tuý này test được
 * bằng vitest, theo đúng cách lib/server/print-engine.ts đã tách trước đó.
 */
export function filterApplicableSteps(
  steps: ApproverStepDef[],
  values: Record<string, unknown>,
  fields: ProposalField[],
): ApproverStepDef[] {
  return steps.filter((step) => !step.condition || evaluateCondition(step.condition, values, fields));
}

/**
 * Hợp nhất 3 nguồn người theo dõi của 1 đề xuất khi gửi chính thức: danh
 * sách cố định của nhóm + người gửi tự thêm qua form + người theo dõi theo
 * điều kiện thoả mãn — loại trùng theo `id`, ưu tiên giữ bản ghi xuất hiện
 * TRƯỚC (cố định > tự thêm > theo điều kiện) khi cùng 1 người xuất hiện
 * nhiều nguồn (không ảnh hưởng kết quả cuối vì chỉ id được dùng để lọc).
 */
export function mergeFollowers(
  fixed: TaggedUser[],
  submitted: TaggedUser[],
  conditional: { condition: ConditionRule; users: TaggedUser[] }[],
  values: Record<string, unknown>,
  fields: ProposalField[],
): TaggedUser[] {
  const fromConditions = conditional
    .filter((item) => evaluateCondition(item.condition, values, fields))
    .flatMap((item) => item.users);

  const seen = new Set<string>();
  const result: TaggedUser[] = [];
  for (const user of [...fixed, ...submitted, ...fromConditions]) {
    if (seen.has(user.id)) continue;
    seen.add(user.id);
    result.push(user);
  }
  return result;
}
