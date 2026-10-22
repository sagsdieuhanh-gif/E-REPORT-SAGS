# TVJ-GOF-035 · Phân vùng Nhập nhanh chính xác hơn — V2.5.31 (22/10/2026)

## Cơ sở
Đối chiếu ba ảnh chụp phần trên, giữa, dưới của mẫu giấy **TVJ-GOF-035 RAMP CHECKLIST REPORT FORM** do người dùng cung cấp với danh sách 128 trường trong `forms/forms.registry.json`.

Phân vùng của V2.5.30 chưa phù hợp vì dùng các ngưỡng x/y để suy đoán khu vực. **V2.5.31 bỏ việc đoán khu theo tọa độ, chuyển sang danh sách `key` tường minh cho từng khung lớn in trên giấy.** Các ô con (Final Cargo, NOTOC, nhiều dòng Checked/Time...) là thành phần của **cùng khung lớn** và không được báo kết thúc khu sớm.

## Các khu đã đối chiếu trực tiếp trên hình

| Số khu | Khung chính | Trường thuộc khu |
|---:|---|---:|
| 1 | Thông tin chuyến (đầu trang) | 15 |
| 2 | Arrival Flight | 8 |
| 3 | Departure Flight, gồm Final Cargo và NOTOC | 8 |
| 4 | Baggage Unloading | 7 |
| 5 | Baggage Loading | 7 |
| 6 | Cargo Unloading | 7 |
| 7 | Cargo Loading | 8 |
| 8 | Equipment / Manpower: 3 dòng × Total và Time | **6** |
| 9 | Final Figure – Passenger and Baggage | 11 |
| 10 | Irregularities / Delay / Damage Report | 1 |
| 11 | OFFLOADED – Passenger and/or Baggage | 8 |
| 12 | A/C Compartment Visual Inspection | 18 |
| 13 | LIR / Ground Services | 20 |
| | **Tổng trường trong 13 khu đã đối chiếu (1 header + 12 nghiệp vụ)** | **124** |

### Trường cần xác nhận riêng (4 trường)

- `fodInspectionChecked`, `fodInspectionTime`: hai trường xuất hiện trong registry gần Equipment nhưng **ảnh mẫu chỉ thấy 3 dòng Equipment/Manpower; không có dòng FOD tương ứng**. Do đó không được gán chúng vào Equipment như V2.5.30.
- `Name`, `STAFF_ID`: phần dưới bên phải trang mẫu bị che; **không xác nhận được đường viền khung bao của chúng**. Không được coi chúng là một khung chữ nhật đã chứng minh.

Cả bốn trường được giữ đầy đủ trong mục riêng **“⚠ CẦN ĐỐI CHIẾU · FOD / NAME / STAFF ID”**. Mục này **không được tính là khu nghiệp vụ chính**; không cắt khung chính, không mất dữ liệu. Trường thêm sau này mà chưa có trong sơ đồ cũng sẽ vào đây để tránh bị mất/đoán vị trí.

## Quy tắc vận hành
- Có 13 khu đã đối chiếu, thêm một mục chờ đối chiếu.
- Nút Khu trước / Chọn khu / Khu tiếp và phím Next di chuyển qua **toàn bộ trường trong khung hiện tại**. Chỉ qua khung khác sau ô cuối; checkbox cũng được tính trong thứ tự duyệt.
- Phím Next của ô tùy chọn trống vẫn có thể điền `/` theo quy tắc TVJ trước đó; `NIL` tiếp tục riêng TVJ. Không thay cách lưu dữ liệu, chữ ký, PDF, tài khoản hay biểu mẫu hãng khác.
- Thứ tự trong mỗi khu là danh sách trường tường minh, có thể kiểm toán; không suy từ ngưỡng tọa độ.

## Cách xác nhận sau triển khai
Kiểm tra trực tiếp trong một hồ sơ TVJ được phép thao tác (tốt nhất chuyến dữ liệu thử): điều hướng từ Arrival → Departure (Final Cargo + NOTOC + Flight Crew) → Baggage → Cargo → Equipment (6 ô) → Final Figure → Irregularities → Offloaded → Inspection (18 ô) → LIR (20 ô). Cuối cùng mở mục ⚠ chờ đối chiếu 4 trường. Đảm bảo không còn thông báo hết khu khi vẫn còn ô trong khung và không thay đổi dữ liệu khi chỉ chuyển khu.

### Giới hạn
Phân khu mới có kiểm thử đối chiếu registry và hình giấy, nhưng chưa phải kết quả nghiệm thu bằng bàn phím Next trên một chuyến TVJ đang sử dụng thực tế. Cần kiểm tra trực quan trên cả PC và mobile; khi có ảnh không che cuối trang hoặc bản PDF gốc rõ toàn bộ khung, có thể chuyển Name/Staff ID từ mục chờ đối chiếu về vị trí được xác nhận.
