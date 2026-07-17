> Đã đối chiếu với đặc tả gốc (`Dac-ta-su-dung-hang-ngay-Base-Request.md`). Nhóm 1-13 đã code xong. Nhóm 14 (xác minh) một phần bị chặn vì chưa có Firebase project thật.

## 1. Dọn dẹp: xoá base-account — XONG

- [x] 1.1–1.4 — đã xoá `app/base-account/*`, dọn `mock-data.ts`.

## 2. Tích hợp SSO hpcore — XONG

- [x] 2.1–2.8 — `lib/hpcore.ts`, `lib/firebase/admin.ts`, `lib/session.ts`, `middleware.ts`, logout, `/api/roles`, `/api/directory` + `/api/session` (whoami cho client component).

## 3. Firestore schema + API routes cho groups/categories — XONG

- [x] 3.1–3.4 — `RequestInstance`, `GET/POST /api/groups`, `PATCH /api/groups/[id]`, field CRUD, seed script.

## 4. Nối context/RequestContext.tsx với API thật — XONG

- [x] 4.1–4.4.

## 5. API submit/inbox — XONG (mở rộng ở nhóm 9-10)

- [x] 5.1–5.4.
- [x] 5.5 — logic lõi (`forwardApprover`, `applyApproverDecision`, `getRequestStatus`) có test đầy đủ trong `lib/approval-logic.test.ts` (36/36 xanh); phần glue Firestore trong route KHÔNG có test riêng (cần Firebase emulator/project thật — xem nhóm 14).

## 6. Giao diện luồng người dùng cuối (bản đầu) — XONG, thay thế ở nhóm 9-11

- [x] 6.1–6.5 — đã thay bằng bản đầy đủ hơn ở nhóm 9-11 (my-requests/inbox giờ dẫn vào trang chi tiết thay vì action inline).

## 7. Xác minh đợt 1 — XONG

- [x] 7.1, 7.2, 7.5, 7.6.
- [x] 7.3, 7.4 — gộp vào nhóm 14 (vẫn chờ Firebase project thật).

---

## 8. Mở rộng mô hình dữ liệu — XONG

- [x] 8.1 `RequestInstance.status`: `"draft" | "pending" | "approved" | "rejected" | "returned"`.
- [x] 8.2 `deadlineAt: string | null`, `groupId: string | null` (đề xuất trực tiếp).
- [x] 8.3 `forwardApprover(flow, approvers, fromId, toId)` trong `lib/approval-logic.ts` — hàm mới, 3 hàm cũ không đổi. 6 test mới (concurrent/sequential/single + 3 case lỗi) — `lib/approval-logic.test.ts`.
- [x] 8.4 Quyết định: `getRequestStatus` giữ nguyên; API tầng trên (`app/api/requests/route.ts`, `app/api/requests/[id]/route.ts`) tự xử lý `draft` trước khi chạm tới approval-logic — draft có `approvers: []` nên `canApproverAct`/`applyApproverDecision` tự nhiên trả về false/ném lỗi nếu ai đó cố duyệt một bản nháp.

## 9. Lưu nháp — XONG

- [x] 9.1 `POST /api/requests` nhận `isDraft`; `PATCH /api/requests/[id]` sửa nháp hoặc chuyển sang gửi chính thức (`isDraft: false`).
- [x] 9.2 Trang submit: nút "Lưu nháp" cạnh "Gửi đề xuất", validate lỏng hơn khi lưu nháp.
- [x] 9.3 "Đề xuất của tôi" hiển thị nháp, link vào lại `?draftId=` (submit hoặc direct/new tuỳ `groupId`).
- [x] 9.4 `GET/PATCH /api/requests/[id]` chặn người khác xem/sửa nháp không phải của mình (403, hàm `canView`).

## 10. Ba hành động: Chấp thuận / Chuyển tiếp / Từ chối — XONG

- [x] 10.1–10.3 `POST /api/requests/[id]/decision` nhận `decision: "approved"|"rejected"|"forwarded"` (+ `target`, `note` khi forward), ghi lịch sử đầy đủ.
- [x] 10.4 Logic lõi có test (nhóm 8.3); route/Firestore glue chưa test được thiếu Firebase thật — cùng giới hạn với 5.5.

## 11. Trang chi tiết đề xuất + cửa sổ chọn nhóm — XONG

