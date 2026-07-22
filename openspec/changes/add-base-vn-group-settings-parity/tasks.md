## 1. Nền tảng: cơ chế điều kiện dùng chung

- [x] 1.1 Thêm `ConditionRule` vào `lib/types.ts` (fieldCode, operator: "equals"|"not_equals"|"includes", value)
- [x] 1.2 Tạo `lib/server/conditions.ts` với `evaluateCondition(rule, values, fields)` — server-only, có xử lý field không tồn tại (trả false, không throw)
- [x] 1.3 Viết unit test cho `evaluateCondition`: equals đúng/sai, not_equals, includes với multiple_choice, field không tồn tại trong nhóm, giá trị field rỗng/undefined

## 2. Mã ổn định + điều kiện cho bước duyệt

- [x] 2.1 Đổi `ApproverStepDef` trong `lib/types.ts`: thêm `code?: string`, `condition?: ConditionRule` cho cả 2 kind ("fixed" | "submitter_manager")
- [x] 2.2 Thêm hàm sinh/backfill mã bước duyệt (tái dùng `slugifyFieldName`) — đặt cạnh logic backfill field trong `lib/server/groups.ts`, áp dụng khi GET/PATCH nhóm
- [x] 2.3 Sửa `resolveApproverSteps()` (`lib/server/requests.ts`): bỏ qua bước duyệt có `condition` không thoả mãn (dùng `evaluateCondition` với `values` của đề xuất đang gửi); nếu SAU KHI lọc điều kiện danh sách rỗng thì ném lỗi rõ ràng (dùng lại pattern `MissingApproverError`)
- [x] 2.4 Cập nhật `components/request/ApproverStepsEditor.tsx`: hiển thị mã bước duyệt (chỉ đọc, không cho sửa tay trong change này), thêm UI chọn field + toán tử + giá trị khi đánh dấu "có điều kiện"
- [x] 2.5 Cập nhật hiển thị "Người duyệt" ở trang cài đặt chung nhóm: hiện mã + "N điều kiện" dưới tên bước duyệt, đúng kiểu Base.vn
- [x] 2.6 Viết test cho `resolveApproverSteps()` với bước duyệt có điều kiện: thoả/không thoả/toàn bộ không thoả

## 3. Cấu hình nhóm mở rộng (Phân loại, mô tả rich text, "Mẫu form đề xuất?")

