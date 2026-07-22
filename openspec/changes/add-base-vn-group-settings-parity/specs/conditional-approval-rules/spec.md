## ADDED Requirements

### Requirement: Điều kiện dựa trên giá trị field của đề xuất
Hệ thống SHALL cung cấp một cơ chế "điều kiện" dùng chung, cho phép đánh giá TRUE/FALSE dựa trên giá trị của một field cụ thể trong đề xuất tại thời điểm gửi chính thức. Cơ chế này SHALL được dùng lại cho cả bước duyệt có điều kiện (`approver-steps`) và người theo dõi theo điều kiện (`followers`) — không viết 2 bộ logic đánh giá riêng.

Mỗi điều kiện SHALL gồm: field tham chiếu (theo `code` ổn định của field, không theo `id` hay tên hiển thị), toán tử so sánh, và giá trị so sánh. Bộ toán tử tối thiểu SHALL hỗ trợ "bằng" và "khác" cho field kiểu `single_choice`/`department_select`; hỗ trợ "chứa" cho field kiểu `multiple_choice`.

#### Scenario: Điều kiện thoả mãn khi field bằng giá trị chỉ định
- **WHEN** đề xuất được gửi chính thức và field có `code` được điều kiện tham chiếu có giá trị đúng bằng giá trị điều kiện yêu cầu
- **THEN** điều kiện được đánh giá là thoả mãn (true)

#### Scenario: Điều kiện không thoả mãn khi field khác giá trị chỉ định
- **WHEN** đề xuất được gửi chính thức và field có `code` được điều kiện tham chiếu có giá trị khác giá trị điều kiện yêu cầu (hoặc field chưa có giá trị)
- **THEN** điều kiện được đánh giá là không thoả mãn (false)

#### Scenario: Field tham chiếu không còn tồn tại trong nhóm
- **WHEN** điều kiện tham chiếu tới một `code` field không còn tồn tại trong `ProposalGroup.fields` tại thời điểm gửi
- **THEN** hệ thống coi điều kiện là không thoả mãn (false) và KHÔNG chặn việc gửi đề xuất — chỉ ghi log cảnh báo phía server

### Requirement: Quản trị viên cấu hình điều kiện qua UI
Người có quyền quản lý nhóm (`requireWriteAccess`) SHALL cấu hình được điều kiện khi thêm/sửa bước duyệt hoặc người theo dõi theo điều kiện, chọn field từ danh sách field hiện có của nhóm (không nhập tay `code`).

#### Scenario: Chọn field không hợp lệ bị từ chối khi lưu
- **WHEN** người quản lý cố lưu một điều kiện tham chiếu tới field không thuộc nhóm hiện tại
- **THEN** API PATCH nhóm trả về lỗi 400 với thông báo rõ field không tồn tại trong nhóm
