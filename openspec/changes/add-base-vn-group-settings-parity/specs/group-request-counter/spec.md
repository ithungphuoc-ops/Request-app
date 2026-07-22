## ADDED Requirements

### Requirement: Bật/tắt bộ đếm riêng theo nhóm
`ProposalGroup` SHALL có tuỳ chọn "Sử dụng mã bộ đếm cho nhóm đề xuất?" (mặc định tắt/false). Khi tắt, mã đề xuất của nhóm SHALL tiếp tục dùng bộ đếm toàn hệ thống hiện có (`generateRequestCode()`, `counters/requestCode`) — không đổi hành vi hiện tại.

#### Scenario: Nhóm chưa bật bộ đếm riêng dùng bộ đếm chung
- **WHEN** một đề xuất được gửi chính thức từ nhóm có `useOwnCounter` là false hoặc chưa đặt
- **THEN** mã đề xuất được cấp từ bộ đếm toàn hệ thống, đúng hành vi hiện có

### Requirement: Bộ đếm riêng độc lập theo từng nhóm khi bật
Khi một nhóm bật bộ đếm riêng, mã đề xuất của CHÍNH NHÓM ĐÓ SHALL tăng độc lập, không dùng chung số thứ tự với bộ đếm toàn hệ thống hoặc bộ đếm của nhóm khác. Việc cấp số SHALL dùng transaction Firestore trên document đếm riêng của nhóm để không trùng khi nhiều người gửi cùng lúc, theo đúng pattern đã có ở `generateRequestCode()`.

#### Scenario: Nhóm bật bộ đếm riêng cấp số độc lập
- **WHEN** nhóm A bật bộ đếm riêng và đã có 3 đề xuất gửi chính thức, sau đó gửi đề xuất thứ 4
- **THEN** mã đề xuất thứ 4 của nhóm A là số thứ tự thứ 4 của RIÊNG nhóm A, không bị ảnh hưởng bởi số lượng đề xuất đã gửi ở nhóm khác hoặc bộ đếm toàn hệ thống

#### Scenario: Gửi đồng thời không trùng mã
- **WHEN** hai đề xuất của cùng một nhóm có bộ đếm riêng được gửi chính thức gần như đồng thời
- **THEN** cả hai nhận được mã khác nhau, không trùng
