## ADDED Requirements

### Requirement: SLA riêng cho từng người duyệt
Nhóm SHALL có tuỳ chọn "SLA cho từng người duyệt" (Kích hoạt/Tắt). Khi kích hoạt, mỗi bước duyệt có thể có hạn xử lý riêng (giờ) độc lập với SLA chung của cả đề xuất (`slaHours` hiện có).

#### Scenario: SLA từng người duyệt tắt giữ nguyên hành vi hiện tại
- **WHEN** nhóm không kích hoạt "SLA cho từng người duyệt"
- **THEN** hệ thống chỉ dùng `deadlineAt` tính từ `slaHours` chung của đề xuất, đúng hành vi hiện có

### Requirement: SLA theo lịch làm việc
Nhóm SHALL có tuỳ chọn "SLA theo lịch làm việc" (Có/Không). Khi bật, việc tính hạn xử lý SHALL bỏ qua thời gian ngoài giờ hành chính khi cộng dồn SLA. Giờ hành chính CHỐT: **7:45–12:00** và **13:00–17:15**, các ngày **Thứ 2 đến Thứ 7** (Chủ nhật nghỉ hoàn toàn, không tính).

#### Scenario: SLA theo lịch làm việc tắt giữ nguyên cách tính hiện tại
- **WHEN** nhóm không bật "SLA theo lịch làm việc"
- **THEN** `computeDeadline()` tính hạn xử lý theo giờ đồng hồ liên tục, đúng hành vi hiện có

#### Scenario: SLA theo lịch làm việc bật, cộng dồn bỏ qua giờ nghỉ trưa
- **WHEN** đề xuất gửi lúc 16:00 Thứ 2, SLA 2 giờ, nhóm bật "SLA theo lịch làm việc"
- **THEN** hạn xử lý là 8:30 Thứ 3 (16:00→17:15 Thứ 2 dùng hết 1h15, còn 0h45 cộng tiếp từ 7:45 Thứ 3)

#### Scenario: SLA theo lịch làm việc bật, gửi ngoài giờ hành chính
- **WHEN** đề xuất gửi lúc 20:00 Thứ 6 (ngoài giờ hành chính), SLA 1 giờ
- **THEN** thời điểm bắt đầu tính SLA nhảy tới 7:45 Thứ 7 (ngày làm việc kế tiếp, Thứ 7 vẫn là ngày hành chính), hạn xử lý là 8:45 Thứ 7

#### Scenario: SLA theo lịch làm việc bật, bỏ qua Chủ nhật
- **WHEN** đề xuất gửi lúc 17:00 Thứ 7, SLA 1 giờ
- **THEN** hạn xử lý là 8:30 Thứ 2 tuần sau (17:00→17:15 Thứ 7 dùng hết 0h15, còn 0h45 nhảy qua Chủ nhật, cộng tiếp từ 7:45 Thứ 2)

### Requirement: Bắt buộc nhập ý kiến theo hành động duyệt
Nhóm SHALL có 4 cờ độc lập xác định hành động nào bắt buộc người duyệt phải nhập ghi chú: Chấp thuận, Từ chối, Chuyển tiếp, Chấp thuận và chuyển tiếp. Mặc định tất cả tắt (không bắt buộc), giữ đúng hành vi hiện tại.

#### Scenario: Hành động bị đánh dấu bắt buộc nhưng không nhập ý kiến bị từ chối
- **WHEN** nhóm bật cờ bắt buộc nhập ý kiến cho "Từ chối" và người duyệt thực hiện từ chối mà không nhập ghi chú
- **THEN** API quyết định (`app/api/requests/[id]/decision/route.ts`) trả về lỗi rõ ràng, không ghi nhận quyết định

#### Scenario: Hành động không bắt buộc vẫn cho phép bỏ trống ý kiến
- **WHEN** nhóm không bật cờ bắt buộc cho "Chấp thuận" và người duyệt chấp thuận không nhập ghi chú
- **THEN** quyết định được ghi nhận bình thường, đúng hành vi hiện có

### Requirement: Ưu tiên vai trò người duyệt khi trùng khối
Khi một người xuất hiện ở nhiều bước duyệt (khối) của cùng một đề xuất (`resolveApproverSteps()` trả về `TaggedUser[]` có id trùng nhau), hệ thống SHALL chỉ tính người đó MỘT LẦN duy nhất, theo vai trò/vị trí của LẦN XUẤT HIỆN SAU CÙNG trong danh sách bước duyệt — dùng hàm thuần `dedupeApprovers()` (`lib/approval-logic.ts`), áp dụng TRƯỚC khi build `approversSnapshot`/`approvers` ban đầu. Đây là hành vi MẶC ĐỊNH DUY NHẤT (không có tuỳ chọn cấu hình khác), không đổi shape `ApproverState`.

#### Scenario: Người trùng 2 bước duyệt chỉ tính 1 lần, ở vị trí bước sau cùng
- **WHEN** danh sách bước duyệt resolve ra `[Người A (bước 1), Người B (bước 2), Người A (bước 3)]`
- **THEN** `approversSnapshot`/`approvers` cuối cùng là `[Người B, Người A]` — Người A chỉ xuất hiện 1 lần, ở vị trí tương ứng bước 3 (sau cùng), không phải bước 1

#### Scenario: Không ai trùng giữ nguyên hành vi hiện có
- **WHEN** danh sách bước duyệt resolve ra không có id nào trùng nhau
- **THEN** `dedupeApprovers()` trả về nguyên vẹn danh sách gốc, không đổi thứ tự
