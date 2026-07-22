## ADDED Requirements

### Requirement: Mã ổn định cho từng bước duyệt
Mỗi phần tử `ApproverStepDef` SHALL có `code: string` sinh 1 lần lúc tạo (dùng lại `slugifyFieldName` đã có ở `lib/print-template.ts`, cộng hậu tố `_2`, `_3`... nếu trùng trong nhóm), không đổi khi thứ tự hoặc cấu hình bước duyệt khác thay đổi. Bước duyệt tạo trước khi có `code` SHALL được backfill ngầm khi đọc qua API nhóm, theo đúng pattern đã áp dụng cho `ProposalField.code`.

#### Scenario: Bước duyệt cũ chưa có mã được backfill khi đọc
- **WHEN** GET/PATCH nhóm có `approverSteps` chứa phần tử chưa có `code`
- **THEN** API trả về (và ghi lại xuống Firestore) `code` được sinh tự động từ loại bước duyệt, không làm mất cấu hình hiện có

### Requirement: Bước duyệt có điều kiện
`ApproverStepDef` SHALL hỗ trợ thêm một điều kiện tuỳ chọn (dùng `conditional-approval-rules`) — khi có điều kiện, bước duyệt CHỈ được đưa vào danh sách người duyệt thực tế của đề xuất nếu điều kiện thoả mãn tại thời điểm gửi chính thức.

#### Scenario: Bước duyệt có điều kiện bị bỏ qua khi điều kiện không thoả
- **WHEN** đề xuất được gửi chính thức và điều kiện gắn với 1 bước duyệt không thoả mãn
- **THEN** bước duyệt đó KHÔNG xuất hiện trong `approversSnapshot`/`approvers` của đề xuất, các bước duyệt khác không có điều kiện (hoặc điều kiện thoả mãn) vẫn được đưa vào bình thường theo đúng thứ tự

#### Scenario: Toàn bộ bước duyệt bị loại do điều kiện không thoả
- **WHEN** tất cả bước duyệt của nhóm đều có điều kiện và không bước nào thoả mãn
- **THEN** hệ thống chặn gửi chính thức, trả lỗi rõ ràng "Không xác định được người duyệt nào phù hợp điều kiện hiện tại" thay vì tạo đề xuất không có người duyệt

### Requirement: Hiển thị mã và điều kiện trong "Người duyệt"
Trang cài đặt chung của nhóm SHALL hiển thị danh sách bước duyệt kèm mã và (nếu có) số lượng điều kiện đang áp dụng, theo đúng cách Base.vn hiển thị ("1 điều kiện").

#### Scenario: Bước duyệt có điều kiện hiển thị số lượng điều kiện
- **WHEN** một bước duyệt có 1 điều kiện được cấu hình
- **THEN** danh sách "Người duyệt" hiển thị dòng phụ "1 điều kiện" dưới tên bước duyệt, cùng với mã bước duyệt
