import { config } from "dotenv";
config({ path: ".env.local" });

import { adminDb } from "../lib/firebase/admin";
import { categoryGroups } from "../lib/mock-data";

/**
 * Nạp dữ liệu mẫu (4 nhóm đề xuất trong lib/mock-data.ts) vào Firestore thật
 * để có dữ liệu thử nghiệm ban đầu — chạy 1 lần khi mới tạo Firebase project
 * cho base-request-app: `npx tsx scripts/seed-groups.ts`.
 */
async function seed() {
  for (const category of categoryGroups) {
    const categoryRef = adminDb.collection("categories").doc();
    await categoryRef.set({ code: category.code, name: category.name });
    console.log(`[categories] ${category.name}`);

    for (const group of category.groups) {
      const { id: _mockId, ...groupData } = group;
      await adminDb.collection("groups").add(groupData);
      console.log(`  [groups] ${group.name}`);
    }
  }
  console.log("\nSeed xong.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
