# HƯỚNG DẪN API 6 MỐC THỜI GIAN CHO IT

Áp dụng từ E-REPORT SAGS **V1.1.108**.

## 1. Mục đích và nguyên tắc

API cho phép hệ thống IT đọc 6 mốc thời gian khai thác theo ngày mà không cần API key hoặc tài khoản đăng nhập. Dữ liệu được đọc trực tiếp từ Firebase Realtime Database REST để không cần triển khai Cloud Functions.

Chỉ nhánh `it_public` được đọc công khai. Dữ liệu tài khoản, biểu mẫu, FINAL, CROSSCHECK, nhật ký và các nhánh nghiệp vụ khác không được xuất qua URL này.

## 2. URL sử dụng

Mẫu URL:

```text
https://e-report-sags-default-rtdb.asia-southeast1.firebasedatabase.app/it_public/YYYY-MM-DD.json
```

Ví dụ:

```text
https://e-report-sags-default-rtdb.asia-southeast1.firebasedatabase.app/it_public/2026-08-30.json
```

Quy tắc:

- Phương thức: `GET`.
- Ngày phải theo `YYYY-MM-DD`.
- Phải giữ phần mở rộng `.json` ở cuối URL.
- Không gửi header `Authorization`.
- Không truyền `apiKey`, token hoặc mật khẩu.
- Chu kỳ đề nghị: một lần mỗi 120 giây.

### Thiết lập miễn phí một lần

Trước lần sử dụng đầu tiên, tài khoản quản trị Firebase thực hiện:

1. Mở Firebase Console và chọn project `e-report-sags`.
2. Vào **Build → Realtime Database → Rules**.
3. Đối chiếu nội dung với file `database.rules.json` trong gói phát hành.
4. Bảo đảm root vẫn là `".read": false`, `".write": false`.
5. Bảo đảm riêng `it_public` có `".read": true` và `".write": "auth != null"`.
6. Bấm **Publish**.

Thao tác này không cần Cloud Functions, không cần nâng cấp Blaze và không cần tạo `GCP_SA_KEY`.

## 3. Cấu trúc dữ liệu trả về

Khóa cấp ngoài là mã cặp chuyến. Mỗi cặp chuyến chỉ chứa đúng 6 trường:

| Trường | Ý nghĩa |
| --- | --- |
| `CHOCK_ON` | Giờ chèn bánh/chock on |
| `BOARDING_CALL` | Giờ bắt đầu gọi khách lên tàu |
| `BOARDING_FINISH` | Giờ hoàn tất boarding; chỉ lấy nguồn `h17Finish` hoặc `f421_h17Finish` |
| `DOOR_CLOSE` | Giờ đóng cửa tàu bay |
| `CHOCK_OFF` | Giờ rút chèn/chock off |
| `PUSHBACK` | Giờ pushback |

Ví dụ phản hồi:

```json
{
  "VN1351_VN1350": {
    "CHOCK_ON": "10:01",
    "BOARDING_CALL": "10:20",
    "BOARDING_FINISH": "10:40",
    "DOOR_CLOSE": "10:45",
    "CHOCK_OFF": "10:49",
    "PUSHBACK": "10:50"
  }
}
```

Trường chưa có dữ liệu được trả dưới dạng chuỗi rỗng `""`. Các giá trị nguồn `N/A`, `NA`, `NIL` hoặc `-` cũng được chuẩn hóa thành chuỗi rỗng. Không tự suy đoán hoặc tính thay giờ còn thiếu.

Nếu ngày chưa có dữ liệu, Firebase trả về:

```json
null
```

Phía IT phải coi `null` là “chưa có dữ liệu”, không phải lỗi hệ thống.

## 4. Ví dụ tích hợp

### cURL

```bash
curl --fail --silent --show-error \
  "https://e-report-sags-default-rtdb.asia-southeast1.firebasedatabase.app/it_public/2026-08-30.json"
```

### JavaScript

```javascript
const date = "2026-08-30";
const url = `https://e-report-sags-default-rtdb.asia-southeast1.firebasedatabase.app/it_public/${date}.json`;
const response = await fetch(url, {method: "GET", cache: "no-store"});
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const flights = (await response.json()) || {};
for (const [flightPair, times] of Object.entries(flights)) {
  console.log(flightPair, times.CHOCK_ON, times.PUSHBACK);
}
```

### C#

```csharp
using var client = new HttpClient();
var date = "2026-08-30";
var url = $"https://e-report-sags-default-rtdb.asia-southeast1.firebasedatabase.app/it_public/{date}.json";
var json = await client.GetStringAsync(url);
```

## 5. Quy trình lấy dữ liệu mỗi 2 phút

1. Tính ngày khai thác theo múi giờ Việt Nam.
2. Tạo URL bằng ngày `YYYY-MM-DD`.
3. Gửi một yêu cầu `GET`.
4. Nếu HTTP 200 và nội dung là `null`, lưu trạng thái chưa có dữ liệu.
5. Nếu HTTP 200 và có object, cập nhật theo khóa cặp chuyến.
6. Không xóa dữ liệu đang có chỉ vì một trường mới trả về chuỗi rỗng, trừ khi quy trình IT chủ động chọn đồng bộ thay thế toàn bộ.
7. Chờ 120 giây rồi gọi lại.

Không gọi liên tục theo từng giây. Hạn mức miễn phí không phải không giới hạn; cần giữ đúng chu kỳ 2 phút và chỉ lấy đúng ngày cần sử dụng.

## 6. Kiểm tra nhanh sau khi phát hành

1. Đăng nhập E-REPORT SAGS bằng tài khoản hợp lệ.
2. Mở hoặc cập nhật một chuyến của ngày cần kiểm tra.
3. Nhập/lưu một mốc thời gian.
4. Chờ quá trình đồng bộ hoàn tất.
5. Mở URL của ngày bằng trình duyệt.
6. Kiểm tra đúng mã cặp chuyến và đúng 6 trường.
7. Kiểm tra `BOARDING_FINISH` không lấy nhầm giờ `h18Start/f421_h18Start`.

## 7. Xử lý sự cố

| Hiện tượng | Kiểm tra |
| --- | --- |
| Phản hồi `null` | Ngày chưa có dữ liệu hoặc chưa có tài khoản đăng nhập thực hiện đồng bộ |
| Không thấy chuyến vừa tạo | Mở lại chuyến, lưu dữ liệu và kiểm tra kết nối Firebase của ứng dụng |
| Một mốc là chuỗi rỗng | Nguồn chưa nhập mốc đó; không tự suy đoán |
| HTTP 401/403 | Kiểm tra `database.rules.json` đã được triển khai và `it_public/.read` đang là `true` |
| Có cặp chuyến hậu tố `_2/_3` | Chạy lại đồng bộ ngày từ tài khoản AD để chuẩn hóa/gộp bản ghi |
| Dữ liệu cũ sau bản vá | Người dùng cần bấm **CẬP NHẬT** trên thông báo phiên bản mới trước khi nhập tiếp |

## 8. Quyền và bảo mật

Rule bắt buộc:

```json
"it_public": {
  ".read": true,
  ".write": "auth != null"
}
```

IT chỉ có quyền đọc. Việc ghi dữ liệu vẫn yêu cầu người dùng đã đăng nhập E-REPORT SAGS. Không mở `.read: true` ở cấp root và không đưa thêm trường nghiệp vụ vào `it_public`.
