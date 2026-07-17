import "server-only";
import { adminDb } from "@/lib/firebase/admin";

/** Đảm bảo tồn tại tài liệu `categories` cho tên danh mục này, tạo mới nếu chưa có. */
export async function ensureCategoryExists(categoryName: string): Promise<void> {
  const categoriesRef = adminDb.collection("categories");
  const existing = await categoriesRef.where("name", "==", categoryName).limit(1).get();
  if (!existing.empty) return;

  const count = (await categoriesRef.count().get()).data().count;
  await categoriesRef.add({
    code: String(count + 1).padStart(2, "0"),
    name: categoryName,
  });
}