- [x] 3.1 Xác nhận với Sếp việc dùng Tiptap làm rich text editor (xem design.md mục Open Questions #3) trước khi thêm dependency — Sếp đồng ý
- [x] 3.2 Thêm `descriptionHtml?: string` và `requiresSubmissionForm?: boolean` vào `ProposalGroup` (`lib/types.ts`)
- [x] 3.3 Cài Tiptap, tạo `components/shared/RichTextEditor.tsx` giới hạn đúng bộ nút: bold/italic/underline/strike/quote/code/link/image/heading/list
- [x] 3.4 Sanitize HTML phía server trước khi lưu (`lib/server/groups.ts` hoặc route PATCH) — thêm `sanitize-html`, test với payload `<script>`/`onerror=`/`javascript:`
- [x] 3.5 Cập nhật modal "Chỉnh sửa thông tin" (`app/request/groups/[groupId]/(settings)/general/page.tsx`): thêm ô "Phân loại" (đã có field data `category`, chỉ thiếu UI), đổi mô tả sang `RichTextEditor`, thêm toggle "Mẫu form đề xuất?"
- [x] 3.6 Cập nhật khung mô tả nhóm ở `app/request/groups/[groupId]/submit/page.tsx` để render `descriptionHtml` (dùng `dangerouslySetInnerHTML` CHỈ với nội dung đã sanitize phía server)
- [x] 3.7 Sửa `findMissingRequiredFields`/validate submit: khi `requiresSubmissionForm === false`, bỏ qua field bắt buộc thuộc nhóm (không phải field hệ thống)

## 4. Luồng phê duyệt chi tiết (SLA/bắt buộc ý kiến)

- [x] 4.1 Thêm vào `ProposalGroup`: `approverSlaEnabled?: boolean`, `slaByWorkCalendar?: boolean`, `requireDecisionNote?: { approve?: boolean; reject?: boolean; forward?: boolean; approveAndForward?: boolean }`
- [x] 4.2 Đọc kỹ `lib/approval-logic.ts` — KẾT LUẬN: `ApproverState` là mảng phẳng, không có khái niệm "khối", người trùng nhiều bước duyệt sẽ tạo 2 phần tử cùng `id` (lỗ hổng có sẵn, không phải do change này). KHÔNG đổi `ApproverState`/`approval-logic.ts` trong change này — chỉ lưu cấu hình "ưu tiên vai trò", chưa áp dụng logic thật, đúng Non-Goals design.md. Báo rõ với Sếp ở bước 7.4.
- [x] 4.3 Cập nhật UI section "Luồng phê duyệt" ở trang cài đặt chung: 4 checkbox bắt buộc ý kiến, toggle SLA từng người duyệt, toggle SLA theo lịch làm việc (chỉ lưu cấu hình, chưa áp dụng logic lịch làm việc thật — đúng Non-Goals trong design.md)
- [x] 4.4 Sửa `app/api/requests/[id]/decision/route.ts`: chặn quyết định thiếu ghi chú khi cờ tương ứng của nhóm bật, trả lỗi rõ ràng
- [x] 4.5 Viết test cho việc chặn quyết định thiếu ghi chú theo từng cờ (approve/reject/forward — logic tách ra `missingRequiredNote()` trong lib/approval-logic.ts để test được, approveAndForward chưa có hành động tương ứng trong app)

## 5. Người theo dõi theo điều kiện

- [x] 5.1 Thêm `followersConditional?: { condition: ConditionRule; users: TaggedUser[] }[]` vào `ProposalGroup`
- [x] 5.2 Cập nhật UI "Người theo dõi" ở trang cài đặt chung: thêm khối "Người theo dõi theo điều kiện" bên dưới danh sách cố định, dùng lại UI chọn điều kiện đã làm ở Nhóm 2
- [x] 5.3 Sửa nơi khởi tạo `followers` khi gửi chính thức (`app/api/requests/route.ts`, `app/api/requests/[id]/route.ts`): hợp nhất followers cố định + followers người gửi tự thêm (đã có) + followers theo điều kiện thoả mãn, loại trùng theo `id`
- [x] 5.4 Viết test cho việc hợp nhất 3 nguồn followers, đảm bảo không trùng lặp

## 6. Bộ đếm mã đề xuất riêng theo nhóm

- [x] 6.1 Thêm `useOwnCounter?: boolean` vào `ProposalGroup`
- [x] 6.2 Thêm `generateGroupRequestCode(groupId)` vào `lib/server/requests.ts`, dùng transaction trên `counters/group_{groupId}`, cùng format 6 chữ số với `generateRequestCode()` hiện có — KHÔNG đổi `generateRequestCode()`
- [x] 6.3 Sửa `POST /api/requests` và PATCH submit-from-draft (`app/api/requests/[id]/route.ts`): chọn hàm sinh mã theo `group.useOwnCounter`
- [x] 6.4 Thêm UI "Bộ đếm" (mục sidebar mới trong trang cài đặt nhóm): toggle "Sử dụng mã bộ đếm cho nhóm đề xuất?", có cảnh báo khi bật lần đầu (xem design.md Risks)
- [x] 6.5 Viết test cho `generateGroupRequestCode`: tách phần tính thuần (`nextCounterCode` trong lib/validation.ts) để test được bằng vitest — hàm gốc "server-only" (chạm Firestore thật) không test trực tiếp được, đúng quy ước đã có trong dự án (lib/print-engine.ts). Tính độc lập giữa các nhóm đến từ việc mỗi nhóm dùng 1 document đếm riêng (`counters/group_{groupId}`), đã xác nhận qua đọc code.

## 7. Xác minh cuối

- [x] 7.1 `npm run build` xanh, không còn lỗi TypeScript do đổi shape `ApproverStepDef`
- [x] 7.2 `npm run test -- --run` xanh — giữ nguyên toàn bộ test cũ (đặc biệt `lib/approval-logic.ts`, `lib/permissions.ts` không bị đổi) + toàn bộ test mới ở các nhóm trên
- [x] 7.3 Kiểm thử thủ công trên dev: tạo 1 nhóm test có bước duyệt điều kiện + người theo dõi điều kiện + bộ đếm riêng, gửi 1 đề xuất thật kiểm tra đúng người duyệt/followers/mã đề xuất — ĐÚNG cả 3: mã 000001, approversSnapshot + followers đều đúng người khi điều kiện thoả mãn. Dữ liệu test đã dọn sạch khỏi Firestore.
- [x] 7.4 Báo cáo rõ với Sếp: phần nào chạy đúng, phần nào (nếu có) phải dừng ở Open Questions chưa làm được, KHÔNG tự ý deploy/push khi chưa được yêu cầu

## 8. Sửa lỗi trùng người duyệt nhiều bước (Sếp xác nhận làm, xem design.md Decision #6)

- [x] 8.1 Thêm `dedupeApprovers(users: TaggedUser[]): TaggedUser[]` vào `lib/approval-logic.ts` — giữ 1 lần/id, ở vị trí lần xuất hiện SAU CÙNG
- [x] 8.2 Áp dụng `dedupeApprovers()` ngay sau `resolveApproverSteps()`, trước `buildInitialApprovers()`, ở `app/api/requests/route.ts` và `app/api/requests/[id]/route.ts` (2 nơi)
- [x] 8.3 Viết test cho `dedupeApprovers`: không trùng giữ nguyên, trùng 2 lần giữ đúng vị trí sau cùng, trùng nhiều id khác nhau xen kẽ

## 9. SLA theo giờ hành chính thật (Sếp xác nhận: 7:45–17:15 T2–T7, nghỉ trưa 12:00–13:00)

- [x] 9.1 Tạo `lib/business-hours.ts` (không server-only) với `addBusinessHours(from: Date, hours: number): Date` — khung giờ 7:45–12:00 và 13:00–17:15, Thứ 2–Thứ 7, nghỉ Chủ nhật hoàn toàn
- [x] 9.2 Sửa `computeDeadline()` (`lib/server/requests.ts`) nhận thêm tham số `useBusinessHours`, gọi `addBusinessHours` khi bật (từ `group.slaByWorkCalendar`), giữ nguyên phép cộng giờ liên tục khi tắt
- [x] 9.3 Cập nhật 2 nơi gọi `computeDeadline()` (`app/api/requests/route.ts`, `app/api/requests/[id]/route.ts`) truyền đúng `group.slaByWorkCalendar`
- [x] 9.4 Viết test cho `addBusinessHours`: cộng trong cùng khung giờ, cộng qua giờ nghỉ trưa, gửi ngoài giờ hành chính, cộng qua Chủ nhật, cộng nhiều ngày liên tiếp

## 10. Rà soát "In đề xuất" và "Phân quyền" hiện có (Sếp yêu cầu, xem design.md Decision #8 — KHÔNG có tham chiếu Base.vn thật cho 2 mục này)

- [x] 10.1 Đọc lại toàn bộ `lib/server/print-engine.ts`, `lib/print-template.ts`, trang `(settings)/print/page.tsx`, API export — 4 phát hiện (1 CAO, 2 trung bình, 1 thấp), xem báo cáo agent trong lịch sử hội thoại
- [x] 10.2 Đọc lại `lib/permissions.ts`, trang `(settings)/permissions/page.tsx` — không phát hiện lỗ hổng leo thang quyền, 2 phát hiện mức thấp (UX/code chết)
- [x] 10.3 Đã sửa: (1) CAO — thiếu `requireSession()` ở `GET /api/groups/[id]/print-templates` (lộ metadata mẫu in không cần đăng nhập); (2) race condition xoá Storage trước khi cập nhật Firestore ở `replacePrintTemplateFile`/`deletePrintTemplate` — đổi thứ tự; (3) thêm nút "Quét lại" (PATCH `rescan:true`) khắc phục gap field đổi kiểu dữ liệu sau khi mẫu in đã dùng không tự quét lại; (4) sửa placeholder gây hiểu nhầm "Sử dụng cho" ở CreateGroupModal. KHÔNG sửa: finding mức thấp (duplicate `<w:tr>` first-match, code chết `groupIds`, GroupPickerModal chưa lọc usedFor — đã biết từ trước) vì rủi ro/lợi ích không đáng đổi thêm phạm vi.
- [x] 10.4 Chạy lại toàn bộ test — 108/108 xanh

## 11. Xác minh cuối (đợt 2)

- [x] 11.1 `npm run build` xanh
- [x] 11.2 `npm run test -- --run` xanh — toàn bộ test cũ + mới ở Nhóm 8/9/10
- [x] 11.3 Kiểm thử thủ công trên dev: 1 nhóm 2 bước duyệt CÙNG 1 người + SLA 1h bật giờ hành chính, gửi đề xuất thật — approversSnapshot/approvers chỉ còn 1 phần tử (đúng), deadlineAt tính đúng giờ hành chính (16:02 VN +1h -> 17:02 VN, khớp UTC trả về). Không tự kiểm chứng được finding CAO (thiếu requireSession) trên dev vì dev-fallback-user luôn hợp lệ bất kể cookie — xác nhận đúng qua đọc code, khớp pattern mọi route khác.
- [x] 11.4 Báo cáo kết quả Nhóm 8/9/10 với Sếp, dọn dữ liệu test khỏi Firestore trước khi báo cáo xong
