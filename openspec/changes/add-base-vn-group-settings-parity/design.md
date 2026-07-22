## Context

`base-request-app` clone tính năng "Base Request" của Base.vn. Đợt trước đã xây xong luồng lõi (nhóm, field tuỳ chỉnh có mã ổn định, luồng duyệt cơ bản, mẫu in .docx). Sếp cung cấp video quay màn hình trang cài đặt nhóm thật trên Base.vn và muốn app đạt độ tương đồng cao hơn. Change này chỉ bao phủ những gì ĐÃ XÁC MINH được qua video (xem proposal.md) — 4 mục sidebar chưa xem (In đề xuất kiểu Base, Phân quyền kiểu Base, Chữ ký điện tử, Thông báo) nằm ngoài phạm vi, cố tình không thiết kế để tránh bịa.

Dữ liệu nghiệp vụ nằm ở Firestore (`groups`, `requests`), truy cập qua Admin SDK, không có client Firestore trực tiếp — giữ nguyên kiến trúc này. Logic duyệt cốt lõi (`lib/approval-logic.ts`, `lib/permissions.ts`) đã có test bao phủ, KHÔNG đổi trong change này.

## Goals / Non-Goals

**Goals:**
- Thêm cơ chế điều kiện dùng chung cho bước duyệt và người theo dõi, đủ để tái tạo case thật trong video ("Trưởng phòng Kỹ thuật Thi công Khối 2" chỉ duyệt khi thoả 1 điều kiện).
- Thêm mã ổn định cho bước duyệt, theo đúng pattern đã dùng cho field.
- Thêm cấu hình chi tiết luồng phê duyệt (SLA từng người, bắt buộc ý kiến theo hành động).
- Thêm bộ đếm mã đề xuất riêng theo nhóm, tách biệt bộ đếm toàn hệ thống.
- Nâng cấp mô tả nhóm sang rich text, thêm Phân loại + toggle "Mẫu form đề xuất?".

**Non-Goals:**
- KHÔNG thiết kế "SLA theo lịch làm việc" chi tiết (cấu hình giờ hành chính/ngày nghỉ riêng theo công ty) — dùng mặc định cố định trong change này, để ngỏ cho change sau nếu cần.
- KHÔNG đổi `lib/approval-logic.ts`/`lib/permissions.ts` — mọi logic mới nằm ở tầng gọi (`lib/server/requests.ts`) hoặc file mới.
- KHÔNG động vào 4 mục chưa xác minh (In đề xuất/Phân quyền/Chữ ký điện tử/Thông báo kiểu Base).
- KHÔNG bắt buộc phải khớp 100% UI pixel-by-pixel với Base.vn — khớp đúng HÀNH VI và DỮ LIỆU, giao diện theo phong cách hiện có của app.

## Decisions

### 1. Cấu trúc điều kiện — `ConditionRule`
```ts
interface ConditionRule {
  fieldCode: string;               // tham chiếu ProposalField.code trong CÙNG nhóm
  operator: "equals" | "not_equals" | "includes";
  value: string;                   // so với single_choice/department_select dùng equals/not_equals;
                                    // với multiple_choice dùng includes (value nằm trong mảng đã chọn)
}
```
Lý do chọn model đơn giản (1 field – 1 toán tử – 1 giá trị) thay vì cây điều kiện AND/OR lồng nhau: video chỉ cho thấy "1 điều kiện" số ít, không có bằng chứng Base.vn hỗ trợ điều kiện phức hợp ở cấp UI thường (chỉ có ở "Mẫu form phê duyệt" BETA — ngoài phạm vi). Bắt đầu đơn giản, mở rộng sau nếu cần thay vì đoán trước một cấu trúc phức tạp không có bằng chứng.

Đặt tại `lib/types.ts`, dùng chung cho `ApproverStepDef.condition?: ConditionRule` và `ProposalGroup.followersConditional?: { condition: ConditionRule; users: TaggedUser[] }[]`.

Hàm đánh giá `evaluateCondition(rule, values, fields): boolean` đặt tại `lib/server/conditions.ts` (file mới, có unit test riêng, không lẫn vào `requests.ts` để dễ test độc lập).

