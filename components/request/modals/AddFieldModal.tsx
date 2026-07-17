"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import Modal from "@/components/shared/Modal";
import {
  cancelButtonClass,
  confirmButtonClass,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/shared/form-styles";
import { useRequestContext } from "@/context/RequestContext";
import { fieldDataTypeLabels, type FieldDataType } from "@/lib/types";
import { validateFieldName, validateFieldOptions } from "@/lib/validation";

const dataTypes = Object.keys(fieldDataTypeLabels) as FieldDataType[];
const choiceTypes: FieldDataType[] = ["single_choice", "multiple_choice"];
const tableTypes: FieldDataType[] = ["table", "base_table"];

export default function AddFieldModal() {
  const { addFieldModalGroupId, closeAddFieldModal, getGroupById, addField } =
    useRequestContext();

  const group = addFieldModalGroupId ? getGroupById(addFieldModalGroupId) : undefined;

  const [name, setName] = useState("");
  const [dataType, setDataType] = useState<FieldDataType>("short_text");
  const [required, setRequired] = useState(false);
  const [afterFieldId, setAfterFieldId] = useState<string>("");
  const [options, setOptions] = useState<string[]>([""]);
  const [tableColumns, setTableColumns] = useState<string[]>([""]);
  const [formula, setFormula] = useState("");
  const [errors, setErrors] = useState<{ name?: string; options?: string }>({});

  const existingNames = useMemo(() => group?.fields.map((f) => f.name.trim().toLowerCase()) ?? [], [group]);

  if (!addFieldModalGroupId || !group) return null;

  const resetForm = () => {
    setName("");
    setDataType("short_text");
    setRequired(false);
    setAfterFieldId("");
    setOptions([""]);
    setTableColumns([""]);
    setFormula("");
    setErrors({});
  };

  const handleClose = () => {
    closeAddFieldModal();
    resetForm();
  };

  const handleSubmit = () => {
    const nameCheck = validateFieldName(name);
    const cleanedOptions = options.map((o) => o.trim()).filter(Boolean);
    const optionsCheck = validateFieldOptions(dataType, cleanedOptions);

    if (!nameCheck.valid || !optionsCheck.valid) {
      setErrors({ name: nameCheck.error, options: optionsCheck.error });
      return;
    }

    if (existingNames.includes(name.trim().toLowerCase())) {
      setErrors({ name: "Mã trường phải duy nhất trong một nhóm (trùng tên trường đã có)." });
      return;
    }

    setErrors({});
    addField(
      group.id,
      {
        name: name.trim(),
        dataType,
        required,
        options: choiceTypes.includes(dataType) ? cleanedOptions : undefined,
        tableColumns: tableTypes.includes(dataType)
          ? tableColumns.map((c) => c.trim()).filter(Boolean)
          : undefined,
        formula: dataType === "formula" ? formula : undefined,
      },
      afterFieldId || null,
    );
    resetForm();
  };

  return (
    <Modal
      title="Thêm trường dữ liệu"
      width={720}
      onClose={handleClose}
      footer={
        <>
          <button type="button" onClick={handleClose} className={cancelButtonClass}>
            Hủy bỏ
          </button>
          <button type="button" onClick={handleSubmit} className={confirmButtonClass}>
            Thêm trường
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Row label="Tên trường" required>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Hiển thị làm nhãn trên mẫu đề xuất"
          />
          {errors.name && <p className="mt-1 text-[12px] text-[var(--color-danger-red)]">{errors.name}</p>}
        </Row>

        <Row label="Loại dữ liệu" required>
          <select
            className={selectClass}
            value={dataType}
            onChange={(e) => setDataType(e.target.value as FieldDataType)}
          >
            {dataTypes.map((type) => (
              <option key={type} value={type}>
                {fieldDataTypeLabels[type]}
              </option>
            ))}
          </select>
        </Row>

        <Row label="Bắt buộc trả lời">
          <select
            className={selectClass}
            value={required ? "yes" : "no"}
            onChange={(e) => setRequired(e.target.value === "yes")}
          >
            <option value="yes">Có</option>
            <option value="no">Không</option>
          </select>
        </Row>

        <Row label="Thứ tự đứng sau">
          <select
            className={selectClass}
            value={afterFieldId}
            onChange={(e) => setAfterFieldId(e.target.value)}
          >
            <option value="">Đầu danh sách</option>
            {group.fields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </Row>

        {choiceTypes.includes(dataType) && (
          <Row label="Các phương án">
            <div className="flex flex-col gap-2">
              {options.map((opt, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    className={inputClass}
                    value={opt}
                    onChange={(e) =>
                      setOptions((prev) => prev.map((o, i) => (i === index ? e.target.value : o)))
                    }
                    placeholder={`Phương án ${index + 1}`}
                  />
                  <button
                    type="button"
                    aria-label="Xóa phương án"
                    onClick={() => setOptions((prev) => prev.filter((_, i) => i !== index))}
                    className="text-gray-400 hover:text-[var(--color-danger-red)]"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setOptions((prev) => [...prev, ""])}
                className="flex items-center gap-1 self-start text-[12px] text-[var(--color-action-blue)]"
              >
                <Plus size={13} /> Thêm phương án
              </button>
              {errors.options && <p className="text-[12px] text-[var(--color-danger-red)]">{errors.options}</p>}
            </div>
          </Row>
        )}

        {tableTypes.includes(dataType) && (
          <Row label="Cấu hình cột">
            <div className="flex flex-col gap-2">
              {tableColumns.map((col, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    className={inputClass}
                    value={col}
                    onChange={(e) =>
                      setTableColumns((prev) => prev.map((c, i) => (i === index ? e.target.value : c)))
                    }
                    placeholder={`Tên cột ${index + 1}`}
                  />
                  <button
                    type="button"
                    aria-label="Xóa cột"
                    onClick={() => setTableColumns((prev) => prev.filter((_, i) => i !== index))}
                    className="text-gray-400 hover:text-[var(--color-danger-red)]"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setTableColumns((prev) => [...prev, ""])}
                className="flex items-center gap-1 self-start text-[12px] text-[var(--color-action-blue)]"
              >
                <Plus size={13} /> Thêm cột
              </button>
            </div>
          </Row>
        )}

        {dataType === "formula" && (
          <Row label="Biểu thức">
            <textarea
              className={textareaClass}
              rows={3}
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="Ví dụ: SO_LUONG * DON_GIA"
            />
          </Row>
        )}
      </div>
    </Modal>
  );
}

function Row({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="w-[160px] shrink-0 pt-1.5">
        <p className="text-[13px] font-medium text-gray-700">
          {label}
          {required && <span className="ml-0.5 text-[var(--color-danger-red)]">*</span>}
        </p>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
