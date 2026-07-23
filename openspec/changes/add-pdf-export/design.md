## Context

App triển khai trên **Vercel** (serverless function): không có filesystem bền vững giữa các lần gọi, không cài được binary hệ thống (LibreOffice, unoconv...) trực tiếp trong function, mỗi lần gọi chạy trong container tạm thời riêng biệt. Tính năng "In theo mẫu" hiện có (`lib/server/print-engine.ts` → `renderPrintTemplate()`) đã tạo ra được buffer `.docx` HOÀN CHỈNH (đã mail-merge dữ liệu thật, nhân dòng bảng thật) — bước PDF chỉ cần CHUYỂN ĐỔI buffer này sang PDF, không cần làm lại phần mail-merge.

Sếp ưu tiên **mã nguồn mở**, không muốn phụ thuộc dịch vụ SaaS bên thứ 3 trả phí theo lượt (rủi ro chi phí + dữ liệu đề xuất công ty rời khỏi hạ tầng).

## Goals / Non-Goals

**Goals:**
- Thêm được lựa chọn "Xuất PDF" cho người dùng, PDF có bố cục giống hệt file Word thật (logo, bảng chi tiết, chữ ký...).
- Ưu tiên giải pháp mã nguồn mở, tránh phụ thuộc SaaS bên thứ 3 nếu khả thi.

**Non-Goals:**
- KHÔNG thay thế `.docx` — vẫn giữ nguyên tuỳ chọn xuất Word như hiện tại.
- KHÔNG viết lại `lib/server/print-engine.ts`/`lib/print-template.ts` — PDF là bước xử lý THÊM sau khi đã có buffer `.docx`.
- Change này **CHƯA CHỐT** phương án kỹ thuật cuối cùng — phần "Migration Plan"/code thật chỉ bắt đầu sau khi Sếp xác nhận ở mục Open Questions.

## Decisions

### So sánh 3 phương án (đã cân nhắc — xem quyết định cuối ngay bên dưới bảng)

| Tiêu chí | 1. Gotenberg tự host | 2. SaaS bên thứ 3 (CloudConvert...) | 3. Tự vẽ PDF bằng code (pdfmake/@react-pdf/renderer) |
|---|---|---|---|
| Mã nguồn mở | Có (Gotenberg + LibreOffice/Chromium bên trong, Apache-2.0) | Không (dịch vụ đóng, trả phí) | Có |
| Cần hạ tầng thêm | **Có** — 1 VPS/server riêng chạy Docker, ngoài Vercel | Không (chỉ gọi API) | Không — chạy ngay trong Vercel function |
| Chi phí vận hành | Cố định hàng tháng (thuê/duy trì server), không tính theo lượt | Theo lượt/gói tháng của nhà cung cấp | Không phát sinh hạ tầng, chỉ công sức lập trình ban đầu + bảo trì code |
| Dữ liệu ra ngoài | Không (nếu server do công ty tự quản) | Có — file đề xuất gửi qua máy chủ bên thứ 3 | Không |
| Giữ đúng bố cục file Word thật | **Có** — convert trực tiếp file Word đã mail-merge | Có (cùng cơ chế convert file thật) | **Không** — phải lập trình lại thủ công từng phần bố cục bằng code, tách biệt hoàn toàn khỏi file Word |
| Rủi ro lệch mẫu theo thời gian | Không (luôn bám theo đúng file Word Sếp đang dùng) | Không | **Có** — Sếp sửa file Word xong dễ quên cập nhật code PDF tương ứng, 2 bản có thể lệch nhau |
| Độ phức tạp triển khai ban đầu | Trung bình (dựng server, cấu hình Docker, gọi HTTP từ Vercel) | Thấp (chỉ gọi API) | Cao (viết lại toàn bộ layout: logo, bảng nhân dòng, khối chữ ký... bằng code cho TỪNG mẫu/nhóm khác nhau) | 
| Cần Sếp chuẩn bị gì trước | 1 VPS/server (có Docker), mở cổng cho Vercel gọi vào (hoặc ngược lại) | Tài khoản + API key nhà cung cấp | Không cần gì thêm về hạ tầng |

