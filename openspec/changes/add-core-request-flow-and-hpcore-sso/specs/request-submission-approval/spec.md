## ADDED Requirements

### Requirement: Gửi đề xuất từ một nhóm
Hệ thống SHALL cho phép người dùng thuộc phạm vi "usedFor" của một nhóm đề xuất (hoặc khi `usedFor` rỗng — toàn công ty) điền vào các trường dữ liệu của nhóm đó và gửi đi, tạo ra một `RequestInstance` mới. Hệ thống SHALL chụp lại (snapshot) danh sách field và danh sách người duyệt tại thời điểm gửi, không tham chiếu sống tới nhóm gốc.

#### Scenario: Gửi đề xuất hợp lệ
- **WHEN** người dùng trong phạm vi sử dụng điền đủ các trường bắt buộc và bấm "Gửi đề xuất"
- **THEN** hệ thống tạo một `RequestInstance` mới với trạng thái `pending`, danh sách `approvers` khởi tạo theo đúng thứ tự người duyệt của nhóm tại thời điểm gửi (mỗi người ở trạng thái `pending`), và `deadlineAt` tính từ `slaHours` của nhóm nếu có

#### Scenario: Thiếu trường bắt buộc
- **WHEN** người dùng bỏ trống một trường được đánh dấu `required` và bấm "Gửi đề xuất"
- **THEN** hệ thống từ chối gửi, chỉ ra trường còn thiếu, không tạo `RequestInstance` mới (nếu đã có bản nháp thì giữ nguyên bản nháp, không xoá)

#### Scenario: Người ngoài phạm vi sử dụng cố gửi đề xuất
- **WHEN** người dùng không nằm trong `usedFor` của nhóm (và `usedFor` không rỗng) cố gửi đề xuất từ nhóm đó
- **THEN** hệ thống từ chối yêu cầu, sử dụng `isWithinUsedForScope` từ `lib/permissions.ts` để kiểm tra

### Requirement: Lưu nháp
Hệ thống SHALL cho phép người dùng lưu một đề xuất đang soạn ở trạng thái `draft` mà không khởi động luồng duyệt, và tiếp tục sửa/gửi bản nháp đó sau.

#### Scenario: Lưu nháp
- **WHEN** người dùng bấm "Lưu nháp" thay vì "Gửi đề xuất" (có thể chưa điền đủ trường bắt buộc)
- **THEN** hệ thống tạo hoặc cập nhật một `RequestInstance` ở trạng thái `draft`, không tạo `approvers`, không tính `deadlineAt`, không gửi thông báo cho ai

#### Scenario: Gửi một bản nháp đã lưu
- **WHEN** người dùng mở lại một đề xuất `draft` của chính mình, điền đủ trường bắt buộc và bấm "Gửi đề xuất"
- **THEN** hệ thống chuyển trạng thái từ `draft` sang `pending`, khởi tạo `approvers` và `deadlineAt` tại thời điểm gửi này (không phải thời điểm tạo nháp)

#### Scenario: Chỉ chủ đề xuất thấy và sửa được nháp của mình
- **WHEN** một người dùng khác (không phải người tạo) cố mở hoặc sửa một đề xuất đang `draft`
- **THEN** hệ thống từ chối — nháp chỉ hiển thị trong "Đề xuất của tôi" của chính người tạo, không xuất hiện ở bất kỳ hộp thư hay tìm kiếm nào của người khác

### Requirement: Đề xuất trực tiếp (không theo mẫu cố định)
Hệ thống SHALL cho phép người dùng tạo một đề xuất tự do ("Đề xuất trực tiếp") không gắn với nhóm/mẫu nào — tự nhập tiêu đề, mô tả, tự chọn người xét duyệt (bắt buộc ít nhất một) và người theo dõi.

#### Scenario: Tạo đề xuất trực tiếp hợp lệ
- **WHEN** người dùng chọn "Đề xuất trực tiếp", điền tên, mô tả và ít nhất một người xét duyệt, rồi gửi
- **THEN** hệ thống tạo `RequestInstance` với `groupId: null`, dùng đúng danh sách người duyệt do người tạo tự chỉ định

#### Scenario: Thiếu người xét duyệt
- **WHEN** người dùng gửi đề xuất trực tiếp mà chưa chọn người xét duyệt nào
- **THEN** hệ thống từ chối gửi và báo rõ cần ít nhất một người xét duyệt

### Requirement: Cửa sổ chọn nhóm khi tạo đề xuất
Hệ thống SHALL mở một cửa sổ chọn nhóm (có tìm nhanh, danh sách nhóm nằm trong phạm vi `usedFor` của người dùng hiện tại, phân theo danh mục) khi người dùng bấm "Tạo đề xuất"; ngoài các nhóm, cửa sổ SHALL luôn có lựa chọn "Đề xuất trực tiếp".

#### Scenario: Chọn một nhóm
- **WHEN** người dùng gõ tìm hoặc cuộn danh sách rồi chọn một nhóm trong cửa sổ
- **THEN** cửa sổ đóng lại và mở đúng biểu mẫu động của nhóm đó

