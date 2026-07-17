"use client";

import { useState } from "react";
import Modal from "@/components/shared/Modal";
import TagUserInput from "@/components/shared/TagUserInput";
import {
  cancelButtonClass,
  confirmButtonClass,
  textareaClass,
} from "@/components/shared/form-styles";
import type { TaggedUser } from "@/lib/types";

export default function ForwardModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (target: TaggedUser, note: string) => Promise<void>;
}) {
  const [target, setTarget] = useState<TaggedUser[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (target.length === 0) {
      setError("Chọn người nhận chuyển tiếp.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(target[0], note);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Chuyển tiếp đề xuất"
      width={480}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={cancelButtonClass}>
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={confirmButtonClass}
          >
            {submitting ? "Đang gửi..." : "Xác nhận"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-gray-700">
            Người nhận <span className="text-[var(--color-danger-red)]">*</span>
          </label>
          <TagUserInput
            value={target}
            onChange={(users) => setTarget(users.slice(-1))}
            placeholder="Gõ @ để tìm người nhận"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-gray-700">Lý do/ghi chú</label>
          <textarea
            className={textareaClass}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        {error && <p className="text-[12px] text-[var(--color-danger-red)]">{error}</p>}
      </div>
    </Modal>
  );
}
