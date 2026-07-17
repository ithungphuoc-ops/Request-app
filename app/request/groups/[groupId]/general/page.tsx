"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useRequestContext } from "@/context/RequestContext";
import TagUserInput from "@/components/shared/TagUserInput";
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
  const params = useParams<{ groupId: string }>();
  const { getGroupById, updateGroup } = useRequestContext();
  const group = getGroupById(params.groupId);

  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [category, setCategory] = useState(group?.category ?? "");
  const [approvalFlow, setApprovalFlow] = useState<ApprovalFlowType>(group?.approvalFlow ?? "concurrent");
  const [slaHours, setSlaHours] = useState(group?.slaHours != null ? String(group.slaHours) : "");
  const [notifyManager, setNotifyManager] = useState(group?.notifyManager ?? true);
  const [usedFor, setUsedFor] = useState<TaggedUser[]>(group?.usedFor ?? []);
  const [approvers, setApprovers] = useState<TaggedUser[]>(group?.approvers ?? []);
  const [followers, setFollowers] = useState<TaggedUser[]>(group?.followers ?? []);

  const [errors, setErrors] = useState<{ name?: string; sla?: string }>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!group) return;
    setName(group.name);
    setDescription(group.description);
    setCategory(group.category);
    setApprovalFlow(group.approvalFlow);
    setSlaHours(group.slaHours != null ? String(group.slaHours) : "");
    setNotifyManager(group.notifyManager);
    setUsedFor(group.usedFor);
    setApprovers(group.approvers);
    setFollowers(group.followers);
    // Chỉ đồng bộ lại khi chuyển sang nhóm khác, tránh ghi đè trong lúc đang sửa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id]);

  if (!group) return null;

  const handleSave = () => {
    const nameCheck = validateGroupName(name);
    const slaValue = slaHours.trim() === "" ? null : Number(slaHours);
    const slaCheck = validateSlaHours(slaValue);

    if (!nameCheck.valid || !slaCheck.valid) {
      setErrors({ name: nameCheck.error, sla: slaCheck.error });
      return;
    }

    setErrors({});
    updateGroup(group.id, {
      name: name.trim(),
      description,
      category,
      approvalFlow,
      slaHours: slaValue,
      notifyManager,
      usedFor,
      approvers,
      followers,
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

        <Row label="Mô tả">
          <textarea
            className={textareaClass}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
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

        <Row label="Người xét duyệt">
          <TagUserInput value={approvers} onChange={setApprovers} />
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