#### Scenario: Không có nhóm khả dụng
- **WHEN** người dùng không nằm trong phạm vi `usedFor` của bất kỳ nhóm nào
- **THEN** cửa sổ vẫn hiển thị được, giải thích rõ lý do (không phải danh sách trống không lời giải thích), và vẫn cho chọn "Đề xuất trực tiếp"

### Requirement: Danh sách "Đề xuất của tôi"
Hệ thống SHALL cho phép người dùng xem danh sách các đề xuất do chính mình tạo (kể cả bản nháp), kèm trạng thái hiện tại, và nhấp vào một dòng để mở trang chi tiết.

#### Scenario: Xem đề xuất đã gửi và bản nháp
- **WHEN** người dùng đã tạo ít nhất một đề xuất (đã gửi hoặc còn nháp) và mở trang "Đề xuất của tôi"
- **THEN** hệ thống liệt kê đúng các đề xuất do người này tạo, sắp xếp theo thời gian cập nhật gần nhất, kèm trạng thái hiện tại (kể cả `draft`)

### Requirement: Trang chi tiết đề xuất
Hệ thống SHALL cung cấp một trang chi tiết cho mỗi đề xuất, gồm nội dung chính (tiêu đề, trạng thái, hạn xử lý và thời gian còn lại nếu có, thông tin đề xuất, giá trị từng field) và thanh bên (danh sách người xét duyệt kèm trạng thái từng người theo thứ tự, danh sách người theo dõi, lịch sử hoạt động theo thời gian).

#### Scenario: Mở trang chi tiết từ danh sách
- **WHEN** người dùng nhấp vào một dòng đề xuất trong "Đề xuất của tôi", "Chờ tôi duyệt" hoặc kết quả tìm kiếm
- **THEN** hệ thống mở trang chi tiết đúng đề xuất đó, hiển thị đầy đủ dữ liệu và lịch sử

#### Scenario: Người không liên quan không xem được chi tiết
- **WHEN** người dùng không phải người tạo, không nằm trong danh sách người duyệt/người theo dõi của đề xuất, và không có vai trò `owner`/`app_admin`
- **THEN** hệ thống từ chối hiển thị chi tiết (403), không rò rỉ nội dung đề xuất

### Requirement: Ba hành động xử lý đề xuất — Chấp thuận / Chuyển tiếp / Từ chối
Hệ thống SHALL chỉ hiển thị ba nút hành động (Chấp thuận, Chuyển tiếp, Từ chối) cho đúng người đang tới lượt xử lý (`canApproverAct`), và ẩn/khoá khi đề xuất đã kết thúc hoặc người xem không đúng lượt. Mọi hành động SHALL được kiểm tra lại ở máy chủ, không chỉ ẩn nút phía giao diện.

#### Scenario: Chấp thuận làm thay đổi trạng thái tổng thể
- **WHEN** người duyệt hợp lệ bấm "Chấp thuận", và đây là người duyệt cuối cùng cần thiết theo kiểu quy trình của đề xuất
- **THEN** trạng thái tổng thể chuyển thành `approved`, ghi lịch sử, và người tạo thấy trạng thái này khi xem lại đề xuất

#### Scenario: Từ chối trong quy trình đồng thời/lần lượt
- **WHEN** bất kỳ người duyệt nào bấm "Từ chối" một đề xuất có quy trình `concurrent` hoặc `sequential`
- **THEN** trạng thái tổng thể chuyển ngay thành `rejected`, các người duyệt còn `pending` khác không cần thao tác thêm

#### Scenario: Chuyển tiếp cho người khác xử lý
- **WHEN** người duyệt hợp lệ bấm "Chuyển tiếp", chọn một người nhận chưa có mặt trong danh sách người duyệt của đề xuất, kèm lý do (tuỳ chọn)
- **THEN** hệ thống thay người duyệt đó bằng người nhận mới tại đúng vị trí trong thứ tự (quan trọng với quy trình lần lượt), giữ trạng thái `pending` cho vị trí đó, ghi lịch sử rõ ai chuyển cho ai và khi nào, và người nhận mới thấy đề xuất trong hộp thư chờ duyệt của họ

#### Scenario: Không cho chuyển tiếp trùng người
- **WHEN** người dùng chọn chuyển tiếp cho một người đã có mặt trong danh sách người duyệt của đề xuất đó
- **THEN** hệ thống từ chối, báo lỗi rõ ràng

#### Scenario: Thao tác không hợp lệ bị từ chối
- **WHEN** một người không phải người duyệt hợp lệ tại thời điểm đó (đã quyết định rồi, quy trình lần lượt nhưng chưa tới lượt, hoặc đề xuất đã kết thúc) cố gửi bất kỳ quyết định nào trong ba hành động
- **THEN** hệ thống trả lỗi 409 và KHÔNG thay đổi trạng thái đề xuất

