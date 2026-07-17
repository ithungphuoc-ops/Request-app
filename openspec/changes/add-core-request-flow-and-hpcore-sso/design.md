## Context

`base-request-app` là bản clone giao diện "Base Request" (base.vn), Next.js 15 / React 19, hiện chỉ có phần cấu hình admin (nhóm đề xuất, field builder) chạy trên `lib/mock-data.ts` qua `context/RequestContext.tsx` (React state thuần, không backend). Hai module logic nghiệp vụ đã viết sẵn và có test đầy đủ nhưng chưa được gọi ở đâu: `lib/approval-logic.ts` (3 kiểu quy trình duyệt: concurrent/sequential/single) và `lib/permissions.ts` (quyền quản lý nhóm ở mức app, phạm vi "usedFor", follower không tự có quyền duyệt).

Hai app khác trong cùng workspace (`ITAsset`, `pkd_crm-next`) đã tích hợp thành công với hệ thống định danh chung **hpcore.vn** (account.hpcore.vn, Firebase project `hpcons-portal`). Pattern của cả hai giống hệt nhau và đã chạy production — đây là điểm tựa chính của thiết kế này, không phát minh cơ chế mới.

Kiến trúc công ty đã chốt: app con **không có trang phân quyền riêng** — hpcore là nguồn quyền duy nhất, phát vai trò qua `app_permissions/{uid}.<app_key>` (hiện là 1 role string phẳng, chưa có `perms[]` chi tiết — gọi là "GĐ2", chưa hoàn thành phía hpcore).

### Cập nhật quan trọng — đối chiếu với đặc tả gốc

Sau khi triển khai đợt 1 (SSO + backend groups + luồng submit/inbox/duyệt-từ chối đơn giản 3 trạng thái), phát hiện tại workspace root có 4 tài liệu đặc tả gốc chi tiết dùng làm đầu vào ban đầu để dựng app này (không nằm trong repo `base-request-app`):
- `Dac-ta-giao-dien-Base-Request.md` — tổng quan + thiết lập ứng dụng (phần admin/cấu hình nhóm). **Đã đối chiếu: phần đã code (SSO, vai trò Owner/App Admin/Admin/Member, backend groups/categories) khớp đúng đặc tả này, không cần sửa.**
- `Dac-ta-su-dung-hang-ngay-Base-Request.md` — luồng sử dụng hằng ngày (tạo/duyệt/tìm kiếm đề xuất). **Đợt 1 mới làm một phần rất nhỏ của đặc tả này** — thiếu: mô hình trạng thái đầy đủ, hành động "Chuyển tiếp", lưu nháp, trang chi tiết 2 cột, "Đề xuất trực tiếp", cửa sổ chọn nhóm, tìm kiếm/tổng hợp. Xem lại toàn bộ mục 4-8 của tài liệu này để lấy chi tiết đầy đủ khi implement — design.md này chỉ tóm tắt quyết định, không lặp lại toàn văn đặc tả.
- `Dac-ta-thiet-lap-mau-in-Base-Request.md` — tính năng "Thiết lập mẫu in" (upload `.docx`, biến `${mã_trường}`, bảng lặp dòng, biến người duyệt, sinh Word/PDF/QR). **Quyết định: tách thành 1 OpenSpec change RIÊNG trong tương lai** (xem Non-Goals) — quy mô tương đương một tính năng độc lập (xử lý file Word có cấu trúc, hàng đợi sinh file, không phải chuỗi thay thế đơn giản), gộp vào change này sẽ làm phình phạm vi quá mức.
- `Dac-ta-giao-dien-tai-khoan.md` — đặc tả UI "Base Account" (nguồn gốc của `app/base-account/*` đã xoá). Không hành động thêm — quyết định xoá `base-account` để dùng hpcore làm nguồn quyền duy nhất đã chốt và không đổi, bất kể đặc tả này mô tả gì.

Change này (`add-core-request-flow-and-hpcore-sso`) từ đây được hiểu là bao phủ **toàn bộ luồng sử dụng hằng ngày** (`Dac-ta-su-dung-hang-ngay`), không chỉ phần "core" tối giản ban đầu.

## Goals / Non-Goals

