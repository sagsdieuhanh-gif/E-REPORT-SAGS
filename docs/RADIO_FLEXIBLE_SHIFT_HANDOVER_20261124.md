# E-REPORT-SAGS: bắt buộc chọn ca khi nhận bộ đàm (24/11/2026)

## 1. Mốc giờ nhận máy đã chốt

- **Ca sáng (mốc giờ nhận): 08:00–18:30**, bao gồm đúng 08:00 và 18:30.
- **Ca tối (mốc giờ nhận): 18:31–07:59 ngày hôm sau**, bao gồm đúng 18:31 và 07:59.
- Mốc **giờ nhận** không thay đổi quy định **thời gian làm việc / giờ kết thúc ca** đã chốt trước: sáng 08:30–19:00 (quá hạn từ 19:01), tối 19:01–08:29 ngày sau (quá hạn từ 08:30).
- Khi bắt đầu **ISSUE (Nhận máy)** ô “Ca nhận bộ đàm (bắt buộc)” luôn **trống**, không có giá trị được gợi ý hay tự chọn. Phải chọn AM hoặc PM mới được ký/lưu. Ứng dụng không tự ép phân loại theo đồng hồ: ca tối nhận máy sớm lúc 17:30/18:15 vẫn có thể được chọn PM.
- Giờ ký nhận thực tế và ảnh là chứng cứ nguyên bản; Firestore dùng `serverTimestamp()` và không điều chỉnh theo ca.
- Thông tin phân ca được ghi vào trường `shift` sẵn có trong `sags_radio_events_v1` và `sags_radio_devices_v1` (các Rules hiện tại đã chấp nhận AM/PM).
- Khi RETURN hoặc SWAP_OUT, giữ `shift` của máy đang giữ; khi SWAP_IN (đổi máy), máy mới kế thừa ca đã xác nhận.
- Ảnh và bản nháp iOS/Android lưu/khôi phục đúng ca đã chọn.

## 2. Cảnh báo chưa trả / quá hạn

**18:15 PM** → hạn trả theo ca tối lúc **08:30 hôm sau**. Không báo quá ca sáng lúc 19:00 hoặc 19:01.

**18:15 AM** → hạn trả theo ca sáng lúc **19:01 cùng ngày**. Tại 19:00 vẫn trong hạn, sau 19:01 có thể cảnh báo.

Tính hạn theo ca đã được xác nhận, không tính theo thời điểm ký. Điều chỉnh ở bảng giám sát AD, phần Tổng hợp, MY FLIGHT, nhắc trả trên giao diện và PDF. Cảnh báo chỉ để đối soát, không tự khóa chức năng nhận chuyến hay cách ly máy báo lỗi.

## 3. Báo cáo

- Báo cáo một ca truy vấn đủ khoảng giờ ký thực tế rồi **lọc theo ca đã xác nhận**; ca tối ký lúc 17:30 vẫn vào báo cáo ca tối.
- Báo cáo từ 7 ngày đến 31 ngày truy vấn bao cả trước 08:30 ngày đầu, và phân loại theo **ngày ca đã xác nhận**; không gom nhầm lượt trả ca tối sau nửa đêm vào ca sáng.
- Giữ nguyên bằng chứng ký và thời gian máy chủ; không sửa dữ liệu lịch sử.

## 4. Dữ liệu cũ

Các bản ghi trước lần sửa có thể đã mang AM/PM được gán theo đồng hồ, kể cả nhân viên tối nhận lúc 17:30. **Không được âm thầm đổi dữ liệu cũ** vì không thể chứng minh ca thực tế từ giờ ký. Khi điều tra, AD so sánh roster và ảnh ký; nếu phải sửa lịch sử sẽ cần cơ chế điều chỉnh có nhật ký và quyền phù hợp, không ghi đè bản gốc.

## 5. Kiểm thử

Trên PC và iOS/Android:
- 08:00 → mốc nhận sáng; 18:30 → sáng; 18:31 → tối; 07:59 → tối hôm trước; 08:00 ngày mới → sáng.
- Mở ký nhận lúc **10:00**, **17:30** và **20:00** đều để trống ca, chưa chọn thì không cho ký.
- 17:30 chọn **PM** → không có cảnh báo sáng, báo cáo PM và PDF ghi đúng ca.
- 18:15 chọn **AM** → cảnh báo sau 19:01 nếu chưa trả.
- Trả máy/đổi máy giữ đúng ca đã nhận; tải lại bản nháp iOS không mất lựa chọn.
- Mất mạng không báo giao dịch thành công; không đụng Firestore Security Rules production.