### Requirement: Hộp thư "Chờ tôi duyệt" tôn trọng đúng luật của từng kiểu quy trình
Hệ thống SHALL chỉ hiển thị trong hộp thư chờ duyệt của một người dùng những đề xuất mà người đó có thể thao tác NGAY BÂY GIỜ, xác định bằng hàm `canApproverAct` từ `lib/approval-logic.ts` (không viết lại logic).

#### Scenario: Quy trình lần lượt (sequential) — chưa tới lượt
- **WHEN** một đề xuất có quy trình `sequential`, người duyệt A đứng trước người duyệt B trong danh sách, và A chưa quyết định
- **THEN** đề xuất đó KHÔNG xuất hiện trong hộp thư chờ duyệt của B (có thể xuất hiện ở tab "Chờ lượt duyệt" nếu B mở trang tìm kiếm/tất cả đề xuất)

#### Scenario: Quy trình lần lượt — tới lượt
- **WHEN** người duyệt A đã quyết định (approved/rejected) hoặc đã chuyển tiếp, và B là người `pending` kế tiếp theo thứ tự
- **THEN** đề xuất xuất hiện trong hộp thư chờ duyệt của B

#### Scenario: Quy trình đồng thời hoặc một người duyệt
- **WHEN** một đề xuất có quy trình `concurrent` hoặc `single`
- **THEN** đề xuất xuất hiện trong hộp thư của mọi người duyệt còn ở trạng thái `pending`, không phân biệt thứ tự

### Requirement: Hạn xử lý và trạng thái quá hạn
Hệ thống SHALL tính `deadlineAt` cho một đề xuất từ `slaHours` của nhóm tại thời điểm gửi (null nếu nhóm không đặt SLA hoặc đề xuất còn là nháp), và SHALL tính "quá hạn" là một nhãn phái sinh lúc đọc (không lưu thành trạng thái riêng): đề xuất còn `pending` và `deadlineAt` đã qua.

#### Scenario: Đề xuất còn hạn
- **WHEN** đề xuất đang `pending` và `deadlineAt` chưa tới
- **THEN** trang chi tiết và danh sách hiển thị "Thời gian còn lại" đếm tới `deadlineAt`

#### Scenario: Đề xuất quá hạn
- **WHEN** đề xuất đang `pending` và thời điểm hiện tại đã qua `deadlineAt`
- **THEN** giao diện đánh dấu đề xuất là quá hạn (nhãn/màu riêng), nhưng trạng thái lưu trữ (`status`) không tự đổi — quá hạn không ngăn người duyệt tiếp tục xử lý

### Requirement: Tìm kiếm và lọc đề xuất
Hệ thống SHALL cung cấp một trang tìm kiếm cho phép lọc đề xuất theo trạng thái, nhóm, khoảng thời gian tạo và người tạo, trong phạm vi quyền xem của người dùng hiện tại (không vượt quá những gì họ được phép thấy qua vai trò/quan hệ với đề xuất).

#### Scenario: Lọc theo trạng thái và nhóm
- **WHEN** người dùng chọn một trạng thái và một nhóm trong bộ lọc rồi tìm kiếm
- **THEN** kết quả chỉ gồm đề xuất khớp cả hai điều kiện, nằm trong phạm vi người dùng được phép xem

#### Scenario: Thành viên thường không thấy toàn bộ hệ thống
- **WHEN** một thành viên thường (không phải `owner`/`app_admin`) tìm kiếm không có bộ lọc người tạo
- **THEN** kết quả KHÔNG mặc định bao gồm mọi đề xuất trong hệ thống — chỉ gồm đề xuất họ tạo, được giao duyệt, hoặc đang theo dõi

### Requirement: Thông báo trong ứng dụng
Hệ thống SHALL hiển thị cho người dùng, ngay trong giao diện (không qua email/kênh ngoài), số lượng đề xuất đang chờ họ duyệt, và SHALL cung cấp danh sách thông báo cho các sự kiện: được giao duyệt (kể cả do được chuyển tiếp tới), đề xuất của mình được chấp thuận/từ chối, và được thêm làm người theo dõi.

#### Scenario: Có đề xuất mới cần duyệt
- **WHEN** một đề xuất xuất hiện trong hộp thư chờ duyệt của người dùng (gửi mới hoặc được chuyển tiếp tới)
- **THEN** giao diện hiển thị dấu hiệu (số đếm ở biểu tượng chuông) cho biết có việc cần chú ý

#### Scenario: Đề xuất của người dùng vừa được xử lý
- **WHEN** một đề xuất do người dùng tạo chuyển sang trạng thái `approved` hoặc `rejected`
- **THEN** người dùng nhìn thấy thông báo về sự thay đổi này khi họ ở trong ứng dụng

#### Scenario: Nhấp thông báo mở đúng đề xuất
- **WHEN** người dùng nhấp vào một thông báo
- **THEN** hệ thống mở đúng trang chi tiết đề xuất liên quan
