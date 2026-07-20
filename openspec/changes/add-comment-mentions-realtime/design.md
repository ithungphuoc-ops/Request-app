## Context

base-request-app hiện KHÔNG có Firebase Client SDK nào (`package.json` chỉ có `firebase-admin`) — đăng nhập hoàn toàn qua cookie SSO `session` (domain `.hpcore.vn`), xác minh phía server bằng `verifyHpcore()` (dùng Admin SDK riêng tên `"hpcore"` trỏ về project Firestore của hpcons-portal). Dữ liệu nghiệp vụ của app này (groups, categories, **requests**) nằm ở 1 project Firebase KHÁC (Admin SDK mặc định, `lib/firebase/admin.ts`).

Sếp đã tự đối mặt đúng bài toán này ở 1 project song song (`pkd_crm-next`, đổi `notify-step-transitions`, 14/07/2026) và chọn **poll 15s, không dùng Firestore Client SDK** — lý do: không có Firebase Auth phía client, chi phí dựng lại xác thực không tương xứng lợi ích cho nghiệp vụ đó. Với đổi này, Sếp xác nhận rõ muốn **real-time thật** cho bình luận (không phải poll) — nên design này ĐI NGƯỢC lại quyết định mặc định đó một cách có chủ đích, chấp nhận chi phí dựng cầu nối xác thực.

Khung "Thảo luận" hiện tại (`RequestDetailView.tsx` + `app/api/requests/[id]/comments/route.ts`) đã hoạt động: text thuần, lưu trong mảng `RequestInstance.comments`, gọi `onActed()` (load lại toàn bộ) sau khi gửi. `TagUserInput` + `/api/directory` đã có sẵn cơ chế "gõ tìm người" (đọc `users` từ Firestore hpcore qua `getHpcoreDb()`), dùng cho `usedFor`/`approverSteps`/`followers`.

## Goals / Non-Goals

**Goals:**
- Bình luận trên 1 đề xuất cập nhật tức thời cho mọi người đang mở trang chi tiết đề xuất đó, qua Firestore Client SDK `onSnapshot` thật (không phải poll).
- @mention người (tái dùng `TagUserInput`/`/api/directory` sẵn có) và nhóm thành viên/phòng ban (nguồn mới, đọc từ Firestore hpcore).
- Tác giả sửa/xóa bình luận của mình; Admin/Owner (app tổng) xóa được bình luận bất kỳ.
- Trả lời 1 cấp (không lồng sâu hơn).
- Mention hiển thị trong `NotificationBell` hiện có, không cần collection `notifications` mới.

**Non-Goals:**
- Không làm `NotificationBell` real-time (bell hiện tại tính lại 1 lần lúc tải trang, không poll, không listener) — giữ nguyên hành vi đó, chỉ thêm 1 nguồn dữ liệu mới (mention) vào cùng cách tính hiện tại. Nếu sau này cần bell cũng "sống", đó là 1 change riêng.
- Không thêm rich-text/thư viện mention mới — `TagUserInput` đã đủ, chỉ mở rộng nguồn dữ liệu.
- Không đổi cấu trúc lưu trữ bình luận (vẫn là mảng nhúng trong `requests/{id}.comments`, không tách subcollection riêng) — tránh migration không cần thiết, và document-level `onSnapshot` đã đủ để nghe toàn bộ mảng thay đổi.
- Không cho nhóm/phòng ban làm `usedFor`/`approverSteps`/`followers` — 3 chỗ đó giữ nguyên chỉ nhận cá nhân, không mở rộng phạm vi ngoài yêu cầu.

## Decisions

1. **Real-time bằng cầu nối custom token, không đổi luồng đăng nhập chính.** Thêm `POST /api/auth/firebase-token`: xác minh cookie SSO như mọi route khác (`requireSession()`), rồi dùng Admin SDK **của chính base-request-app** (không phải `hpcore`) để `getAuth().createCustomToken(session.uid)`. Client gọi endpoint này 1 lần lúc vào trang chi tiết đề xuất, `signInWithCustomToken()` (ẩn, người dùng không thấy màn hình đăng nhập nào khác) rồi mới mở `onSnapshot`. Lý do dùng Admin SDK riêng của app (không phải `hpcore`): dữ liệu cần nghe (`requests`) nằm ở project riêng của app này, `request.auth` trong Firestore Rules chỉ có tác dụng trong ĐÚNG project đang được nghe.

2. **Nghe toàn bộ document `requests/{id}`, không tách `comments` thành subcollection riêng.** Khi mảng `comments` thay đổi, cả document thay đổi, listener nhận lại toàn bộ `RequestInstance` mới — component chỉ cần lấy `snapshot.data().comments`. **Thay thế đã xét**: subcollection `requests/{id}/comments/{commentId}` (mỗi bình luận 1 doc) — cho phép rule/query tinh vi hơn nhưng đòi hỏi viết lại toàn bộ luồng đọc/ghi bình luận hiện có (đang là mảng nhúng) — không tương xứng lợi ích ở quy mô 1 đề xuất thường vài chục bình luận.

3. **`firestore.rules` cho project riêng của app — chỉ yêu cầu đã đăng nhập (`allow read: if isSignedIn()`), không tái tạo đầy đủ logic `canView()` trong rules.** Lý do: `canView()` kiểm tra `submittedBy`/`approversSnapshot`/`followers` (mảng object, không phải mảng id đơn giản) — biểu diễn chính xác trong Firestore Rules tốn công không tương xứng. Vì client đã đi qua `GET` (có `canView()` đầy đủ phía server) để tải dữ liệu ban đầu trước khi mở listener, rủi ro còn lại chỉ là 1 nhân viên biết trước ID đề xuất không liên quan tự mở listener trực tiếp — chấp nhận được cho 1 công cụ nội bộ, ghi rõ ở Risks.

