## Why

Đề xuất sau khi duyệt xong hiện chỉ xuất được `.docx` (tính năng "In theo mẫu" — mail-merge thật vào file Word do Sếp tự thiết kế). File Word dễ bị chỉnh sửa sau khi in, khó gửi/lưu trữ ổn định như PDF. Sếp muốn THÊM tuỳ chọn xuất PDF, ưu tiên dùng công cụ mã nguồn mở thay vì dịch vụ SaaS trả phí bên thứ 3 (lo ngại chi phí theo lượt + dữ liệu đề xuất rời khỏi hạ tầng công ty).

## What Changes

- Thêm tuỳ chọn "Xuất PDF" bên cạnh "In theo mẫu" (.docx) hiện có ở trang chi tiết đề xuất — **KHÔNG thay thế** luồng .docx đang chạy tốt, chỉ thêm định dạng xuất mới.
- **CHƯA CHỐT phương án kỹ thuật cụ thể** — 3 hướng đã cân nhắc (chi tiết trong `design.md`), cần Sếp xác nhận trước khi có `tasks.md` triển khai code thật:
  1. Tự host **Gotenberg** (mã nguồn mở, Docker) trên 1 VPS riêng, app gọi qua HTTP để convert buffer `.docx` đã render sẵn sang PDF — **đề xuất mặc định** nếu phải chọn 1 hướng, vì giữ nguyên đúng bố cục/logo file Word thật và không tốn phí theo lượt.
  2. Dịch vụ SaaS bên thứ 3 (vd CloudConvert) — đã cân nhắc và **loại bỏ** do lo ngại chi phí + dữ liệu ra ngoài, giữ lại trong hồ sơ để đầy đủ.
  3. Tự vẽ PDF trực tiếp từ dữ liệu bằng thư viện JS mã nguồn mở chạy ngay trên Vercel (không cần server riêng) — không cần hạ tầng thêm nhưng phải lập trình lại toàn bộ bố cục tách biệt khỏi file Word, dễ lệch giữa 2 mẫu theo thời gian.
- Việc xác nhận Sếp có hạ tầng server phù hợp cho phương án 1 hay không là **điều kiện tiên quyết** trước khi triển khai code thật.

## Capabilities

### New Capabilities
- `pdf-export`: Xuất đề xuất ra file PDF (bên cạnh `.docx` hiện có), tái sử dụng đúng buffer đã mail-merge từ `renderPrintTemplate()` hiện có làm đầu vào cho bước chuyển đổi sang PDF.

### Modified Capabilities
(không có — tính năng `.docx` hiện có giữ nguyên hành vi, không sửa)

## Impact

- **Hạ tầng**: nếu chọn phương án 1 (Gotenberg self-host), cần thêm 1 server/VPS ngoài Vercel — ảnh hưởng chi phí vận hành và trách nhiệm bảo trì, cần Sếp xác nhận trước.
- **API**: có thể cần route mới `app/api/requests/[id]/export-pdf/route.ts` (hoặc mở rộng route export hiện có thêm tham số định dạng) — CHƯA thiết kế chi tiết, chờ chốt phương án.
- **UI**: `components/request/RequestDetailView.tsx` — thêm lựa chọn định dạng xuất (docx/pdf) ở menu "In theo mẫu" hiện có.
- **Không đụng**: `lib/server/print-engine.ts`, `lib/print-template.ts` (logic mail-merge .docx hiện có) — PDF chỉ là bước CHUYỂN ĐỔI THÊM sau khi đã có buffer .docx hoàn chỉnh, không viết lại engine mail-merge.
