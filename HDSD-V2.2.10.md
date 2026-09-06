# HDSD V2.2.10 — DEP ĐỘC LẬP NHƯNG VẪN 1 CHUYẾN = 1 WORKSPACE

## Nguyên tắc kiến trúc KHÔNG thay đổi
Một chuyến bay vẫn chỉ có **01 flight record/workspace chung**:

```text
flight_records/{ngày}/{flightId}
├── forms/
│   └── {formGroup}/
│       ├── activeDepInstance
│       └── instances/
├── taskClaims/
├── taskStatus/
├── workPartHistory/
├── KẾT SỔ / FINAL / CROSSCHECK / cảnh báo...
└── dữ liệu chung của chuyến
```

V2.2.10 **không tạo flight record thứ hai**.

ARR và DEP chỉ là các **form instance / work part riêng** trong cùng workspace.

## Luồng mới

### Trường hợp 1 — ARR đã HOÀN TẤT
Giữ nguyên V2.2.2:
- DEP được READY sau ARR hoàn tất.
- Khi mở DEP vẫn theo luồng handover hiện có.
- Có thể TIẾP TỤC TỜ HIỆN TẠI / TẠO TỜ DEP MỚI theo cơ chế cũ.

### Trường hợp 2 — ARR chưa NHẬN / chưa HOÀN TẤT
Người đã được phân DEP:
1. MY FLIGHT tự đánh dấu DEP có thể nhận.
2. Bấm NHẬN CHUYẾN.
3. Hệ thống không chờ ARR.
4. Tự tạo **DEP ĐỘC LẬP**.
5. DEP được CLAIMED / IN_PROGRESS.
6. Mở trực tiếp form DEP.

Không cần A bấm HOÀN TẤT.

### Trường hợp 3 — không tìm thấy ARR predecessor hợp lệ
DEP cũng được mở theo **DEP ĐỘC LẬP**.

## Tờ DEP độc lập ghi gì?
Chỉ tạo baseline chuyến đi:

- Ngày
- Số hiệu chuyến DEP
- STD
- ETD nếu nguồn có
- A/C Reg
- A/C Type
- Điểm đến sau CXR
- Bay/Gate/parking DEP phù hợp với biểu mẫu

Không tự điền:

- Flight ARR
- STA
- ETA ARR
- route ARR
- bay ARR
- CHOCK ON
- Door Open
- giờ phục vụ ARR
- chữ ký ARR
- checklist/dữ liệu khai thác ARR

Với các form 42.3 / 42.1 / 55.1 / 09, V2.2.10 dùng đúng key DEP tương ứng.

## Nếu A hoàn tất ARR SAU KHI B đã làm DEP
V2.2.2 cũ có thể phát tín hiệu handover READY khi ARR hoàn tất.

V2.2.10 bảo vệ DEP độc lập:
- DEP vẫn CLAIMED / IN_PROGRESS.
- Không đổi về UNCLAIMED / READY.
- Không hydrate/copy ARR vào DEP.
- Handover ARR muộn không ghi đè working envelope DEP.
- Tờ ARR của A vẫn giữ nguyên riêng.

## Khóa chống hai người cùng làm DEP
Vẫn giữ:
- `roster_co_claims` transaction nếu có co-assignee group.
- `activeDepInstance` transaction theo cùng flight/form.
- Chỉ 01 active DEP instance cho đúng flight/form.

## Dữ liệu các bộ phận khác
Vẫn vào cùng `flight_records/{date}/{flightId}` nên:
- KẾT SỔ PVHK
- FINAL CBTT
- CROSSCHECK
- A/C LIMITS
- các cảnh báo và dữ liệu chung

vẫn dùng cùng hồ sơ chuyến.

## Không thay đổi trong bản này
- FINAL
- CROSSCHECK
- KẾT SỔ
- PDF/XUẤT của V2.2.9
- chữ ký/storage V2.2.7
- Firebase account/reset password
- không heartbeat

## Test bắt buộc
### Test A — người trước không nhận
1. A = ARR, không bấm NHẬN.
2. B = DEP.
3. B mở MY FLIGHT.
4. DEP phải có thể NHẬN.
5. B bấm NHẬN.
6. Form mở ngay và chỉ có dữ liệu chuyến đi.

### Test B — A nhận nhưng chưa hoàn tất
1. A đang làm ARR.
2. B bấm NHẬN DEP.
3. B vẫn mở được DEP độc lập.
4. Dữ liệu A không bị sửa.

### Test C — A hoàn tất sau
1. B đang làm DEP độc lập.
2. A bấm HOÀN TẤT ARR.
3. DEP B vẫn phải là ĐANG LÀM.
4. Form DEP không được xuất hiện dữ liệu ARR.

### Test D — ARR hoàn tất trước
1. A hoàn tất ARR.
2. B nhận DEP.
3. Phải giữ luồng V2.2.2 bình thường.

## Chẩn đoán
Console:

```js
await sagsV2210DepDiagnostics()
```

Kiểm tra:
- `oneFlightOneWorkspace = true`
- `workspacePath = flight_records/{date}/{flightId}`
- `independentDep = true` khi dùng luồng độc lập
- `departureOnly = true`
