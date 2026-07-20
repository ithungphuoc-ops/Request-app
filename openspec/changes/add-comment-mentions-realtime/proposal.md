## Why

Khung "Thảo luận" trên trang chi tiết đề xuất (`RequestDetailView`) hiện chỉ gửi text thuần, không @mention được ai, không cập nhật tức thời (phải tự load lại qua `onActed()`), không sửa/xóa/trả lời được. Cần nâng cấp thành khung bình luận đầy đủ: @mention người + nhóm/phòng ban, cập nhật real-time thật (không phải poll), sửa/xóa bình luận của mình, trả lời 1 cấp, và Admin/Owner kiểm duyệt xóa được bình luận bất kỳ.

## What Changes

- Mở rộng `RequestComment`: thêm `mentionIds` (uid người + id nhóm/phòng ban), `parentId` (trả lời 1 cấp), `editedAt`.
- Ô nhập bình luận dùng lại **`TagUserInput`** đã có (không thêm thư viện mới) — mở rộng nguồn gợi ý để bao gồm cả nhóm thành viên/phòng ban (đọc từ Firestore hpcore qua `getHpcoreDb()`, cùng cách `/api/directory` đang đọc `users`), không chỉ cá nhân.
- **Real-time thật** cho khung bình luận: client lắng nghe trực tiếp document `requests/{id}` qua Firestore Client SDK (`onSnapshot`) — **BREAKING (hạ tầng, không phải API công khai)**: đây là lần đầu base-request-app dùng Firestore Client SDK ở trình duyệt. App hiện chỉ auth qua cookie SSO (không có Firebase Auth phía client) nên cần dựng cầu nối: server cấp **custom token** (ký bằng Admin SDK của chính app này) sau khi xác minh cookie SSO, client dùng token đó đăng nhập Firebase Auth (ẩn, không đổi trải nghiệm đăng nhập hiện tại) rồi mới mở được listener.
- Thêm `firestore.rules` cho project Firebase riêng của base-request-app (**hiện chưa tồn tại file này**) — cho phép đọc `requests/{id}` khi đã đăng nhập (qua custom token ở trên), mọi ghi vẫn qua API route (Admin SDK), không đổi.
- Sửa/xóa bình luận: tác giả tự sửa/xóa bình luận của mình; Admin/Owner (`canManageGroupsAtAppScope`) xóa được bất kỳ bình luận nào.
- Mention → thông báo: tái dùng đúng mô hình `NotificationBell` hiện có (tự tính lại danh sách thông báo lúc tải, KHÔNG có collection `notifications` riêng) — thêm 1 nguồn thứ 3: các đề xuất có mặt uid hiện tại trong `mentionedUids` (trường mới, gộp toàn bộ người/nhóm từng được mention trong các bình luận của đề xuất đó).

## Capabilities

### New Capabilities
- `request-comment-mentions`: Toàn bộ hành vi bình luận trên 1 đề xuất — @mention người/nhóm, cập nhật real-time, sửa/xóa/trả lời, kiểm duyệt, và tích hợp vào chuông thông báo hiện có.

### Modified Capabilities
*(`openspec/specs/` hiện chưa có capability nào được spec hóa cho app này — toàn bộ đưa vào New Capabilities ở trên)*

## Impact

- `lib/types.ts` — mở rộng `RequestComment` (mentionIds, parentId, editedAt); thêm `mentionedUids?: string[]` vào `RequestInstance`.
- `app/api/requests/[id]/comments/route.ts` — `POST` nhận thêm `mentionIds`/`parentId`; thêm `PATCH`/`DELETE` cho sửa/xóa 1 bình luận cụ thể.
- `app/api/directory/route.ts` — giữ nguyên (chỉ người, dùng cho usedFor/approver/followers); thêm route mới `app/api/directory/mentionable/route.ts` (người + nhóm/phòng ban, chỉ dùng cho mention trong bình luận).
- `app/api/auth/firebase-token/route.ts` (mới) — mint custom token từ session SSO đã xác minh.
- `lib/firebase/client.ts` (mới) — khởi tạo Firebase Client SDK cho project riêng của base-request-app.
- `lib/firebase/admin.ts` — thêm export `getAdminAuth()` (mint custom token).
- `firestore.rules` (mới, project chưa từng có file này) — rule đọc `requests/{id}`.
- `components/shared/TagUserInput.tsx` — mở rộng để hỗ trợ hiển thị khác nhau giữa "người" và "nhóm/phòng ban" (không đổi hành vi các nơi đang dùng nó cho usedFor/approver/followers).
- `components/request/RequestDetailView.tsx` — khung Thảo luận: mention, real-time listener, sửa/xóa/trả lời.
- `components/request/NotificationBell.tsx` — thêm nguồn "được mention" (query `scope=mentioned` mới).
- `package.json` — thêm dependency `firebase` (client SDK) — chưa từng có trong app này.
- Cần thêm biến môi trường `NEXT_PUBLIC_FIREBASE_*` (config Firebase Client SDK cho project riêng của app) — xin từ Firebase Console.