**Goals:**
- Người dùng đăng nhập một lần ở hpcore.vn, vào được `base-request-app` không cần đăng nhập lại.
- Dữ liệu nhóm đề xuất/field sống trên Firestore thật, không mất khi tải lại trang.
- Người dùng tạo đề xuất qua đúng luồng chuẩn: nút "Tạo đề xuất" → cửa sổ chọn nhóm (hoặc "Đề xuất trực tiếp") → biểu mẫu động → **Lưu nháp** hoặc **Gửi đề xuất**.
- Đề xuất có đầy đủ vòng đời: nháp → đang chờ duyệt → (đã chấp thuận | đã từ chối | đã trả lại), có hạn xử lý (từ `slaHours` của nhóm) và tự nhận diện quá hạn.
- Người duyệt xử lý bằng 1 trong 3 hành động: **Chấp thuận / Chuyển tiếp / Từ chối**, đúng lượt theo kiểu quy trình (concurrent/sequential/single).
- Có trang chi tiết đề xuất đầy đủ (nội dung + thanh bên: người duyệt/theo dõi/lịch sử hoạt động) — không chỉ danh sách dòng.
- Có trang tìm kiếm/lọc đề xuất theo trạng thái, nhóm, thời gian, người tạo.
- Tái dùng nguyên vẹn `approval-logic.ts` và `permissions.ts` làm nền — MỞ RỘNG thêm (không viết lại) để hỗ trợ "Chuyển tiếp" và mô hình trạng thái đầy đủ hơn.

**Non-Goals (đợt này — để lại cho change tương lai):**
- **Tính năng "Thiết lập mẫu in"** (`Dac-ta-thiet-lap-mau-in-Base-Request.md`) — upload `.docx`, biến `${mã_trường}`, sinh Word/PDF/QR. Tách thành OpenSpec change riêng.
- **Xuất dữ liệu** (Word/Excel hàng loạt từ trang tìm kiếm) — cùng nhóm "sinh file" với mẫu in, để chung 1 change tương lai. Trang tìm kiếm đợt này chỉ lọc + xem, chưa xuất file.
- Webhook, lịch sử nhóm, lịch sử webhook, system-proposals — giữ nguyên placeholder (không thuộc đặc tả "sử dụng hằng ngày").
- Thông báo qua email/Telegram/push — chỉ làm thông báo trong app (chuông + danh sách hoạt động).
- Phân quyền chi tiết per-app (`perms[]`) từ hpcore — chưa tồn tại phía hpcore, dùng tạm 1 role string như ITAsset/pkd_crm-next đang làm.
- Migrate dữ liệu thật — app chưa có người dùng, không có dữ liệu cũ cần giữ.
- Tệp đính kèm (`file` field type, attachment trên đề xuất) thao tác upload thật — đợt này giữ nguyên thông báo "chưa hỗ trợ" đã có, không mở rộng.

## Decisions

### 1. Sao chép nguyên pattern SSO đã kiểm chứng, không tự nghĩ cơ chế mới
Tham khảo chính xác: `ITAsset/src/lib/hpcore.ts`, `ITAsset/src/lib/session.ts`, `ITAsset/src/proxy.ts`, `ITAsset/src/app/api/auth/logout/route.ts`, `ITAsset/src/app/api/roles/route.ts`; `pkd_crm-next/lib/auth/dev-user.ts`.

- App Admin SDK **tên `"hpcore"`** (không phải `[DEFAULT]`) khởi tạo bằng cred `HPCORE_FIREBASE_SERVICE_ACCOUNT` (JSON string, project `hpcons-portal`) — tách biệt hoàn toàn với app Admin SDK mặc định của chính `base-request-app` (Firestore business data, project Firebase riêng).
- `verifyHpcore(cookie)` gọi `getAuth(hpcoreApp).verifySessionCookie(cookie, true)` → `{uid, email} | null`. Cookie tên `session`, domain `.hpcore.vn`, do hpcore phát — app này không tự đặt cookie đăng nhập.
- Vai trò trung tâm đọc tại `app_permissions/{uid}.request_app` trong Firestore của app `"hpcore"` (đặt tên khoá app là `request_app`) — trả về 1 trong 4 giá trị đã có sẵn trong `lib/permissions.ts` (`Role = "owner" | "app_admin" | "admin" | "member"`), KHÔNG đổi type này.
- `GET /api/roles` (public, CORS mở) liệt kê 4 role key/label để sau này hpcore admin gán được — đúng pattern `ITAsset/src/app/api/roles/route.ts`.
- Middleware chặn mọi route dưới `/request/*`; chưa đăng nhập → redirect `https://account.hpcore.vn/login?next=<encoded return url>`.
- Logout: xoá cookie `session` với cả `{domain: '.hpcore.vn'}` và `{}` (đăng xuất khỏi mọi subdomain).
- **Dev fallback** (theo `pkd_crm-next/lib/auth/dev-user.ts`): khi `NODE_ENV !== "production"` và không có cookie hợp lệ → dùng user giả cố định (owner) để phát triển/kiểm thử cục bộ mà không cần hpcore thật chạy.