**ĐÃ CHỐT: Phương án 1, dùng Gotenberg.** Sếp đã xác nhận chọn Gotenberg (không phải Stirling-PDF, cũng được cân nhắc — xem ghi chú dưới). Đánh đổi chính là cần Sếp có/thuê 1 server riêng — **hạ tầng cụ thể chưa xác nhận**, xem Open Questions.

**Ghi chú: đã cân nhắc thêm Stirling-PDF** (github.com/Stirling-Tools/Stirling-PDF) theo đề xuất của Sếp — đây là ứng dụng Java/Spring Boot đầy đủ (50+ công cụ PDF: gộp/tách/ký/OCR/nén...), phần lõi MIT license (vài thư mục tính năng doanh nghiệp như SSO/audit có license riêng, không liên quan tới nhu cầu này). Xác nhận được: phần chuyển đổi office→PDF của Stirling-PDF bên trong CŨNG dùng LibreOffice/unoconvert — cùng công nghệ nền với Gotenberg, không phải hướng đi khác. Không phải "vài dòng code" tách rời được — muốn dùng phải tự host TOÀN BỘ server Stirling-PDF (Docker) và gọi REST API của nó, kiến trúc tương đương Gotenberg nhưng nặng hơn (JVM + LibreOffice + nhiều tính năng không dùng tới). Sếp đã xác nhận chọn Gotenberg vì nhẹ hơn, đúng trọng tâm.

### Kiến trúc dự kiến NẾU chọn phương án 1 (Gotenberg)

1. Server riêng (VPS) chạy container Gotenberg (`docker run gotenberg/gotenberg`), expose 1 endpoint HTTP nội bộ (bảo vệ bằng token/whitelist IP Vercel, KHÔNG public hoàn toàn).
2. `app/api/requests/[id]/export/route.ts` (đã có) thêm tham số `format=pdf`: sau khi `renderPrintTemplate()` tạo xong buffer `.docx` như hiện tại, gọi `POST` tới Gotenberg's `/forms/libreoffice/convert` kèm file `.docx`, nhận về buffer PDF, trả cho người dùng — **không đổi bước mail-merge hiện có**, chỉ thêm 1 bước chuyển đổi phụ.
3. Biến môi trường mới (vd `GOTENBERG_URL`, `GOTENBERG_TOKEN`) — theo đúng quy ước `.env.local` hiện có của dự án.

## Risks / Trade-offs

- [Rủi ro] Phương án 1 cần vận hành thêm 1 server — nếu server sập/hết hạn, tính năng PDF ngừng hoạt động NHƯNG tính năng `.docx` hiện có KHÔNG bị ảnh hưởng (thiết kế tách rời, PDF chỉ là lựa chọn thêm) → Mitigation: xử lý lỗi rõ ràng khi gọi Gotenberg thất bại, không chặn luồng xuất `.docx` đang chạy tốt.
- [Rủi ro] Độ trễ mạng gọi từ Vercel ra server riêng → Mitigation: đặt timeout hợp lý, báo lỗi rõ ràng thay vì treo trang.
- [Đánh đổi] Nếu sau này đổi ý sang phương án 2/3, phần code gọi Gotenberg (bước 2 kiến trúc ở trên) có thể thay thế độc lập mà không ảnh hưởng `renderPrintTemplate()` — kiến trúc tách bước mail-merge/convert giúp đổi phương án sau này ít rủi ro hơn.

## Migration Plan

**CHƯA BẮT ĐẦU** — chờ chốt Open Questions bên dưới trước khi có kế hoạch triển khai code thật trong `tasks.md`.

## Open Questions

1. ~~Chọn phương án nào trong 3 phương án ở trên?~~ — **ĐÃ CHỐT**: Phương án 1, dùng Gotenberg.
2. **Sếp đã có sẵn VPS/server riêng (có thể cài Docker) chưa, hay cần tính chi phí thuê mới?** Server đó có thể mở kết nối ra ngoài an toàn (cho Vercel gọi vào) không?
3. **Ai sẽ vận hành/bảo trì server đó** về lâu dài (cập nhật, theo dõi uptime) — Sếp tự làm hay cần bên thứ 3 hỗ trợ vận hành?