4. **Mention lưu id có cấu trúc** (`mentionIds: string[]`) — không phân tách 2 mảng người/nhóm, giống hpcons-portal đã quyết (đỡ phải tự phân loại phía client, `TagUserInput` trả về danh sách chọn thống nhất).

5. **Nguồn "nhóm/phòng ban" cho mention**: thêm hàm đọc `getHpcoreDb().collection("memberGroups")` và `.collection("departments")`, tương tự cách `/api/directory` đang đọc `users`. Tạo endpoint MỚI `app/api/directory/mentionable` (không sửa `/api/directory` hiện có) để không ảnh hưởng 3 nơi đang dùng nó (`usedFor`, `approverSteps`, `followers` — vẫn chỉ nhận cá nhân).

6. **Trả lời 1 cấp**: `parentId` luôn trỏ về bình luận GỐC (không có `parentId` riêng) — bấm "Trả lời" trên 1 trả lời thì tự quy về gốc của trả lời đó, giống quyết định đã áp dụng cho hpcons-portal.

7. **Quyền sửa/xóa**: sửa — chỉ tác giả (`authorUid === session.uid`). Xóa — tác giả HOẶC `canManageGroupsAtAppScope(session.role)` (đã có sẵn, dùng cho cấu hình nhóm đề xuất — tái dùng đúng khái niệm "Admin/Owner app tổng" y hệt).

8. **Thông báo mention tái dùng mô hình "tính lại lúc tải" của `NotificationBell`** — thêm field `mentionedUids?: string[]` trên `RequestInstance` (hợp nhất mọi uid từng được mention qua các bình luận + trả lời của đề xuất đó, cập nhật mỗi lần có bình luận mới), và 1 scope mới `?scope=mentioned` cho `GET /api/requests` (trả về các đề xuất có `mentionedUids` chứa uid hiện tại). `NotificationBell` gọi thêm scope này, hợp nhất với 2 nguồn cũ (inbox/mine). Không có khái niệm "đã đọc" riêng cho mục này — giống hệt cách 2 nguồn cũ đang hoạt động (không lưu trạng thái đọc).

## Risks / Trade-offs

- **[Risk]** `allow read: if isSignedIn()` trên `requests/{id}` không lọc theo `canView()` đầy đủ — 1 nhân viên biết ID đề xuất không liên quan có thể tự mở listener đọc được nội dung (không phải chỉ bình luận, mà toàn bộ document) → **Mitigation**: chấp nhận cho đợt này (nội bộ, ID không đoán được ngẫu nhiên, không liệt kê danh sách được vì luôn cần biết đúng ID trước); ghi rõ để xem lại nếu dữ liệu đề xuất trở nên nhạy cảm hơn.
- **[Risk]** Đây là lần đầu app dùng Firebase Client SDK + custom token — thêm 1 lớp lỗi mới có thể gặp (token hết hạn giữa phiên, cần refresh; listener không unsubscribe đúng lúc rời trang) → **Mitigation**: `onAuthStateChanged`/refresh token theo cơ chế mặc định của Firebase SDK (tự refresh ID token nền, không cần code thêm); unsubscribe `onSnapshot` khi component unmount.
- **[Risk]** Cần thêm biến môi trường `NEXT_PUBLIC_FIREBASE_*` cho project riêng của app — hiện chưa có, phải xin từ Firebase Console trước khi chạy được tính năng này ở local/production.
- **[Trade-off]** Không làm `NotificationBell` real-time trong đợt này — người dùng vẫn phải tải lại trang để thấy thông báo mention mới, dù bản thân bình luận (khi đang mở đúng đề xuất) đã real-time. Chấp nhận vì đây đúng ranh giới Sếp đã xác nhận (real-time cho bình luận, bell giữ nguyên cơ chế cũ).

## Migration Plan

- Không có dữ liệu cũ cần chuyển đổi (`comments` giữ nguyên cấu trúc mảng, chỉ thêm field mới; field thiếu ở bình luận cũ coi như không có mention/không phải trả lời).
- Thứ tự triển khai: (1) tạo `firestore.rules` + deploy rules cho project riêng của app, (2) xin/khai báo `NEXT_PUBLIC_FIREBASE_*`, (3) deploy code — tránh code gọi `onSnapshot` chạy trước khi có rule cho phép đọc.
- Rollback: revert deploy code; rule đọc thêm để lại không ảnh hưởng gì nếu không có client nào gọi tới.

## Open Questions

- `mentionedUids` có cần loại trừ chính người vừa viết bình luận (nếu họ tự mention lại chính mình) không? Đề xuất: loại trừ `session.uid` khỏi tập hợp nhận thông báo/mentionedUids khi họ tự mention mình — tránh tự báo cho chính mình, giống quyết định tương tự Sếp đã áp dụng cho `pkd_crm-next`.
- Token custom token nên refresh theo chu kỳ nào nếu người dùng mở trang chi tiết đề xuất rất lâu (nhiều giờ)? Firebase Client SDK tự refresh ID token, nhưng custom token gốc (JWT do server ký) có thời hạn ngắn (~1 giờ) — cần xác nhận `signInWithCustomToken` chỉ cần gọi 1 lần, các lần refresh sau do SDK tự lo, không cần gọi lại `/api/auth/firebase-token`.
