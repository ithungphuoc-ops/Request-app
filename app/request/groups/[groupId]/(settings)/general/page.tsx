"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useRequestContext } from "@/context/RequestContext";
import TagUserInput from "@/components/shared/TagUserInput";
import RichTextEditor from "@/components/shared/RichTextEditor";
import ApproverStepsEditor, {
  fromApproverSteps,
  toApproverSteps,
  type DraftApproverStep,
} from "@/components/request/ApproverStepsEditor";
import FollowersConditionalEditor, {
  type FollowersConditionalItem,
} from "@/components/request/FollowersConditionalEditor";
import RequireAdminRole from "@/components/request/RequireAdminRole";
import {
  confirmButtonClass,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/shared/form-styles";
import { categoryOptions } from "@/lib/mock-data";
import {
  approvalFlowDescriptions,
  approvalFlowLabels,
  type ApprovalFlowType,
  type TaggedUser,
} from "@/lib/types";
import { validateGroupName, validateSlaHours } from "@/lib/validation";

const flowOptions: ApprovalFlowType[] = ["concurrent", "sequential", "single"];

export default function GeneralSettingsPage() {
  return (
    <RequireAdminRole>
      <GeneralSettingsPageInner />
    </RequireAdminRole>
  );
}

function GeneralSettingsPageInner() {
  const params = useParams<{ groupId: string }>();
  const { getGroupById, updateGroup } = useRequestContext();
  const group = getGroupById(params.groupId);

  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [descriptionHtml, setDescriptionHtml] = useState(group?.descriptionHtml ?? "");
  const [requiresSubmissionForm, setRequiresSubmissionForm] = useState(
    group?.requiresSubmissionForm ?? true,
  );
  const [category, setCategory] = useState(group?.category ?? "");
  const [approvalFlow, setApprovalFlow] = useState<ApprovalFlowType>(group?.approvalFlow ?? "concurrent");
  const [slaHours, setSlaHours] = useState(group?.slaHours != null ? String(group.slaHours) : "");
  const [notifyManager, setNotifyManager] = useState(group?.notifyManager ?? true);
  const [usedFor, setUsedFor] = useState<TaggedUser[]>(group?.usedFor ?? []);
  const [approverSteps, setApproverSteps] = useState<DraftApproverStep[]>(
    fromApproverSteps(group?.approverSteps ?? []),
  );
  const [followers, setFollowers] = useState<TaggedUser[]>(group?.followers ?? []);
  const [followersConditional, setFollowersConditional] = useState<FollowersConditionalItem[]>(
    group?.followersConditional ?? [],
  );
  const [approverSlaEnabled, setApproverSlaEnabled] = useState(group?.approverSlaEnabled ?? false);
  const [slaByWorkCalendar, setSlaByWorkCalendar] = useState(group?.slaByWorkCalendar ?? false);
  const [requireDecisionNote, setRequireDecisionNote] = useState(group?.requireDecisionNote ?? {});

  const [errors, setErrors] = useState<{ name?: string; sla?: string; approvers?: string }>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!group) return;
    setName(group.name);
    setDescription(group.description);
    setDescriptionHtml(group.descriptionHtml ?? "");
    setRequiresSubmissionForm(group.requiresSubmissionForm ?? true);
    setCategory(group.category);
    setApprovalFlow(group.approvalFlow);
    setSlaHours(group.slaHours != null ? String(group.slaHours) : "");
    setNotifyManager(group.notifyManager);
    setUsedFor(group.usedFor);
    setApproverSteps(fromApproverSteps(group.approverSteps ?? []));
    setFollowers(group.followers);
    setFollowersConditional(group.followersConditional ?? []);
    setApproverSlaEnabled(group.approverSlaEnabled ?? false);
    setSlaByWorkCalendar(group.slaByWorkCalendar ?? false);
    setRequireDecisionNote(group.requireDecisionNote ?? {});
    // Chỉ đồng bộ lại khi chuyển sang nhóm khác, tránh ghi đè trong lúc đang sửa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id]);

  if (!group) return null;

  const handleSave = () => {
    const nameCheck = validateGroupName(name);
    const slaValue = slaHours.trim() === "" ? null : Number(slaHours);
    const slaCheck = validateSlaHours(slaValue);
    const steps = toApproverSteps(approverSteps);

    if (!nameCheck.valid || !slaCheck.valid || !steps) {
      setErrors({
        name: nameCheck.error,
        sla: slaCheck.error,
        approvers: steps ? undefined : "Còn bước duyệt chưa chọn người cố định.",
      });
      return;
    }

    setErrors({});
    updateGroup(group.id, {
      name: name.trim(),
      description,
      descriptionHtml,
      requiresSubmissionForm,
      category,
      approvalFlow,
      slaHours: slaValue,
      notifyManager,
      usedFor,
      approverSteps: steps,
      followers,
      followersConditional,
      approverSlaEnabled,
      slaByWorkCalendar,
      requireDecisionNote,
    });
    setSavedAt(Date.now());
  };

  return (
    <div className="max-w-[640px]">
      <h2 className="mb-4 text-[15px] font-semibold text-gray-800">Thiết lập chung</h2>

      <div className="flex flex-col gap-4">
        <Row label="Tên nhóm đề xuất" required>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          {errors.name && <p className="mt-1 text-[12px] text-[var(--color-danger-red)]">{errors.name}</p>}
        </Row>

        <Row label="Mô tả" description="Mô tả ngắn, hiển thị trong danh sách/tìm kiếm nhóm.">
          <textarea
            className={textareaClass}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Row>

        <Row
          label="Mô tả nhóm đề xuất"
          description="Hiển thị nổi bật ở đầu form Gửi đề xuất — hỗ trợ định dạng, giống Base.vn."
        >
          <RichTextEditor value={descriptionHtml} onChange={setDescriptionHtml} />
        </Row>

        <Row label="Mẫu form đề xuất?" description="Người gửi có bắt buộc điền các trường tuỳ chỉnh của nhóm không?">
          <select
            className={selectClass}
            value={requiresSubmissionForm ? "yes" : "no"}
            onChange={(e) => setRequiresSubmissionForm(e.target.value === "yes")}
          >
            <option value="yes">Có</option>
            <option value="no">Không</option>
          </select>
        </Row>

        <Row label="Phân loại">
          <input
            className={inputClass}
            list="general-category-options"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <datalist id="general-category-options">
            {categoryOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Row>

        <Row
          label="Người xét duyệt"
          description="Từng bước là 1 người cố định hoặc tự động lấy trưởng đơn vị của người gửi."
        >
          <ApproverStepsEditor value={approverSteps} onChange={setApproverSteps} fields={group.fields} />
          {errors.approvers && (
            <p className="mt-1 text-[12px] text-[var(--color-danger-red)]">{errors.approvers}</p>
          )}
        </Row>

        <Row label="SLA cho từng người duyệt" description="Bật/tắt SLA riêng cho từng bước duyệt (độc lập SLA chung của đề xuất).">
          <select
            className={selectClass}
            value={approverSlaEnabled ? "yes" : "no"}
            onChange={(e) => setApproverSlaEnabled(e.target.value === "yes")}
          >
            <option value="no">Tắt</option>
            <option value="yes">Kích hoạt</option>
          </select>
        </Row>

        <Row label="SLA theo lịch làm việc" description="Bỏ giờ ngoài hành chính/ngày nghỉ khi tính hạn xử lý.">
          <select
            className={selectClass}
            value={slaByWorkCalendar ? "yes" : "no"}
            onChange={(e) => setSlaByWorkCalendar(e.target.value === "yes")}
          >
            <option value="no">Không</option>
            <option value="yes">Có</option>
          </select>
        </Row>

        <Row label="Bắt buộc nhập ý kiến phê duyệt" description="Chặn người duyệt bỏ trống ghi chú khi thực hiện hành động tương ứng.">
          <div className="flex flex-col gap-1.5">
            {(
              [
                ["approve", "Chấp thuận"],
                ["reject", "Từ chối"],
                ["forward", "Chuyển tiếp"],
                ["approveAndForward", "Chấp thuận và chuyển tiếp"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-[13px] text-gray-700">
                <input
                  type="checkbox"
                  checked={requireDecisionNote[key] ?? false}
                  onChange={(e) =>
                    setRequireDecisionNote({ ...requireDecisionNote, [key]: e.target.checked })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </Row>

        <Row label="Quy trình xử lý" description={approvalFlowDescriptions[approvalFlow]}>
          <select
            className={selectClass}
            value={approvalFlow}
            onChange={(e) => setApprovalFlow(e.target.value as ApprovalFlowType)}
          >
            {flowOptions.map((flow) => (
              <option key={flow} value={flow}>
                {approvalFlowLabels[flow]}
              </option>
            ))}
          </select>
        </Row>

        <Row label="Thời hạn SLA (giờ)">
          <input
            type="number"
            min={0}
            className={inputClass}
            value={slaHours}
            onChange={(e) => setSlaHours(e.target.value)}
          />
          {errors.sla && <p className="mt-1 text-[12px] text-[var(--color-danger-red)]">{errors.sla}</p>}
        </Row>

        <Row label="Báo quản lý trực tiếp">
          <select
            className={selectClass}
            value={notifyManager ? "yes" : "no"}
            onChange={(e) => setNotifyManager(e.target.value === "yes")}
          >
            <option value="yes">Có</option>
            <option value="no">Không</option>
          </select>
        </Row>

        <Row label="Sử dụng cho" description="Để trống nghĩa là toàn công ty được tạo.">
          <TagUserInput value={usedFor} onChange={setUsedFor} />
        </Row>

        <Row label="Người theo dõi">
          <TagUserInput value={followers} onChange={setFollowers} />
        </Row>

        <Row
          label="Người theo dõi theo điều kiện"
          description="Chỉ thêm những người này làm người theo dõi khi đề xuất thoả điều kiện tương ứng."
        >
          <FollowersConditionalEditor
            value={followersConditional}
            onChange={setFollowersConditional}
            fields={group.fields}
          />
        </Row>

        <div className="flex items-center gap-3 pt-2">
          <button type="button" onClick={handleSave} className={`${confirmButtonClass} flex-none px-6`}>
            Lưu thay đổi
          </button>
          {savedAt && (
            <span className="text-[12px] text-gray-400">Đã lưu lúc {new Date(savedAt).toLocaleTimeString("vi-VN")}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  description,
  required,
  children,
}: {
  label: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[13px] font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-[var(--color-danger-red)]">*</span>}
      </label>
      {description && <p className="mb-1 text-[12px] text-gray-400">{description}</p>}
      {children}
    </div>
  );
}
