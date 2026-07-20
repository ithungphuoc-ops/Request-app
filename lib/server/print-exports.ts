import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import type { PrintExportRecord } from "@/lib/types";

/**
 * Ghi lại 1 lần xuất file theo mẫu — CHỈ metadata (mã đề xuất, mẫu, người
 * thực hiện, thành công/thất bại...), KHÔNG bao giờ ghi nội dung/giá trị
 * thật của đề xuất hay toàn văn lỗi kỹ thuật vào đây.
 */
export async function logPrintExport(record: Omit<PrintExportRecord, "id">): Promise<void> {
  await adminDb.collection("printExports").add(record);
}