### 2. `ApproverStepDef` đổi shape có kiểm soát
```ts
export type ApproverStepDef =
  | { kind: "fixed"; user: TaggedUser; code?: string; condition?: ConditionRule }
  | { kind: "submitter_manager"; code?: string; condition?: ConditionRule };
```
`code?` optional ở type, nhưng backfill ngầm ngay trong `toProposalGroup()`/route GET giống hệt cách `ProposalField.code` đã làm — tránh phải viết script migrate dữ liệu thủ công cho toàn bộ nhóm hiện có (đã có 1 lần rủi ro thao tác tay ở đợt trước, tránh lặp lại).

### 3. Bộ đếm riêng theo nhóm — tái dùng transaction pattern
`generateRequestCode()` hiện có transaction trên `counters/requestCode`. Thêm `generateGroupRequestCode(groupId)` dùng transaction trên `counters/group_{groupId}`, cùng format 6 chữ số. `POST /api/requests` và PATCH submit-from-draft chọn hàm nào dựa trên `group.useOwnCounter`. Không đổi `generateRequestCode()` hiện có (0 rủi ro hồi quy cho nhóm không bật tuỳ chọn mới).

### 4. Rich text mô tả nhóm — Tiptap (đề xuất, cần Sếp xác nhận)
Chưa có thư viện rich text nào trong `package.json`. Đề xuất dùng **Tiptap** (`@tiptap/react`, `@tiptap/starter-kit`): nhẹ, React-first, dễ giới hạn bộ nút đúng với danh sách Base.vn cho thấy (bold/italic/underline/strike/quote/code/link/ảnh/heading/list), lưu dạng HTML. Lưu ở field mới `ProposalGroup.descriptionHtml: string` (giữ nguyên `description: string` cũ làm bản plain-text rút gọn, dùng cho những nơi hiển thị ngắn như danh sách nhóm — tránh phải sửa mọi nơi đang đọc `description`).

**Bắt buộc sanitize HTML phía server** (dùng `sanitize-html` hoặc tương đương) trước khi lưu — dữ liệu mô tả do người dùng nhập, hiển thị lại cho người khác, phải chặn XSS (script/onerror...).

### 5. "Mẫu form phê duyệt" — vẫn chỉ lưu cấu hình, KHÔNG áp dụng logic phức tạp ngay
Ngoài phạm vi change này (chưa có UI/dữ liệu tương ứng) — giữ nguyên Non-Goals.

### 6. Ưu tiên vai trò khi trùng khối — CHỐT: dedupe theo lần xuất hiện SAU CÙNG (Sếp xác nhận làm luôn)
Khi cùng 1 người được nhiều bước duyệt cùng chọn (vd vừa là "Quản lý trực tiếp" vừa là "Trưởng phòng" do trùng người thật), `resolveApproverSteps()` sẽ trả về `TaggedUser[]` có id trùng nhau. Thêm hàm thuần `dedupeApprovers(users: TaggedUser[]): TaggedUser[]` (đặt ở `lib/approval-logic.ts` — cùng file với `ApproverState`, được test kỹ) chỉ giữ lại đúng 1 lần cho mỗi id, Ở VỊ TRÍ CỦA LẦN XUẤT HIỆN SAU CÙNG trong mảng gốc — khớp đúng ngữ nghĩa "ưu tiên vai trò của khối xuất hiện sau cùng nhất" mà KHÔNG cần thêm field cấu hình mới (đây là hành vi MẶC ĐỊNH DUY NHẤT hợp lý, không có lựa chọn khác được xác nhận từ Base.vn thật). Áp dụng NGAY SAU `resolveApproverSteps()`, TRƯỚC `buildInitialApprovers()`, ở cả 2 nơi gọi (`POST /api/requests`, PATCH submit-from-draft) — `approversSnapshot` và `approvers` luôn được build từ CÙNG 1 danh sách đã dedupe nên giữ nguyên tương ứng 1-1. KHÔNG đổi shape `ApproverState`/chữ ký các hàm `canApproverAct`/`applyApproverDecision`/`getRequestStatus`/`forwardApprover` — dedupe xảy ra TRƯỚC khi các hàm này nhận dữ liệu, nên rủi ro thấp hơn nhiều so với phương án đổi type ban đầu lo ngại.