**Vì sao không tự thiết kế cơ chế auth riêng**: hai app khác đã đi qua đúng các vướng mắc thật (đặt tên app Admin SDK trùng gây lỗi, jose version, uid app tổng khác uid cũ, cookie domain) và đã sửa xong — sao chép pattern giảm rủi ro lặp lại lỗi cũ.

### 2. Toàn bộ truy cập Firestore qua Admin SDK trong API route, không client SDK
Giống quyết định đã áp dụng cho `hpcons-portal` khi migrate sang Firebase ("toàn bộ web đi qua Admin SDK"). Không cần Firestore security rules phức tạp cho web (chỉ cần rule chặn đứt truy cập client trực tiếp, vì không có client nào chạm Firestore). Đơn giản hơn, nhất quán với các app anh em.

### 3. Data model: `groups`, `categories`, `requests`
- `groups/{id}`: giữ đúng shape `ProposalGroup` hiện có trong `lib/types.ts` (không đổi field), field đề xuất lưu embedded array (không tách subcollection) vì số field mỗi nhóm nhỏ (~5-15), field builder cần đọc/ghi toàn bộ mảng cùng lúc khi kéo-thả.
- `categories/{id}`: giữ đúng shape `CategoryGroup`.
- `requests/{id}` — **collection mới**, kiểu `RequestInstance` (thêm vào `lib/types.ts`):
  ```ts
  interface RequestInstance {
    id: string;
    groupId: string;
    groupNameSnapshot: string;
    fieldsSnapshot: ProposalField[]; // chụp lại field tại thời điểm gửi, không phụ thuộc nhóm bị sửa sau
    values: Record<string, unknown>; // fieldId -> giá trị
    submittedBy: { uid: string; email: string; name: string };
    submittedAt: string;
    approvalFlow: ApprovalFlowType;
    approvers: ApproverState[]; // từ lib/approval-logic.ts, khởi tạo "pending" theo đúng thứ tự approvers của group tại thời điểm gửi
    followers: TaggedUser[];
    status: "pending" | "approved" | "rejected";
    history: { at: string; actor: string; action: string }[];
  }
  ```
  **Snapshot field/approver tại thời điểm gửi** (không tham chiếu sống tới `group`) — nếu ai đó sửa nhóm sau khi đã có đề xuất đang chờ duyệt, đề xuất cũ không bị đổi hình dạng giữa chừng. Đây là quyết định quan trọng để tránh race condition giữa "sửa template" và "đề xuất đang chạy".

### 4. Tái dùng `approval-logic.ts` / `permissions.ts` nguyên vẹn, không sửa
API route `POST /api/requests/[id]/decision` gọi thẳng `canApproverAct`, `applyApproverDecision`, `getRequestStatus` từ `lib/approval-logic.ts` — coi các hàm này là input `approvers: ApproverState[]` lấy từ Firestore, output ghi ngược lại Firestore. `GET /api/requests?scope=inbox` lọc bằng `canApproverAct`. `requireWriteAccess()`/tạo-sửa-nhóm dùng `canManageGroupsAtAppScope` từ `lib/permissions.ts`. Không viết lại vì đã có test bao phủ đủ 3 kiểu quy trình.

### 5. Xoá `app/base-account/*` thay vì giữ ở chế độ chỉ xem
Quyết định của Sếp: bỏ hẳn, không giữ bản rút gọn. Lý do: giữ một trang "xem thôi" vẫn tạo ảo giác app này có vai trò quản trị thành viên, dễ gây lệch dữ liệu với hpcore về sau (ai đó sửa nhầm ở đây tưởng có tác dụng). Bỏ hẳn buộc mọi thay đổi vai trò đi qua đúng một nơi.

### 6. `context/RequestContext.tsx` giữ nguyên chữ ký hàm, đổi triển khai bên trong
Không đổi API của context (`createGroup`, `updateGroup`, `addField`, `removeField`, `reorderFields`, `toggleGroupStatus`, `toggleGroupPinned`) để các component tiêu thụ nó (`CreateGroupModal`, `AddFieldModal`, `general/page.tsx`, `form/page.tsx`, `GroupCategoryCard`, `GroupRow`) không phải sửa. Bên trong đổi từ `setState` cục bộ sang gọi `fetch` tới API route + cập nhật state từ response — giữ được optimistic-update pattern hiện có (ví dụ `toggleGroupStatus` đã mô phỏng lỗi mạng và revert, giữ nguyên tinh thần đó với lỗi mạng thật).

