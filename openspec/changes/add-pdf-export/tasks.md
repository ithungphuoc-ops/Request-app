## 1. Xác nhận với Sếp trước khi code (bắt buộc — xem design.md Open Questions)

- [x] 1.1 Xác nhận chọn phương án kỹ thuật — ĐÃ CHỐT: Phương án 1, dùng Gotenberg (không dùng Stirling-PDF, đã cân nhắc và loại vì nặng hơn không cần thiết)
- [x] 1.2 Xác nhận Sếp chưa có VPS/server riêng — cần thuê mới. Đã tư vấn cấu hình tối thiểu (1 vCPU/2GB RAM/~20GB đĩa) + ước tính giá tham khảo 3 nhóm nhà cung cấp (VN, DigitalOcean/Vultr, Hetzner) — Sếp chọn **"Để sau, chưa vội chọn ngay"**.
- [ ] 1.3 **TẠM DỪNG** — chờ Sếp quay lại chọn nhà cung cấp VPS cụ thể + duyệt chi phí hosting hàng tháng trước khi tiến hành tiếp
- [ ] 1.4 Xác nhận ai vận hành/bảo trì server đó lâu dài

**Trạng thái: TẠM DỪNG ở bước 1.3 — không code gì thêm cho tới khi Sếp xác nhận VPS.**

## 2. Dựng hạ tầng (CHỈ áp dụng nếu chọn phương án 1 — Gotenberg tự host)

- [ ] 2.1 Cài Docker + chạy container Gotenberg trên server đã xác nhận ở Nhóm 1
- [ ] 2.2 Cấu hình bảo mật endpoint Gotenberg (token và/hoặc whitelist IP — KHÔNG public hoàn toàn không xác thực)
- [ ] 2.3 Thêm biến môi trường `GOTENBERG_URL`/`GOTENBERG_TOKEN` vào `.env.local` (Sếp cung cấp giá trị thật, theo đúng quy ước dự án — không tự bịa)
- [ ] 2.4 Kiểm tra kết nối thử từ máy dev tới endpoint Gotenberg trước khi viết code gọi thật

## 3. Nối vào luồng export hiện có

- [ ] 3.1 Thêm hàm `convertDocxToPdf(buffer: Buffer): Promise<Buffer>` (module riêng, KHÔNG sửa `lib/server/print-engine.ts`/`lib/print-template.ts`) — gọi Gotenberg qua HTTP với buffer `.docx` đã render sẵn từ `renderPrintTemplate()`
- [ ] 3.2 Sửa `app/api/requests/[id]/export/route.ts` nhận thêm tham số định dạng (`format=docx|pdf`, mặc định `docx` để không đổi hành vi hiện có), gọi `convertDocxToPdf()` khi `format=pdf`
- [ ] 3.3 Thêm `format: "docx" | "pdf"` vào `PrintExportRecord` (`lib/types.ts`), ghi đúng giá trị khi lưu lịch sử xuất
- [ ] 3.4 Xử lý lỗi rõ ràng khi Gotenberg không phản hồi/timeout — trả lỗi tiếng Việt cho người dùng, KHÔNG ảnh hưởng nhánh xuất `.docx`

## 4. UI

- [ ] 4.1 Thêm lựa chọn định dạng (docx/pdf) vào menu "In theo mẫu" hiện có ở `components/request/RequestDetailView.tsx`

## 5. Test

- [ ] 5.1 Viết test cho `convertDocxToPdf()` với Gotenberg giả lập (mock HTTP) — thành công, lỗi mạng, timeout
- [ ] 5.2 Test xuất `.docx` hiện có vẫn xanh nguyên, không bị ảnh hưởng bởi thay đổi ở route export

## 6. Xác minh cuối

- [ ] 6.1 `npm run build && npm run test -- --run` xanh
- [ ] 6.2 Kiểm thử thật: xuất PDF 1 đề xuất thật có bảng chi tiết, so sánh bố cục với bản `.docx` cùng đề xuất — phải khớp nhau
- [ ] 6.3 Báo cáo kết quả với Sếp, KHÔNG tự ý deploy/push khi chưa được yêu cầu
