## ADDED Requirements

### Requirement: Người theo dõi theo điều kiện
Bên cạnh danh sách "Người theo dõi cố định" (`ProposalGroup.followers`, đã có), nhóm SHALL hỗ trợ thêm danh sách "Người theo dõi theo điều kiện" — mỗi mục gồm 1 điều kiện (dùng `conditional-approval-rules`) và danh sách người/nhóm được thêm làm follower khi điều kiện đó thoả mãn tại thời điểm gửi chính thức.

#### Scenario: Người theo dõi theo điều kiện được thêm khi điều kiện thoả mãn
- **WHEN** đề xuất được gửi chính thức và 1 điều kiện trong "Người theo dõi theo điều kiện" của nhóm thoả mãn
- **THEN** danh sách người/nhóm gắn với điều kiện đó được gộp thêm vào `RequestInstance.followers`, không trùng lặp với người đã có trong danh sách cố định hoặc do người gửi tự thêm qua UI

#### Scenario: Điều kiện không thoả mãn thì không thêm follower tương ứng
- **WHEN** đề xuất được gửi chính thức và điều kiện của 1 mục "Người theo dõi theo điều kiện" không thoả mãn
- **THEN** người/nhóm gắn với điều kiện đó KHÔNG được thêm vào followers của đề xuất

#### Scenario: Kết hợp với người theo dõi người gửi tự thêm
- **WHEN** người gửi tự thêm thêm người theo dõi qua ô "Người theo dõi" ở form Gửi đề xuất (tính năng đã có), đồng thời có người theo dõi theo điều kiện thoả mãn
- **THEN** `RequestInstance.followers` cuối cùng là hợp của: danh sách cố định + danh sách người gửi tự thêm + danh sách theo điều kiện thoả mãn, loại trùng theo `id`
