# E-REPORT SAGS · Quản lý ký nhận bộ đàm

Implementation staging branch: feature/radio-checkout-audit-mail-v1, NOT yet production.

## Nghiệp vụ
- Mã ban đầu: DH01..DH11 và TBDH02 (12 máy). AD khởi tạo một lần, nếu đã tồn tại thì không ghi đè.
- Nhận máy: đăng nhập E-REPORT, kiểm tra trạng thái READY, chọn ca, pin và ký bằng tay; Firebase ghi UID, tên, chữ ký và giờ máy chủ. Chặn nhận trùng bằng Firestore transaction.
- Trả máy: chủ máy hoặc AD trả; pin yếu chuyển CHARGING, máy đủ dùng chuyển READY.
- Đổi máy: ký một lần cho hai sự kiện liên kết SWAP_OUT/SWAP_IN, giao dịch nguyên tử; máy cũ chuyển CHARGING hoặc FAULT; máy mới phải READY.
- Báo lỗi: chọn từ 11 lý do chuẩn, yêu cầu mô tả cho OTHER và LOST; máy lỗi không còn ở danh sách cho nhận.
- AD giải phóng máy sau bảo dưỡng/sạc và mô tả kiểm tra ít nhất 10 ký tự.
- Bảng trạng thái, 120 sự kiện gần nhất (UI), xuất CSV; lịch sử server append-only, cấm nhân viên xóa/sửa.
- Mẫu phiếu giấy không được tự động OCR hoặc coi người ký tay trên ảnh là nhân viên đăng nhập. Bản giấy là chứng cứ tham khảo.
- Không cho nhận/trả khi ngoại tuyến, vì có thể dẫn đến một máy được cấp cho hai người.

## Email
- Báo cáo ngày 07:05 Asia/Ho_Chi_Minh tổng kết hôm qua.
- Báo cáo tuần thứ Hai 07:15 tổng kết thứ Hai đến Chủ nhật tuần trước.
- Ba địa chỉ: HUNGHT-CXR@SAGS.VN, XUANDT-CXR@SAGS.VN, MANAGERONDUTY-CXR@SAGS.VN.
- Nội dung: tổng máy, tình trạng hiện tại, số nhận/trả/đổi, lỗi phát sinh, chưa trả quá 12h, lỗi lặp lại; CSV đầy đủ tất cả sự kiện trong kỳ (không chứa chữ ký).
- Chỉ GitHub Actions + Firebase Admin + SMTP server gửi email. Browser KHÔNG có khả năng gửi.
- Sổ gửi mail Firestore sags_radio_mail_runs_v1 đánh dấu CLAIMED/SENT/FAILED. Nếu SMTP đã gửi mà Firebase chưa lưu trạng thái SENT, lần thử sau có thể gửi trùng; không thể bảo đảm exactly-once với SMTP.

## Chưa được bật (cần quyền Admin)
1. Kiểm thử Security Rules trên Firebase Rules Emulator; triển khai thay đổi firebase/firestore.rules bằng Firebase CLI cho project e-report-sags.
2. Cài đặt Firebase Admin credentials vào GitHub Actions bằng WIF hoặc FIREBASE_SERVICE_ACCOUNT_JSON; không đưa secret vào mã nguồn, không gửi secret trong chat.
3. Cài đặt SAGS_SMTP_HOST / SAGS_SMTP_USER / SAGS_SMTP_PASSWORD (secrets) và SAGS_SMTP_FROM / SAGS_SMTP_PORT (variables).
4. Kiểm tra tên miền gmail/sags.vn cho phép SMTP gửi đến cả ba mailbox.
5. Kết nối app/modules/radio-custody.v1.js vào E-REPORT main menu và app/styles/radio-custody.v1.css; cập nhật bản release asset-manifest.json + PWA.
6. Chạy dry-run, gửi 1 lần thử với sự chấp thuận của AD rồi đối chiếu nhật ký, hộp thư; chỉ sau đó bật lịch tự động.
7. Không áp chính sách xóa dữ liệu chuyến bay 24/48 giờ vào nhật ký bộ đàm. Đề xuất lưu audit 12–24 tháng theo quy định đơn vị.

**Tình trạng hiện tại:** đã có mã nguồn prototype và rules đề xuất trên nhánh độc lập. Chưa deploy Firebase rules, chưa cài SMTP, chưa có email tự động nào được gửi. Không thay đổi dữ liệu Production hiện hữu.
