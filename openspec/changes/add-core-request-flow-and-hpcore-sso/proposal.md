## Why

`base-request-app` hiện chỉ là giao diện cấu hình (tạo nhóm đề xuất, field builder) chạy hoàn toàn trên mock data trong bộ nhớ — không có backend, không có đăng nhập, mất dữ liệu khi tải lại trang. Phần giá trị cốt lõi của một app request thật — người dùng gửi đề xuất và người có trách nhiệm duyệt nó — chưa tồn tại, dù logic duyệt (`lib/approval-logic.ts`) và logic phân quyền (`lib/permissions.ts`) đã được viết sẵn và có test đầy đủ nhưng chưa có UI/API nào gọi tới. Công ty cần app này chạy thật, có người dùng đăng nhập qua hệ thống định danh chung (hpcore.vn) và dữ liệu được lưu trữ bền vững.

## What Changes

- Tích hợp SSO với app tổng hpcore.vn (account.hpcore.vn): xác minh cookie phiên chung, không tự quản đăng nhập/mật khẩu.
- **BREAKING**: Xoá toàn bộ `app/base-account/*` và các component riêng cho nó — trang quản lý thành viên/quyền tự chế không còn cần thiết vì hpcore.vn là nguồn quyền duy nhất (quyết định kiến trúc đã chốt cho toàn hệ sinh thái).
- Thêm backend Firestore (project Firebase riêng cho app): thay `lib/mock-data.ts` bằng dữ liệu thật cho nhóm đề xuất/danh mục, truy cập qua Admin SDK trong API route (không client Firestore trực tiếp).
- Thêm capability mới hoàn toàn: gửi đề xuất từ một nhóm/template, hộp thư "chờ tôi duyệt", hành động duyệt/từ chối theo đúng 3 kiểu quy trình (đồng thời/lần lượt/một người), thông báo đơn giản trong ứng dụng.
- `context/RequestContext.tsx` chuyển từ đọc mock sang gọi API thật; các hàm mutate hiện có (createGroup/updateGroup/addField/removeField/reorderFields) giữ nguyên chữ ký nhưng gọi API.

## Capabilities

### New Capabilities
- `hpcore-sso`: Xác thực người dùng qua cookie phiên chung của hpcore.vn, đọc vai trò trung tâm theo app, chặn truy cập khi chưa đăng nhập, đăng xuất xoá cookie toàn hệ thống.
- `request-groups-backend`: CRUD nhóm đề xuất (template) và trường dữ liệu (field) trên Firestore qua API route, thay thế hoàn toàn mock data, giữ hành vi hiện có của UI cấu hình.
- `request-submission-approval`: Gửi đề xuất từ một nhóm, theo dõi đề xuất đã gửi ("Đề xuất của tôi"), hộp thư chờ duyệt ("Chờ tôi duyệt"), hành động duyệt/từ chối đúng luật của từng kiểu quy trình xử lý, thông báo trong ứng dụng khi có việc cần chú ý.

### Modified Capabilities
(Không có — đây là dự án mới, chưa có spec nào tồn tại trước đó.)

## Impact

- **Xoá**: `app/base-account/`, `components/base-account/*`, phần dữ liệu liên quan trong `lib/mock-data.ts` (`installedApps`, `appPermissions`).
- **Thêm mới**: `lib/hpcore.ts`, `lib/session.ts`, `lib/firebase/admin.ts`, `middleware.ts`, `app/api/auth/logout/route.ts`, `app/api/roles/route.ts`, `app/api/groups/**`, `app/api/requests/**`, `app/request/groups/[groupId]/submit/page.tsx`, `app/request/my-requests/page.tsx`, `app/request/inbox/page.tsx`.
- **Sửa**: `context/RequestContext.tsx` (nguồn dữ liệu), `lib/types.ts` (thêm `RequestInstance` và các type liên quan), `lib/mock-data.ts` (thu gọn hoặc bỏ hẳn khi không còn là nguồn sự thật), `components/request/AppBar.tsx` (thêm khu vực thông báo).
- **Tái sử dụng nguyên vẹn, không sửa logic**: `lib/approval-logic.ts`, `lib/permissions.ts` — cả hai đã có test, hiện đang mồ côi, sẽ được các API route mới gọi tới lần đầu tiên.
- **Phụ thuộc ngoài**: cần Firebase project mới (Firestore + service account) do Sếp cấp trước khi có thể xác thực/lưu dữ liệu thật; trước đó phát triển và kiểm thử bằng dev-fallback user.
- **Không đổi**: `group-history`, `webhook`, `webhook-history`, `webhook-trace`, `system-proposals`, `print` — giữ nguyên trạng thái placeholder hiện tại.
