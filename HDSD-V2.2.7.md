# HDSD V2.2.7 — KIỂM TRA & SỬA TOÀN BỘ LỖI QUOTA LIÊN QUAN CHỮ KÝ

## Kết luận kiểm tra
V2.2.6 đã loại bản sao legacy `rampFullTestV17Data`, nhưng ảnh lỗi thực tế mới cho thấy một số máy vẫn đầy ở chính khóa chuẩn:

`sagsFlightSessionV1::<USER>:<session> exceeded the quota`

Điều này có nghĩa là trên các máy đã làm nhiều chuyến/chữ ký, tổng các session chuẩn vẫn có thể quá lớn.

## Vì sao 42.3 và 55.1 cùng lỗi?
Chúng dùng chung lớp ký của app. Chữ ký đang được tạo thành PNG trong suốt kích thước **1600 × 420** rồi đưa thẳng vào `state` dưới dạng `data:image/png;base64,...`.

Do đó lỗi không phải riêng form 42.3 hay 55.1. Bất kỳ biểu mẫu nào dùng cùng cơ chế ký đều có thể làm localStorage tăng mạnh.

## V2.2.7 sửa toàn lớp chữ ký
### Chữ ký mới
- Tự giảm payload từ **1600 × 420 → 640 × 168**.
- Giữ đúng tỷ lệ 80:21.
- Vẫn là PNG trong suốt.
- Không thay đổi vị trí/khung hiển thị chữ ký trên PDF.

### Chữ ký cũ trên máy
Khi khởi động, trước MY FLIGHT và trước XUẤT:
- quét các `sagsFlightSessionV1:*`;
- quét checkpoint V2.2;
- nhận diện đúng PNG chữ ký cũ 1600 × 420;
- resize về 640 × 168;
- ghi lại bản nhỏ hơn.

Không xóa chữ ký.

### An toàn dữ liệu
- Không `localStorage.clear()`.
- Không xóa các key không liên quan.
- Không xóa canonical session.
- Không xóa checkpoint là bản phục hồi duy nhất.
- V2.2.6 vẫn chịu trách nhiệm loại legacy duplicate và không che lỗi nếu canonical thật sự không ghi được.

## Luồng cần test
1. Máy đang lỗi quota → cập nhật V2.2.7.
2. Mở lại app và chờ vài giây để migration chạy.
3. Mở MY FLIGHT.
4. Test 42.3: ký → XUẤT.
5. Test 55.1: ký → XUẤT.
6. Test thêm một form có ký khác nếu có.
7. Quay lại MY FLIGHT khác để bảo đảm session không mất dữ liệu.

## Chẩn đoán
Console:
```js
await sagsV227StorageDiagnostics()
```

Quan trọng:
- `oldSignatureCount` nên về 0 sau migration;
- `migrationErrors` nên bằng 0;
- `v226.canonicalQuotaErrors` không tăng sau khi ký/xuất.

Có thể chủ động chạy:
```js
await sagsV227StorageRecovery()
```

## Deploy Termux
Giải nén ZIP, vào thư mục và chạy:
```bash
bash deploy-v2.2.7.sh
bash verify-v2.2.7.sh
```

Backup của script nằm ngoài repo tại:
`$HOME/E-REPORT-SAGS-BACKUPS/`

Không xóa dữ liệu website trước khi kiểm tra bản nháp chưa đồng bộ.
