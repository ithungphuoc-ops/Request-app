"use client";

import { useState } from "react";
import Modal from "@/components/shared/Modal";
import { cancelButtonClass, confirmButtonClass, textareaClass } from "@/components/shared/form-styles";

export default function ReasonModal({
  title,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!note.trim()) {
      setError("Cần nhập lý do.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(note.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={title}
      width={440}
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
            {submitting ? "Đang gửi..." : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-medium text-gray-700">
          Lý do <span className="text-[var(--color-danger-red)]">*</span>
        </label>
        <textarea
          className={textareaClass}
          rows={4}
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nhập lý do..."
        />
        {error && <p className="text-[12px] text-[var(--color-danger-red)]">{error}</p>}
      </div>
    </Modal>
  );
}
