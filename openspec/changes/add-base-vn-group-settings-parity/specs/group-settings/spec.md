## ADDED Requirements

### Requirement: Phân loại nhóm đề xuất
`ProposalGroup` SHALL có field `category: string` (đã tồn tại trong data model) hiển thị và sửa được qua modal "Chỉnh sửa thông tin" ở trang cài đặt chung của nhóm — text tự do, không bắt buộc.

#### Scenario: Sửa phân loại nhóm
- **WHEN** người quản lý nhóm nhập giá trị vào ô "Phân loại" và lưu
- **THEN** giá trị được ghi vào `ProposalGroup.category` và hiển thị lại đúng khi tải lại trang

### Requirement: Mô tả nhóm dạng rich text
Mô tả nhóm đề xuất SHALL hỗ trợ định dạng văn bản (in đậm, in nghiêng, gạch chân, gạch ngang, trích dẫn, danh sách, tiêu đề, liên kết, chèn ảnh) thay vì chỉ văn bản thuần. Nội dung mô tả SHALL được hiển thị đúng định dạng ở đầu form "Gửi đề xuất" (khung mô tả nhóm hiện có tại `app/request/groups/[groupId]/submit/page.tsx`).

#### Scenario: Định dạng được giữ nguyên khi hiển thị lại
- **WHEN** người quản lý nhóm nhập mô tả có in đậm và danh sách gạch đầu dòng, lưu lại
- **THEN** form "Gửi đề xuất" của nhóm hiển thị đúng in đậm và danh sách, không hiện thẻ HTML thô

#### Scenario: Nội dung mô tả được làm sạch chống XSS
- **WHEN** người quản lý nhóm dán nội dung có chứa thẻ `<script>` vào ô mô tả
- **THEN** hệ thống loại bỏ thẻ script trước khi lưu, không thực thi script khi hiển thị lại cho người khác

### Requirement: Bắt buộc điền mẫu form đề xuất
`ProposalGroup` SHALL có tuỳ chọn "Mẫu form đề xuất?" (Có/Không, mặc định Có) xác định người gửi có bắt buộc điền các field tuỳ chỉnh của nhóm hay có thể bỏ qua để chỉ điền thông tin cơ bản.

#### Scenario: Tắt bắt buộc điền mẫu cho phép gửi không cần field tuỳ chỉnh
- **WHEN** nhóm đặt "Mẫu form đề xuất?" = Không và người gửi không điền field tuỳ chỉnh nào
- **THEN** đề xuất vẫn gửi được, không bị chặn bởi kiểm tra "còn thiếu trường bắt buộc" cho các field tuỳ chỉnh của nhóm (field hệ thống như Tên đề xuất vẫn bắt buộc)
