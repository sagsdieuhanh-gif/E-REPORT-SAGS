# HDSD V2.2.6 — SỬA DỨT ĐIỂM KÝ TÊN → KHÔNG XUẤT PDF

## Kết quả kiểm tra lại
Lỗi cũ đúng là lỗi `localStorage quota`, nhưng V2.2.5 mới sửa được **một phần**.

Luồng thực tế của app:

1. Người dùng ký tên.
2. Chữ ký được chuyển thành PNG (`data:image/png;base64,...`).
3. `saveSignature()` gọi `persist()` **ngay lập tức**.
4. `persist()` ghi full envelope vào session chuẩn `sagsFlightSessionV1:*`.
5. Sau đó `persist()` lại ghi full `state` vào khóa legacy `rampFullTestV17Data::*`.
6. Nếu trình duyệt gần đầy, chính bản sao thứ hai này báo `QuotaExceededError`.
7. Lỗi xảy ra **trước khi người dùng mở XUẤT**, nên guard `exportDepth` của V2.2.5 không bắt được.

Đây khớp với lỗi lịch sử đã thấy:
`Setting the value of 'rampFullTestV17Data::USER_...' exceeded the quota`.

## V2.2.6 sửa thế nào?
- `sagsFlightSessionV1:*` vẫn là dữ liệu chuẩn và bắt buộc phải lưu.
- Nếu canonical session đã tồn tại, **không lưu thêm full state vào `rampFullTestV17Data`**.
- Trước khi ghi canonical session, hệ thống dọn bản legacy dư để nhường dung lượng cho chữ ký.
- Checkpoint V2.2 cũ có full envelope chỉ được compact khi đã xác nhận canonical session tương ứng còn tồn tại.
- Không xóa toàn bộ localStorage.
- Không xóa checkpoint nếu đó là bản phục hồi duy nhất.
- Nếu canonical session vẫn thật sự đầy quota sau cleanup thì hệ thống vẫn báo lỗi; không che lỗi autosave.
- Giữ nguyên fix V2.2.5: pre-export flush + không reload lại cùng session ngay trước xuất.
- Giữ V2.2.2 ARR→DEP production.

## Test bắt buộc
1. Cập nhật tới V2.2.6.
2. Mở F/SAGS có dữ liệu.
3. Ký tên.
4. Bấm XUẤT ngay.
5. Không được báo quota.
6. PDF phải có chữ ký.
7. Quay lại form: dữ liệu/chữ ký vẫn còn.
8. Mở MY FLIGHT khác để xác nhận local session vẫn hoạt động.

## Chẩn đoán
Trong Console:
```js
sagsV226StorageDiagnostics()
```

Sau khi ký, bình thường:
- `legacyCount` nên là 0 khi đang có canonical session;
- `canonicalQuotaErrors` phải bằng 0.

## Cập nhật
Khuyến nghị dùng Termux:
```bash
bash deploy-v2.2.6.sh
bash verify-v2.2.6.sh
```

Không xóa dữ liệu website trước khi xác nhận các bản nháp đã đồng bộ.
