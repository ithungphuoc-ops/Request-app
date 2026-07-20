/**
 * Firestore không cho phép một mảng chứa trực tiếp mảng khác bên trong
 * ("Property values contains an invalid nested entity") — trường kiểu Bảng
 * dùng string[][] để hiển thị/sửa, nhưng phải bọc mỗi dòng vào 1 object
 * trước khi ghi xuống Firestore, và mở lại khi đọc ra.
 */
export type WireTableRow = { cells: string[] };

export function serializeTableRows(rows: string[][]): WireTableRow[] {
  return rows.map((cells) => ({ cells }));
}

export function deserializeTableRows(value: unknown): string[][] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    if (Array.isArray(row)) return row as string[];
    if (row && typeof row === "object" && Array.isArray((row as WireTableRow).cells)) {
      return (row as WireTableRow).cells;
    }
    return [];
  });
}

/** Chuẩn hoá giá trị bất kỳ (string[][] cũ hoặc WireTableRow[] đã lưu) về đúng dạng lưu Firestore. */
export function toWireTableRows(value: unknown): WireTableRow[] {
  return serializeTableRows(deserializeTableRows(value));
}
