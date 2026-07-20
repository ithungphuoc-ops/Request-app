## ADDED Requirements

### Requirement: Bình luận cập nhật real-time trên trang chi tiết đề xuất
Khi đang mở trang chi tiết 1 đề xuất, hệ thống SHALL tự động hiển thị bình luận mới do người khác vừa đăng, không yêu cầu tải lại trang.

#### Scenario: Người khác vừa đăng bình luận khi đang mở cùng đề xuất
- **WHEN** người dùng đang mở trang chi tiết 1 đề xuất, và một người khác có quyền xem đề xuất đó vừa gửi 1 bình luận mới
- **THEN** bình luận mới xuất hiện trong khung Thảo luận của người dùng đang xem mà không cần thao tác tải lại

### Requirement: @mention người và nhóm/phòng ban trong bình luận
Ô nhập bình luận SHALL cho phép gõ để tìm và chọn cả nhân viên lẫn nhóm thành viên/phòng ban, lưu id có cấu trúc vào `mentionIds` của bình luận.

#### Scenario: Mention 1 nhân viên cụ thể
- **WHEN** người dùng gõ tìm và chọn 1 nhân viên trong ô nhập bình luận
- **THEN** uid của nhân viên đó được thêm vào `mentionIds` khi gửi bình luận

#### Scenario: Mention 1 nhóm/phòng ban
- **WHEN** người dùng gõ tìm và chọn 1 nhóm thành viên hoặc phòng ban trong ô nhập bình luận
- **THEN** id của nhóm/phòng ban đó được thêm vào `mentionIds` khi gửi bình luận

### Requirement: Mention hiển thị trong chuông thông báo
Đề xuất có bình luận mention 1 người SHALL xuất hiện trong danh sách thông báo của người đó (qua `NotificationBell`); mention 1 nhóm/phòng ban SHALL khiến đề xuất xuất hiện trong thông báo của TẤT CẢ thành viên nhóm/phòng ban đó.

#### Scenario: Mention 1 người — thấy trong chuông thông báo
- **WHEN** 1 bình luận mention 1 nhân viên cụ thể được gửi trên 1 đề xuất
- **THEN** khi nhân viên đó tải lại trang có `NotificationBell`, họ thấy mục thông báo liên quan đến đề xuất đó

#### Scenario: Mention 1 nhóm — mọi thành viên đều thấy
- **WHEN** 1 bình luận mention 1 nhóm thành viên có N người
- **THEN** khi bất kỳ ai trong N người đó tải lại trang, họ đều thấy mục thông báo liên quan đến đề xuất đó

### Requirement: Trả lời bình luận giới hạn 1 cấp
Hệ thống SHALL cho phép trả lời 1 bình luận gốc, hiển thị phẳng bên dưới. Hệ thống SHALL KHÔNG cho phép trả lời lồng thêm cấp — mọi trả lời (kể cả bấm "Trả lời" trên 1 trả lời) đều quy về đúng bình luận gốc ban đầu.

#### Scenario: Trả lời 1 bình luận gốc
- **WHEN** người dùng bấm "Trả lời" trên 1 bình luận gốc và gửi nội dung
- **THEN** trả lời được lưu với `parentId` trỏ về bình luận gốc đó

#### Scenario: Trả lời trên 1 trả lời vẫn quy về bình luận gốc
- **WHEN** người dùng bấm "Trả lời" trên MỘT TRẢ LỜI (không phải bình luận gốc) và gửi nội dung
- **THEN** trả lời mới được lưu với `parentId` trỏ về ĐÚNG bình luận gốc ban đầu, không lồng thêm cấp

### Requirement: Tác giả tự sửa/xóa bình luận của mình
Tác giả 1 bình luận SHALL được phép sửa nội dung hoặc xóa bình luận đó của chính mình.

#### Scenario: Tác giả sửa bình luận
- **WHEN** tác giả gửi yêu cầu sửa nội dung 1 bình luận do chính họ tạo
- **THEN** nội dung được cập nhật, đánh dấu đã sửa (`editedAt`)

#### Scenario: Tác giả xóa bình luận
- **WHEN** tác giả gửi yêu cầu xóa 1 bình luận do chính họ tạo
- **THEN** bình luận bị xóa khỏi đề xuất

#### Scenario: Người khác (không phải tác giả, không phải admin) cố sửa/xóa
- **WHEN** một người dùng không phải tác giả và không phải Admin/Owner cố sửa hoặc xóa 1 bình luận không phải của họ
- **THEN** hệ thống từ chối với lỗi 403

### Requirement: Admin/Owner kiểm duyệt được mọi bình luận
Admin/Owner (vai trò toàn cục app tổng) SHALL được phép xóa bất kỳ bình luận nào trên bất kỳ đề xuất nào, kể cả không phải do họ tạo.

#### Scenario: Admin xóa bình luận của người khác
- **WHEN** người dùng có vai trò Admin/Owner gửi yêu cầu xóa 1 bình luận do người khác tạo
- **THEN** hệ thống cho phép xóa thành công
