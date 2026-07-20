## 1. Dữ liệu

- [x] 1.1 Mở rộng `RequestComment` trong `lib/types.ts`: thêm `mentionIds?: string[]`, `parentId?: string | null`, `editedAt?: string`
- [x] 1.2 Thêm `mentionedUids?: string[]` vào `RequestInstance`
- [x] 1.3 Thêm `getAdminAuth()` vào `lib/firebase/admin.ts` (dùng để mint custom token)

## 2. Cầu nối xác thực Firebase Client SDK

- [x] 2.1 Cài dependency `firebase` (client SDK)
- [x] 2.2 Xin/khai báo biến môi trường `NEXT_PUBLIC_FIREBASE_*` cho project riêng của app (từ Firebase Console) — đã lấy từ Sếp, ghi vào `.env.local` (local dev); **CẦN SẾP TỰ LÀM**: thêm 6 giá trị này vào Vercel → Settings → Environment Variables (Production) để chạy được trên production, hiện chỉ có ở local
- [x] 2.3 Tạo `lib/firebase/client.ts` — khởi tạo Firebase Client SDK (lazy init, theo pattern `lib/hpcore.ts`/`lib/firebase/admin.ts` đã có)
- [x] 2.4 Tạo `app/api/auth/firebase-token/route.ts`: `requireSession()` rồi `getAdminAuth().createCustomToken(session.uid)`, trả token cho client
- [x] 2.5 Tạo `firestore.rules` cho project riêng của app (chưa từng tồn tại) — `match /requests/{requestId} { allow read: if isSignedIn(); allow write: if false; }`
- [ ] 2.6 Deploy `firestore.rules` TRƯỚC khi deploy code — **CẦN SẾP TỰ LÀM**: `firebase deploy --only firestore:rules --project hpcons-request` từ máy đã `firebase login`, hoặc dán nội dung `firestore.rules` vào Firebase Console (project Hpcons-Request) → Firestore Database → Rules → Publish. Trước khi publish, real-time sẽ báo lỗi "Missing or insufficient permissions"; API tạo/sửa/xóa bình luận vẫn hoạt động bình thường (qua Admin SDK, không phụ thuộc rule).

## 3. API bình luận

- [x] 3.1 `POST /api/requests/[id]/comments`: nhận thêm `mentionIds`, `parentId`; nếu `parentId` trỏ tới 1 trả lời (không phải gốc), tự quy về `parentId` của trả lời đó
- [x] 3.2 Sau khi tạo bình luận có mention, cập nhật `mentionedUids` trên `requests/{id}` (hợp nhất, loại trùng, loại trừ chính người vừa bình luận nếu tự mention mình — xem Open Questions trong design.md)
- [x] 3.3 Thêm `PATCH /api/requests/[id]/comments/[commentId]/route.ts`: chỉ tác giả sửa được nội dung, set `editedAt`
- [x] 3.4 Thêm `DELETE` cùng route: tác giả HOẶC `canManageGroupsAtAppScope(session.role)` mới xóa được

## 4. Nguồn mention nhóm/phòng ban

- [x] 4.1 Thêm hàm đọc `getHpcoreDb().collection("memberGroups")` và `.collection("departments")`, map về dạng tương thích `TaggedUser` kèm cờ phân biệt loại
- [x] 4.2 Tạo `app/api/directory/mentionable/route.ts` (route mới, KHÔNG sửa `/api/directory` hiện có) — trả về cả người lẫn nhóm/phòng ban

## 5. UI

- [x] 5.1 Mở rộng `TagUserInput` (hoặc tạo biến thể) để phân biệt hiển thị "người" vs "nhóm/phòng ban" (icon/nhãn khác nhau) khi dùng cho mention — không đổi hành vi ở 3 nơi đang dùng nó cho usedFor/approverSteps/followers
- [x] 5.2 `RequestDetailView.tsx`: gắn ô mention vào khung Thảo luận, dùng route `app/api/directory/mentionable` (tách thành `components/request/CommentSection.tsx`)
- [x] 5.3 `RequestDetailView.tsx`: bootstrap real-time — gọi `/api/auth/firebase-token` 1 lần, `signInWithCustomToken`, mở `onSnapshot` trên `requests/{id}`, cập nhật state `comments` từ snapshot; unsubscribe khi rời trang
- [x] 5.4 Nút Sửa/Xóa trên mỗi bình luận: tác giả thấy Sửa+Xóa; Admin/Owner thấy Xóa (không phải tác giả); người khác không thấy nút nào
- [x] 5.5 Nút "Trả lời" trên mỗi bình luận (kể cả trên 1 trả lời) — luôn gán `parentId` về đúng bình luận gốc
- [x] 5.6 `NotificationBell.tsx`: thêm fetch `/api/requests?scope=mentioned`, hợp nhất với 2 nguồn cũ (inbox/mine) thành danh sách hiển thị

## 6. API scope mention cho NotificationBell

- [x] 6.1 `GET /api/requests`: thêm xử lý `scope=mentioned` — trả về các đề xuất có `mentionedUids` chứa uid hiện tại

## 7. Kiểm thử thủ công

- [ ] 7.1 Mở cùng 1 đề xuất ở 2 trình duyệt/2 tài khoản khác nhau — gửi bình luận ở 1 bên, xác nhận bên kia thấy ngay không cần F5
- [ ] 7.2 Mention 1 người cụ thể — tải lại `NotificationBell` của người đó, xác nhận thấy mục thông báo
- [ ] 7.3 Mention 1 nhóm nhiều người — xác nhận tất cả thành viên đều thấy thông báo khi tải lại
- [ ] 7.4 Trả lời 1 bình luận gốc, rồi trả lời chính trả lời đó — xác nhận cả 2 đều nằm phẳng dưới đúng 1 bình luận gốc
- [ ] 7.5 Tài khoản không phải tác giả, không phải Admin/Owner — thử sửa/xóa bình luận người khác → xác nhận bị từ chối 403
- [ ] 7.6 Tài khoản Admin/Owner xóa bình luận người khác → xác nhận thành công
- [ ] 7.7 Thử mở `onSnapshot` với 1 request ID không liên quan (không phải submitter/approver/follower/admin) — xác nhận rủi ro đã ghi nhận ở design.md (đọc được nhưng chấp nhận cho đợt này)
- [ ] 7.8 Kiểm tra 3 nơi cũ dùng `TagUserInput` (usedFor/approverSteps/followers) vẫn hoạt động đúng như trước, không bị ảnh hưởng bởi thay đổi
