import type { FieldDataType } from "./types";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const ok: ValidationResult = { valid: true };

export function validateGroupName(name: string): ValidationResult {
  if (!name.trim()) {
    return { valid: false, error: "Tên nhóm đề xuất không được để trống." };
  }
  return ok;
}

export function validateSlaHours(value: number | null): ValidationResult {
  if (value === null) return ok;
  if (!Number.isFinite(value) || value < 0) {
    return { valid: false, error: "Thời hạn chỉ nhận số không âm." };
  }
  return ok;
}

export function validateFieldName(name: string): ValidationResult {
  if (!name.trim()) {
    return { valid: false, error: "Tên trường không được để trống." };
  }
  return ok;
}

const choiceTypes: FieldDataType[] = ["single_choice", "multiple_choice"];

export function validateFieldOptions(
  dataType: FieldDataType,
  options: string[] | undefined,
): ValidationResult {
  if (!choiceTypes.includes(dataType)) return ok;
  if (!options || options.filter((o) => o.trim()).length === 0) {
    return {
      valid: false,
      error: "Danh sách một lựa chọn hoặc nhiều lựa chọn phải có ít nhất một phương án.",
    };
  }
  return ok;
}

export function validateFieldCodeUnique(
  existingCodes: string[],
  code: string,
): ValidationResult {
  if (existingCodes.includes(code)) {
    return { valid: false, error: "Mã trường phải duy nhất trong một nhóm." };
  }
  return ok;
}

export function validatePermissionSelection(
  selectedCodes: string[],
): ValidationResult {
  if (selectedCodes.length === 0) {
    return { valid: false, error: "Vui lòng chọn ít nhất một quyền quản trị ứng dụng." };
  }
  return ok;
}