### 7. Mô hình trạng thái: 5 trạng thái lưu trữ + 2 nhãn phái sinh (không lưu)
Đặc tả liệt kê 7 "trạng thái" (Nháp, Đang chờ duyệt, Chờ lượt duyệt, Đã chấp thuận, Đã từ chối, Đã trả lại, Quá hạn) nhưng đọc kỹ mục 5.2 thì 2 cái sau **không phải trạng thái độc lập của thực thể** mà là nhãn lọc phụ thuộc người xem/thời điểm:
- **Lưu trữ trên `RequestInstance.status`**: `"draft" | "pending" | "approved" | "rejected" | "returned"` (mở rộng từ 3 giá trị cũ, thêm `draft` và `returned`).
- **`isOverdue`**: tính lúc đọc = `status === "pending" && deadlineAt !== null && deadlineAt < now`, KHÔNG lưu thành trạng thái riêng (deadline không đổi, chỉ cách hiển thị đổi theo thời gian thực).
- **"Chờ lượt duyệt"**: tab lọc ở danh sách = `status === "pending" && !canApproverAct(...)` cho người xem hiện tại — cũng là nhãn phái sinh, không lưu.

Lý do: nếu lưu "Quá hạn"/"Chờ lượt duyệt" như status thật, sẽ phải chạy job nền cập nhật trạng thái liên tục và dễ lệch với trạng thái duyệt thật (`approved`/`rejected` vẫn đúng dù có "quá hạn" nhãn hay không). Tính lúc đọc vừa đúng dữ liệu vừa không cần cron.

**Mở** (chưa chốt được từ 2 tài liệu nguồn): hành động cụ thể nào kích hoạt trạng thái `returned` ("Đã trả lại"). Video xác nhận trực tiếp 3 nút Chấp thuận/Chuyển tiếp/Từ chối; "Đã trả lại" chỉ xuất hiện trong bảng trạng thái (đối chiếu ảnh+tài liệu, độ tin cậy thấp hơn). Đợt này: thêm `returned` vào type để không phải đổi schema lần 2, nhưng **chưa dựng nút hành động riêng cho nó** — chỉ 3 hành động approve/forward/reject được xây. Nếu Sếp xác nhận có nút "Trả lại" riêng (không phải biến thể của Từ chối), làm thêm ở đợt sau.

### 8. Hành động "Chuyển tiếp" (forward) — mở rộng `approval-logic.ts`
Thêm hàm mới `forwardApprover(flow, approvers, fromId, toId)` vào `lib/approval-logic.ts` (KHÔNG sửa 3 hàm cũ đã có test — chỉ thêm hàm mới, additive):
- Kiểm tra `fromId` đang là người có thể thao tác (`canApproverAct`) — giống điều kiện của approve/reject.
- Thay `id` của approver đó bằng `toId`, giữ nguyên `decision: "pending"` và đúng vị trí trong mảng (quan trọng với sequential — người mới kế thừa đúng thứ tự của người cũ).
- Không cho chuyển tiếp cho người đã có mặt trong danh sách approvers (tránh trùng lượt).
- Lịch sử (`RequestInstance.history`) ghi rõ: người chuyển, người nhận, thời gian, lý do (nếu có) — tách khỏi trường `approvers` (approvers chỉ lưu trạng thái hiện tại, không lưu lịch sử ai từng đứng ở vị trí đó).

### 9. Trang chi tiết đề xuất là trang mới, KHÔNG thay thế inbox/my-requests
`app/request/requests/[id]/page.tsx` (route mới) — 2 cột theo đặc tả mục 4.6-4.7: nội dung chính trái (tiêu đề, hạn xử lý, trạng thái, 3 nút hành động khi đúng lượt, thông tin đề xuất, giá trị field) + thanh bên phải (người xét duyệt có tiến trình, người theo dõi, lịch sử hoạt động). `app/request/my-requests` và `app/request/inbox` (đã có) trở thành danh sách dẫn vào trang chi tiết này thay vì tự chứa nút hành động trực tiếp trên từng dòng — khớp đúng đặc tả mục 2.4 "Nhấp bất kỳ vùng chính của hàng để mở chi tiết".

