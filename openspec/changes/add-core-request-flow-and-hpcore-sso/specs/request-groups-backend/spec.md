## ADDED Requirements

### Requirement: Nhóm đề xuất được lưu trữ bền vững trên Firestore
Hệ thống SHALL lưu trữ mọi nhóm đề xuất (`ProposalGroup`) và danh mục (`CategoryGroup`) trong Firestore (collection `groups`, `categories`), thay thế hoàn toàn dữ liệu mẫu tĩnh trước đây. Mọi truy cập đọc/ghi Firestore SHALL đi qua API route phía server bằng Firebase Admin SDK; không có mã phía client được phép gọi Firestore trực tiếp.

#### Scenario: Tạo nhóm đề xuất mới
- **WHEN** người dùng có quyền (`owner` hoặc `app_admin`) tạo một nhóm đề xuất mới qua giao diện
- **THEN** hệ thống ghi một tài liệu mới vào collection `groups`, gán vào danh mục tương ứng (tạo danh mục mới nếu chưa tồn tại), và nhóm này còn tồn tại sau khi tải lại trang

#### Scenario: Chỉ owner/app_admin được tạo/sửa nhóm ở mức toàn ứng dụng
- **WHEN** người dùng có vai trò `admin` hoặc `member` cố gắng tạo/sửa cấu hình nhóm ở mức toàn ứng dụng
- **THEN** API route trả lỗi 403, sử dụng hàm `canManageGroupsAtAppScope` từ `lib/permissions.ts` để kiểm tra

### Requirement: Quản lý trường dữ liệu (field) của nhóm
Hệ thống SHALL cho phép thêm, xoá, sắp xếp lại các trường dữ liệu của một nhóm đề xuất, lưu thay đổi vào Firestore ngay lập tức.

#### Scenario: Thêm trường mới vào nhóm
- **WHEN** người có quyền thêm một trường dữ liệu vào một nhóm đã tồn tại (có thể chỉ định chèn sau một trường cụ thể)
- **THEN** mảng field của tài liệu nhóm trong Firestore được cập nhật, thứ tự `order` được đánh lại tuần tự

#### Scenario: Sắp xếp lại trường bằng kéo-thả
- **WHEN** người dùng kéo-thả để đổi thứ tự các trường trong giao diện field builder
- **THEN** thứ tự mới được lưu vào Firestore, phản ánh đúng khi tải lại trang

### Requirement: Giao diện cấu hình hiện có tiếp tục hoạt động không đổi hành vi
Các thao tác hiện có trên giao diện (tạo nhóm, sửa thông tin chung, đóng/mở trạng thái nhóm, ghim nhóm, thêm/xoá/sắp xếp field) SHALL giữ nguyên hành vi quan sát được từ người dùng sau khi chuyển sang backend thật, chỉ khác ở chỗ dữ liệu được lưu bền vững.

#### Scenario: Đóng/mở trạng thái nhóm với khả năng lỗi mạng
- **WHEN** người dùng bật/tắt trạng thái hoạt động của một nhóm và request tới server thất bại
- **THEN** giao diện khôi phục lại trạng thái trước đó và hiển thị thông báo lỗi, giữ đúng tinh thần cơ chế revert đã có trước khi chuyển sang backend thật