### 7. SLA theo giờ hành chính — công thức giờ làm việc thật (Sếp xác nhận)
Giờ hành chính: **7:45–12:00** và **13:00–17:15**, các ngày **Thứ 2 – Thứ 7** (Chủ nhật nghỉ hoàn toàn). Thêm module thuần `lib/business-hours.ts` (không server-only, test được) với `addBusinessHours(from: Date, hours: number): Date` — cộng dồn số giờ SLA CHỈ trong các khung giờ trên, tự động nhảy qua giờ nghỉ trưa/ngoài giờ/Chủ nhật. `computeDeadline()` (`lib/server/requests.ts`) nhận thêm tham số `useBusinessHours` (từ `group.slaByWorkCalendar`), gọi `addBusinessHours` khi bật, giữ nguyên phép cộng giờ đồng hồ liên tục khi tắt (không đổi hành vi mặc định).

### 8. Rà soát "In đề xuất" và "Phân quyền" hiện có (mục 3, Sếp yêu cầu)
Đây là 2 tính năng ĐÃ XÂY xong ở các đợt trước (mail-merge .docx, `lib/permissions.ts`+trang permissions) — KHÔNG có trong video Base.vn thật (Sếp chưa quay tới 2 tab này) nên KHÔNG so sánh pixel-by-pixel được với bản gốc. Phạm vi rà soát: đọc lại code, kiểm tra tính đúng đắn nội tại (bug, luồng dữ liệu, quyền hạn) và chạy thử trên dev — KHÔNG phải làm lại theo tham chiếu Base.vn vì chưa có tham chiếu. Nếu phát hiện bug thật thì sửa; nếu không phát hiện gì thì báo cáo rõ đã rà soát và kết luận.

## Risks / Trade-offs

- [Rủi ro] Thêm `descriptionHtml` + sanitize sai sót có thể lọt XSS → Mitigation: dùng thư viện sanitize đã kiểm chứng (`sanitize-html`), test riêng với payload `<script>`, `onerror=`, `javascript:` trong href.
- [Rủi ro] Đổi shape `ApproverStepDef` có thể vỡ code cũ đọc `step.user` mà không kiểm tra `kind` → Mitigation: giữ nguyên 2 `kind` hiện có, chỉ THÊM field optional, không đổi field cũ; chạy `npm run build` (TypeScript) sẽ tự bắt được chỗ nào truy cập sai.
- [Rủi ro] Bộ đếm riêng theo nhóm nếu bật SAU khi nhóm đã có đề xuất cũ dùng mã từ bộ đếm chung → số thứ tự riêng bắt đầu lại từ 1, có thể trùng "cảm giác" với mã cũ (dù không trùng hệ thống vì mã đầy đủ khác nhau theo context nhóm) → Mitigation: ghi rõ trong UI cảnh báo khi bật tuỳ chọn lần đầu.
- [Đánh đổi] Không thiết kế cây điều kiện AND/OR ngay từ đầu → nếu sau này Base.vn thật có điều kiện phức hợp, sẽ cần đổi `ConditionRule` thành mảng — chấp nhận được vì hiện chưa có bằng chứng cần thiết.

## Migration Plan

1. Deploy code mới (các field mới đều optional, không cần migrate dữ liệu Firestore ngay).
2. Backfill `code` cho `approverSteps` diễn ra NGẦM khi đọc qua API (giống field), không cần script chạy tay.
3. Không cần rollback đặc biệt — mọi field mới optional, tắt mặc định, không đổi hành vi nhóm hiện có nếu không ai bật tuỳ chọn mới.

## Open Questions

1. **Cơ chế điều kiện đúng của Base.vn có phải chỉ 1-field-1-điều-kiện không?** Video chỉ cho thấy chữ "1 điều kiện", không cho thấy màn hình cấu hình chi tiết — ĐÃ TRIỂN KHAI theo giả định 1-field-1-điều-kiện, chưa có phản hồi khác từ Sếp.
2. ~~"Ưu tiên vai trò người duyệt khi trùng khối"~~ — **ĐÃ CHỐT** (xem Decision #6): dedupe theo lần xuất hiện sau cùng, KHÔNG đổi `ApproverState`, chỉ dedupe `TaggedUser[]` trước khi build initial approvers — rủi ro thấp hơn lo ngại ban đầu.
3. ~~Tiptap hay thư viện rich text khác?~~ — **ĐÃ CHỐT**: Tiptap, Sếp đã xác nhận, đã cài đặt.
4. ~~SLA theo lịch làm việc — giờ hành chính cụ thể?~~ — **ĐÃ CHỐT** (xem Decision #7): 7:45–12:00 và 13:00–17:15, Thứ 2–Thứ 7, nghỉ Chủ nhật.