### 10. Cửa sổ chọn nhóm (GroupPickerModal) + "Đề xuất trực tiếp"
Nút "Tạo đề xuất" (đặt ở `my-requests` hoặc một trang danh sách tổng, theo đặc tả là trang chủ Request cho end-user — xem Open Questions) mở `GroupPickerModal`: tìm nhanh + danh sách nhóm theo `usedFor` scope của người dùng hiện tại, cộng thêm 1 lựa chọn cố định "Đề xuất trực tiếp". Chọn nhóm → điều hướng `/request/groups/[groupId]/submit` (route đã có). Chọn "Đề xuất trực tiếp" → route mới `/request/direct/new` — biểu mẫu cố định (tên, mô tả, người xét duyệt tự chọn qua `TagUserInput`/`/api/directory`, người theo dõi, tệp đính kèm chưa hỗ trợ) — tạo `RequestInstance` với `groupId: null`, `approvalFlow` mặc định `"concurrent"` (không có khái niệm "lần lượt" khi người tạo tự chọn người duyệt tự do, trừ khi UI cho chọn — đợt này mặc định đồng thời, đơn giản hoá).

## Risks / Trade-offs

- **[Risk]** Chưa có Firebase project thật cho tới khi Sếp cấp → không kiểm thử được luồng SSO thật đầu-cuối. **Mitigation**: dev-fallback user cho phép code + kiểm thử toàn bộ logic nghiệp vụ và UI ngay, chỉ phần verify cookie thật cần credential.
- **[Risk]** hpcore chưa có `perms[]` chi tiết (GĐ2), chỉ 1 role string → không phân biệt được "được duyệt nhóm A nhưng không được nhóm B" ở cấp hpcore. **Mitigation**: giữ đúng model hiện tại của `lib/permissions.ts` (`usedFor` scope + approvers/followers per-group) làm lớp phân quyền chi tiết trong app, hpcore chỉ quyết "có phải app_admin/owner hay không" ở mức toàn ứng dụng — đúng ranh giới đã thiết kế sẵn trong code cũ.
- **[Risk]** Xoá `app/base-account/*` là thay đổi phá vỡ (breaking) nếu có ai đang dùng thật. **Mitigation**: xác nhận với Sếp đây là app demo/mock chưa có người dùng thật (đã xác nhận trong quá trình lập kế hoạch) — an toàn để xoá.
- **[Trade-off]** Field embedded trong `groups` doc thay vì subcollection: đơn giản hơn nhưng giới hạn ~1MB/doc của Firestore nếu một nhóm có quá nhiều field/option. Chấp nhận được ở quy mô hiện tại (vài chục field là nhiều).

## Migration Plan

1. Code toàn bộ SSO + Firestore layer + API routes + UI luồng lõi, chạy bằng dev-fallback user, Firestore emulator hoặc project tạm (nếu Sếp chưa cấp project thật, có thể dùng emulator cục bộ để tự kiểm thử trước).
2. Khi Sếp cấp Firebase project thật: điền `.env.local`, xác minh SSO thật với `HPCORE_FIREBASE_SERVICE_ACCOUNT` đã có sẵn (không cần tạo mới).
3. Không có dữ liệu cũ cần migrate — deploy thẳng, không cần cửa sổ bảo trì.
4. Rollback: vì chưa có người dùng thật, rollback = revert commit/branch, không có rủi ro dữ liệu.

## Open Questions

- Tên Firebase project mới: đề xuất `hpcons-request`, chờ Sếp xác nhận hoặc đổi tên khi tạo.
- Khoá app trong `app_permissions/{uid}.<key>`: đề xuất `request_app` — cần khớp với bất kỳ quy ước đặt tên nào hpcore team dùng khi thêm app này vào danh sách quản lý (việc đó nằm ngoài phạm vi repo này).
- Nội dung/tần suất thông báo trong app (đợt này chỉ làm danh sách tĩnh khi tải trang, chưa realtime) — có thể nâng cấp real-time (Firestore listener) ở đợt sau nếu cần.
- Trạng thái `returned` ("Đã trả lại") kích hoạt bằng hành động riêng hay chỉ là biến thể hiển thị của "Từ chối" — chưa xác nhận được từ 2 tài liệu nguồn (xem Decision 7). Cần Sếp xác nhận hoặc xem lại video gốc nếu có.
- Trang nào là "trang chủ Request" cho end-user chứa nút "Tạo đề xuất" chính + GroupPickerModal? Đợt 1 hiện dùng `/request/groups` làm trang admin cấu hình (theo đặc tả `Dac-ta-giao-dien-Base-Request.md`, dành cho Owner/App Admin). Đặc tả sử dụng hằng ngày mô tả một "trang chủ" khác dành cho MỌI người dùng (không chỉ admin) để tạo/xem đề xuất — cần quyết định: dùng chung `/request/groups` (ẩn nút cấu hình với member thường) hay tách hẳn 1 route mới `/request` làm trang chủ end-user, `/request/groups` chỉ còn dành cho admin cấu hình.
