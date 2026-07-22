## Why

`base-request-app` hiện chỉ mô phỏng một phần nhỏ trang cài đặt nhóm đề xuất thật của Base.vn (request.base.vn). Sếp đã cung cấp video quay màn hình trang "Thiết lập chung" của nhóm thật "01.1. PDN Thiết bị IT - Phần mềm (HP Cons)" và yêu cầu làm cho app của mình giống đầy đủ như vậy, để người dùng cuối chuyển từ Base.vn sang không bị hụt tính năng đã quen dùng.

Video cho thấy 5 mảng cấu hình có thật ở Base.vn mà app hiện chưa có hoặc chưa đủ: (1) một số trường trong modal "Chỉnh sửa thông tin" nhóm, đặc biệt mô tả nhóm dạng rich text; (2) bước duyệt có mã riêng và có thể **có điều kiện áp dụng**; (3) các tuỳ chọn chi tiết trong "Luồng phê duyệt" (SLA từng người duyệt, bắt buộc nhập ý kiến theo từng hành động, ưu tiên vai trò khi trùng); (4) "Người theo dõi theo điều kiện"; (5) "Bộ đếm" — mã đề xuất tự sinh riêng theo từng nhóm thay vì dùng chung 1 bộ đếm toàn hệ thống.

## What Changes

- Mở rộng modal "Chỉnh sửa thông tin" nhóm đề xuất: thêm **Phân loại** (category, đã có field data nhưng chưa có UI nhập), đổi **Mô tả nhóm đề xuất** từ textarea thường sang **rich text editor** (bold/italic/underline/list/link/ảnh...), thêm toggle **"Mẫu form đề xuất?"** (Có/Không).
- Mở rộng `ApproverStepDef`: thêm **mã riêng cho từng bước duyệt** (sinh tự động theo cùng cơ chế `slugifyFieldName` đã dùng cho field, cho phép sửa tay), thêm khả năng đánh dấu một bước là **"có điều kiện"** (chỉ áp dụng khi thoả điều kiện — cơ chế điều kiện cụ thể **CHƯA CHỐT**, xem design.md). **BREAKING**: cấu trúc `ApproverStepDef` đổi shape, cần migrate dữ liệu nhóm hiện có.
- Mở rộng cấu hình "Luồng phê duyệt" của nhóm: SLA cho từng người duyệt (bật/tắt), SLA theo lịch làm việc (Có/Không), 4 cờ bắt buộc nhập ý kiến theo hành động (Chấp thuận/Từ chối/Chuyển tiếp/Chấp thuận và chuyển tiếp), thứ tự ưu tiên vai trò người duyệt khi trùng khối.
- Mở rộng "Người theo dõi": thêm nhóm **"Người theo dõi theo điều kiện"** bên cạnh danh sách cố định đã có — dùng lại cùng cơ chế điều kiện với bước duyệt có điều kiện.
- Thêm cấu hình **"Bộ đếm"** cho nhóm: bật/tắt mã đề xuất tự sinh riêng theo nhóm, thay vì luôn dùng bộ đếm toàn hệ thống (`generateRequestCode()` hiện tại) khi nhóm bật tuỳ chọn này.
- **KHÔNG đưa vào change này** (chưa xem được nội dung thật, không suy đoán): "In đề xuất" kiểu Base, "Tuỳ chỉnh về phân quyền" kiểu Base, "Chữ ký điện tử", "Thông báo" theo nhóm — 4 mục này cần Sếp quay video/chụp ảnh bổ sung trước khi lập change riêng.

## Capabilities

### New Capabilities
- `conditional-approval-rules`: Cơ chế đánh giá "điều kiện" dùng chung cho bước duyệt có điều kiện và người theo dõi theo điều kiện — thoả 1 điều kiện dựa trên giá trị field của đề xuất thì mới áp dụng.
- `group-request-counter`: Bộ đếm mã đề xuất riêng theo từng nhóm (bật/tắt được), độc lập với bộ đếm toàn hệ thống hiện có.

### Modified Capabilities
- `group-settings`: Thêm Phân loại, mô tả rich text, toggle "Mẫu form đề xuất?" vào cấu hình chung của nhóm.
- `approval-flow-config`: Thêm SLA từng người duyệt, SLA theo lịch làm việc, bắt buộc nhập ý kiến theo hành động, ưu tiên vai trò khi trùng khối.
- `approver-steps`: Thêm mã ổn định cho từng bước duyệt và khả năng đánh dấu bước duyệt có điều kiện.
- `followers`: Thêm nhóm người theo dõi theo điều kiện.

## Impact

- **Data model** (`lib/types.ts`): `ApproverStepDef` đổi shape (thêm `code`, `condition?`); `ProposalGroup` thêm `category`, `descriptionHtml` (hoặc đổi `description` sang lưu HTML), `requiresSubmissionForm?`, các cờ luồng phê duyệt mới, `followersConditional?`, `counter?`.
- **API**: `app/api/groups/[id]/route.ts` (PATCH) cần nhận và validate các field mới; có thể cần route mã hoá `code` cho approver step tương tự field.
- **UI**: `app/request/groups/[groupId]/(settings)/general/page.tsx`, `components/request/ApproverStepsEditor.tsx`, khu vực "Người theo dõi" trong cùng trang.
- **Request submission**: `lib/server/requests.ts` (`resolveApproverSteps`, `generateRequestCode`) cần đọc điều kiện + bộ đếm riêng nhóm khi gửi chính thức.
- **Migration**: dữ liệu `approverSteps` hiện có (kind: "fixed" | "submitter_manager") cần backfill `code` khi đọc, tương tự cách `ProposalField.code` đã backfill ngầm trước đây.
- **Test**: `lib/approval-logic.ts`, `lib/permissions.ts` hiện có test bao phủ luồng duyệt — không đổi 2 file này, chỉ mở rộng phần resolve step ở `lib/server/requests.ts`.
