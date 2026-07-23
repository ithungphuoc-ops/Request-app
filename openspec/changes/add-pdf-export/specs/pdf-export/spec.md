## ADDED Requirements

### Requirement: Xuất PDF là lựa chọn THÊM, không thay thế .docx
Người dùng có quyền xem đề xuất (đúng `canView()` hiện có) SHALL chọn được xuất PDF bên cạnh lựa chọn xuất `.docx` đã có ở "In theo mẫu" — không được xoá/thay thế lựa chọn `.docx` hiện có.

#### Scenario: Xuất .docx vẫn hoạt động bình thường sau khi thêm PDF
- **WHEN** người dùng chọn xuất `.docx` như trước (không đổi cách dùng)
- **THEN** hệ thống trả về file `.docx` giống hệt hành vi hiện tại, không có gì thay đổi

#### Scenario: Người dùng chọn xuất PDF
- **WHEN** người dùng có quyền xem đề xuất chọn "Xuất PDF" cho 1 mẫu in cụ thể
- **THEN** hệ thống trả về file `.pdf` có nội dung/bố cục khớp với file `.docx` đã mail-merge của cùng đề xuất + mẫu đó (logo, bảng chi tiết đã nhân dòng, chữ ký...)

### Requirement: Không lặp lại logic mail-merge cho PDF
Việc tạo PDF SHALL tái sử dụng ĐÚNG buffer `.docx` đã mail-merge từ `renderPrintTemplate()` hiện có làm đầu vào — không viết lại/nhân bản logic điền dữ liệu (tên trường, nhân dòng bảng, biến hệ thống) riêng cho PDF.

#### Scenario: Sửa logic mail-merge chỉ cần sửa 1 nơi
- **WHEN** một field/biến hệ thống mới được thêm vào `buildPrintTemplateData()`
- **THEN** cả xuất `.docx` và xuất PDF đều tự động phản ánh đúng, không cần sửa thêm ở nơi khác cho riêng PDF

### Requirement: Lỗi chuyển đổi PDF không ảnh hưởng luồng .docx
Nếu bước chuyển đổi sang PDF thất bại (dịch vụ/bước xử lý PDF không phản hồi, lỗi mạng, timeout...), hệ thống SHALL báo lỗi rõ ràng cho người dùng và KHÔNG ảnh hưởng tới khả năng xuất `.docx` của cùng đề xuất/mẫu đó.

#### Scenario: Bước chuyển đổi PDF lỗi
- **WHEN** bước xử lý PDF trả về lỗi hoặc quá thời gian chờ
- **THEN** người dùng nhận thông báo lỗi rõ ràng bằng tiếng Việt, và vẫn xuất `.docx` bình thường được nếu thử lại với lựa chọn đó

### Requirement: Ghi lịch sử xuất giống cơ chế .docx hiện có
Mỗi lần xuất PDF thành công hoặc thất bại SHALL được ghi vào lịch sử xuất (`printExports`, chỉ metadata — không ghi nội dung/giá trị đề xuất), cùng cơ chế đã áp dụng cho xuất `.docx`, thêm trường phân biệt định dạng (`docx` hay `pdf`).

#### Scenario: Lịch sử xuất phân biệt được định dạng
- **WHEN** người dùng xuất PDF cho 1 đề xuất
- **THEN** bản ghi `printExports` tương ứng có `format: "pdf"`, không lẫn với các lần xuất `.docx`
