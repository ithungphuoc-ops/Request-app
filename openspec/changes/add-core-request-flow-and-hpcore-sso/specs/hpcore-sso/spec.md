## ADDED Requirements

### Requirement: Xác thực qua cookie phiên chung của hpcore.vn
Hệ thống SHALL xác thực người dùng bằng cách xác minh cookie phiên tên `session` (domain `.hpcore.vn`) do app tổng hpcore.vn phát hành, sử dụng Firebase Admin SDK app riêng tên `"hpcore"` khởi tạo từ biến môi trường `HPCORE_FIREBASE_SERVICE_ACCOUNT`. Hệ thống SHALL NOT tự triển khai màn hình đăng nhập bằng email/mật khẩu.

#### Scenario: Cookie hợp lệ
- **WHEN** người dùng gửi request kèm cookie `session` hợp lệ, chưa hết hạn
- **THEN** hệ thống xác định được `uid` và `email` của người dùng và cho phép truy cập

#### Scenario: Không có cookie hoặc cookie hết hạn
- **WHEN** người dùng gửi request tới một route được bảo vệ mà không có cookie `session` hợp lệ, và `NODE_ENV` là `production`
- **THEN** hệ thống chuyển hướng tới `https://account.hpcore.vn/login?next=<url quay lại đã mã hoá>`

#### Scenario: Chế độ phát triển không có hpcore thật
- **WHEN** `NODE_ENV` khác `production` và không có cookie `session` hợp lệ
- **THEN** hệ thống dùng một tài khoản giả cố định (dev-fallback user, vai trò owner) để tiếp tục xử lý, không chuyển hướng

### Requirement: Vai trò trung tâm do hpcore cấp cho app này
Hệ thống SHALL đọc vai trò của người dùng trong app này từ trường `app_permissions/{uid}.request_app` trong Firestore của project `hpcons-portal` (đọc qua app Admin SDK `"hpcore"`), với `uid` là uid do hpcore cấp. Giá trị trả về SHALL thuộc tập `"owner" | "app_admin" | "admin" | "member"`.

#### Scenario: Có vai trò trung tâm
- **WHEN** tài liệu `app_permissions/{uid}` tồn tại và có trường `request_app` là một trong 4 giá trị hợp lệ
- **THEN** hệ thống dùng giá trị đó làm vai trò của người dùng cho toàn bộ phiên làm việc

#### Scenario: Không có vai trò trung tâm hoặc lỗi đọc cross-project
- **WHEN** tài liệu không tồn tại, hoặc việc đọc Firestore của project `hpcons-portal` bị lỗi
- **THEN** hệ thống KHÔNG chặn đăng nhập; coi người dùng có vai trò `member` mặc định

### Requirement: Route công khai liệt kê vai trò của app
Hệ thống SHALL cung cấp endpoint `GET /api/roles` công khai (không yêu cầu xác thực, cho phép CORS mọi origin) trả về danh sách 4 vai trò (khoá + nhãn hiển thị tiếng Việt) để hpcore admin có thể gán vai trò cho người dùng.

#### Scenario: Gọi endpoint roles
- **WHEN** bất kỳ ai gửi `GET /api/roles`
- **THEN** hệ thống trả về JSON liệt kê đủ 4 khoá vai trò kèm nhãn, không yêu cầu đăng nhập

### Requirement: Đăng xuất xoá phiên trên toàn hệ thống con
Hệ thống SHALL cung cấp `POST /api/auth/logout` xoá cookie `session` với cả tuỳ chọn `domain: '.hpcore.vn'` và không có domain, để đảm bảo đăng xuất khỏi mọi subdomain `*.hpcore.vn`.

#### Scenario: Người dùng đăng xuất
- **WHEN** người dùng gọi `POST /api/auth/logout`
- **THEN** cookie `session` bị xoá và request tiếp theo tới route được bảo vệ bị coi là chưa đăng nhập

### Requirement: Không có trang quản lý thành viên/quyền riêng
Hệ thống SHALL NOT cung cấp bất kỳ giao diện nào cho phép gán/sửa vai trò người dùng trong app này — việc gán vai trò chỉ được thực hiện ở phía hpcore.vn.

#### Scenario: Cố truy cập trang quản lý quyền cũ
- **WHEN** người dùng truy cập đường dẫn `/base-account/*` (đã tồn tại trước đây)
- **THEN** hệ thống trả về 404 (route không còn tồn tại)