- [x] 11.1 `app/request/requests/[id]/page.tsx` — 2 cột (nội dung + thanh bên duyệt/theo dõi/lịch sử), 3 nút hành động khi đúng lượt (dùng `canApproverAct` phía client để hiện/ẩn nút — máy chủ vẫn là nơi quyết định cuối).
- [x] 11.2 `GET /api/requests/[id]` — 403 nếu không liên quan, nháp chỉ chủ xem được.
- [x] 11.3 `my-requests`/`inbox` dẫn link vào trang chi tiết, bỏ action inline.
- [x] 11.4 `components/request/GroupPickerModal.tsx` — tìm nhanh + danh sách nhóm `active` + "Đề xuất trực tiếp". **Đơn giản hoá đã ghi nhận**: lọc theo `status === "active"` phía client, CHƯA lọc chính xác theo `usedFor` scope của người dùng ở bước hiển thị (server vẫn chặn đúng khi gửi thật qua `isWithinUsedForScope`) — nếu cần lọc đúng ngay ở bước chọn, làm thêm sau.
- [x] 11.5 Quyết định: `/request` là trang chủ end-user mới (nút "Tạo đề xuất", đếm nhanh, đề xuất gần đây), `/request/groups` giữ nguyên làm khu vực "Tùy chỉnh" (admin cấu hình nhóm) — cập nhật `app/page.tsx` redirect + `FuncBar`/`AppBar` điều hướng theo đúng phân chia này.

## 12. Đề xuất trực tiếp + hạn xử lý + thông báo mở rộng — XONG

- [x] 12.1 `app/request/direct/new/page.tsx` (bọc `Suspense` vì dùng `useSearchParams` trên route tĩnh).
- [x] 12.2 `POST/PATCH /api/requests` hỗ trợ `groupId: null`.
- [x] 12.3 `deadlineAt` tính từ `slaHours` lúc gửi (`lib/server/requests.ts#computeDeadline`), hiển thị ở trang chi tiết + hộp thư chờ duyệt.
- [x] 12.4 Nhãn "Quá hạn" tính lúc đọc (`isOverdue`), không lưu trạng thái riêng.
- [x] 12.5 `components/request/NotificationBell.tsx` — dropdown thay cho badge tĩnh cũ: gộp "đang chờ bạn duyệt"/"được chuyển tiếp" (từ inbox) + "đề xuất của bạn vừa được xử lý" (từ mine, status approved/rejected), sắp xếp theo thời gian, nhấp mở đúng trang chi tiết.

## 13. Trang tìm kiếm/lọc — XONG

- [x] 13.1 `app/request/search/page.tsx` — lọc trạng thái/nhóm/khoảng ngày (bọc `Suspense`).
- [x] 13.2 `GET /api/requests/search` — owner/app_admin thấy toàn bộ (trừ nháp người khác), thành viên thường chỉ thấy đề xuất liên quan tới mình. **Giới hạn kỹ thuật đã ghi nhận**: quét toàn collection `requests` rồi lọc trong bộ nhớ (không dùng composite index) — chấp nhận được ở quy mô nội bộ công ty, cần tối ưu nếu dữ liệu lớn lên nhiều.
- [x] 13.3 Lưu bộ lọc trên query string (`router.replace`), tải lại giữ nguyên bộ lọc.

## 14. Xác minh tổng thể

- [x] 14.1 `npm run test` — 36/36 xanh (gồm 6 test mới cho `forwardApprover`).
- [x] 14.2 `npm run build && npm run lint` — sạch.
- [x] Smoke-test bằng dev server: toàn bộ route mới (`/request`, `/request/direct/new`, `/request/search`, `/request/requests/[id]`, `/api/session`) trả 200/307 đúng, không lỗi render, `/api/session` trả đúng dev-fallback user.
- [ ] 14.3 CHƯA LÀM — kiểm thử thủ công đầu-cuối với dữ liệu Firestore thật (tạo nháp → sửa → gửi; sequential 3 người có 1 lần chuyển tiếp giữa chừng; quá hạn hiển thị đúng; tìm kiếm lọc đúng phạm vi quyền). Cần Firebase project thật (xem "Việc cần Sếp làm" trong proposal.md) — chưa có nên chưa chạy được, các route Firestore hiện trả lỗi rõ ràng đúng như dự kiến khi thiếu credential (đã xác nhận, không phải bug).
- [ ] 14.4 CHƯA LÀM — cùng lý do 14.3 (cần dữ liệu thật để thấy 403 hoạt động đúng qua nhiều tài khoản khác nhau).
