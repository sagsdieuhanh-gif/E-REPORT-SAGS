# HƯỚNG DẪN TRIỂN KHAI DỰ PHÒNG FIREBASE → SUPABASE

**Ngày:** 17/11/2026 · **Trạng thái:** nền tảng sao lưu đã tạo, **CHƯA CÓ DỮ LIỆU THẬT / CHƯA THỂ FAILOVER**.

## Đã triển khai trên Supabase

- Dự án: `E-REPORT-SAGS-SUPABASE`, ref `wggirxzdcfnxyjgjvpgh`, khu vực Singapore, đã khôi phục `ACTIVE_HEALTHY`.
- Các bảng **server-only**, có RLS và không có quyền đọc/ghi dành cho `anon` hay `authenticated`:
  - `public.sags_standby_mirror_v1` — dữ liệu Firebase đã chuẩn hóa, SHA-256 từng bản ghi, cờ xóa/tombstone.
  - `public.sags_standby_batches_v1` — nhật ký phiên sao lưu, trạng thái `RUNNING/COMPLETE/FAILED`.
  - `public.sags_standby_checkpoints_v1` — mốc đồng bộ hoàn thành theo từng namespace.
  - `public.sags_standby_failover_v1` — khóa cutover, **primary_provider=firebase**, **standby_writes_allowed=false**, **failover_tested=false**.
  - `public.sags_standby_pending_ops_v1` — nhật ký cho giao dịch dự phòng trong tương lai, chưa hoạt động.
  - `public.sags_standby_identity_v1` — ánh xạ Firebase UID với tài khoản Supabase Auth độc lập, hiện chưa tạo tài khoản/mapping.
- Bucket `sags-standby-evidence`: **private**, tối đa 20 MiB/file; không cấp quyền đọc/ghi cho trình duyệt/nhân viên. Chỉ worker máy chủ có thể lưu bằng chứng.
- Đã đối chiếu các quyền, không cấp khóa Supabase service-role cho website.

## Mã nguồn

- `firebase/functions/standby-core.cjs`: chuẩn hóa RTDB/Firestore và bằng chứng ảnh theo hash, kiểm tra dữ liệu.
- `firebase/functions/standby-replicate.cjs`: chương trình đọc Firebase và ghi Supabase, kiểm tra quyền, kiểm tra checksum, lưu dấu xóa. Có `--dry-run` và `--apply`.
- `.github/workflows/supabase-standby-mirror.yml`: lịch tối đa 1 lần/giờ **chỉ khi bật biến** `SAGS_STANDBY_REPLICATION_ACTIVE=true`; manual dry-run mặc định không ghi dữ liệu.
- `tests/standby-core.test.cjs`: kiểm thử hash ổn định, metadata ảnh, quyền kích hoạt, không giả lập thành công khi thiếu khóa.

## Điều kiện bắt buộc để bắt đầu sao lưu dữ liệu thật

Không gửi khóa dịch vụ qua chat và **không commit** file JSON tài khoản dịch vụ vào GitHub.

1. Firebase project `e-report-sags`: tạo danh tính dịch vụ chuyên dụng cho sao lưu **chỉ đọc**, giới hạn quyền đọc dữ liệu RTDB và Firestore theo IAM + bảo mật thích hợp; kiểm tra lại bằng lệnh dry-run. Ưu tiên **Workload Identity Federation (WIF)**, hạn chế tạo khóa JSON dài hạn. Không dùng tài khoản quản trị của nhân viên.
2. Supabase Dashboard → Project Settings/API Keys: lấy **secret/service_role key** bằng giao diện dự án; đặt ở GitHub repository → Settings → Secrets and variables → Actions → Repository secrets với tên chính xác `SAGS_STANDBY_SUPABASE_SERVICE_ROLE_KEY`. Không được dùng publishable key.
3. Kết nối Firebase theo **một trong hai** cách:
   - **WIF**: GitHub Actions Variables `SAGS_STANDBY_FIREBASE_WIF_PROVIDER` (đúng tên đầy đủ resource provider) và `SAGS_STANDBY_FIREBASE_SA_EMAIL` (email của tài khoản dịch vụ chỉ đọc); cấu hình WIF của Google Cloud để chỉ tin cậy repository GitHub cụ thể.
   - **JSON dự phòng**: GitHub Actions Secret `SAGS_STANDBY_FIREBASE_SERVICE_ACCOUNT_JSON` chứa nội dung khóa JSON của tài khoản dịch vụ hạn chế quyền. Bảo vệ/luân phiên khóa theo quy định.
4. GitHub Actions → **Supabase standby snapshot replication (guarded)** → Run workflow với `dry_run=true` trước. Kết quả phải cho thấy đầy đủ namespace đã đọc, không có `permission-denied`, và không vượt giới hạn `SAGS_STANDBY_MAX_ITEMS=1500` / `SAGS_STANDBY_MAX_NAMESPACE_BYTES=31457280`.
5. Khi dry-run thành công, chạy thủ công với `dry_run=false`; kiểm tra bảng `sags_standby_batches_v1` có **COMPLETE**, 15/15 namespace được sao chép, checksum hợp lệ và Storage ảnh có tệp khi Firebase có bằng chứng.
6. Chỉ sau khi giám sát thực tế vài kỳ liên tiếp mới đặt GitHub Actions Variable `SAGS_STANDBY_REPLICATION_ACTIVE=true`. Nếu thiếu bất kỳ điều kiện nào, để trống/false.
7. **Chưa bật chế độ chạy nghiệp vụ trên Supabase**: cần Supabase Auth độc lập, nhân viên có thể đăng nhập khi Firebase Auth sập, bản dịch nghiệp vụ RTDB đầy đủ, quy tắc giao nhận và cấp quyền được kiểm thử, một write leader/fencing epoch và quy trình failback.

## Giới hạn của bản sao nền tảng

- Đây là **snapshot theo giờ, không phải hot standby**. GitHub Actions schedule có thể đến muộn; RPO đo bằng thời điểm checkpoint `COMPLETE` gần nhất.
- Worker có danh sách giới hạn **11 nhánh RTDB** và **4 collection Firestore**. Những nhánh/collection khác cần được kiểm kê và thêm bằng kiểm thử trước khi kết luận dữ liệu đã đầy đủ. Các nhánh hiện biết nằm dưới `sags_live_v470`.
- Worker tự từ chối khi số lượng/dung lượng namespace vượt ngưỡng. Không tự xóa bằng chứng hoặc ghi đè lịch sử gốc khi Firebase đọc lỗi.
- Ảnh được lưu riêng trong private Storage theo SHA-256; bản mirror lưu tham chiếu và checksum. Việc chuyển ngược về Firebase để phục hồi phải khôi phục bytes trước khi ghi.
- Đã chuẩn bị bảng ánh xạ identity an toàn nhưng chưa tạo bất kỳ Supabase Auth account nào. Chưa sao lưu cấu hình Firebase Auth và mật khẩu; không sao chép mật khẩu bằng giả định. Cần mời/tạo tài khoản Supabase Auth riêng và ánh xạ quyền chuẩn.
- Gói Supabase Free có thể tự tạm dừng. Hệ thống dự phòng 24/7 cần kế hoạch sử dụng trả phí phù hợp sau khi người quản trị chấp thuận.
- Không chuyển `primary_provider` sang `supabase` hoặc mở `standby_writes_allowed` trước khi kiểm thử chuyển đổi/failback thực tế thành công.

## Xác minh SQL (chạy bằng SQL Editor của Supabase)

```sql
select (select count(*) from public.sags_standby_mirror_v1) as records,
       (select count(*) from public.sags_standby_batches_v1 where state='COMPLETE') as completed_backups,
       (select count(*) from public.sags_standby_pending_ops_v1) as pending_operations,
       (select primary_provider from public.sags_standby_failover_v1 where id='production') as primary_provider,
       (select standby_writes_allowed from public.sags_standby_failover_v1 where id='production') as standby_writes_allowed,
       (select public from storage.buckets where id='sags-standby-evidence') as bucket_is_public;
```

Sau một lần đồng bộ thật, cần so sánh số lượng, khóa định danh, hash từng nguồn và độ mở được của ảnh trên Firebase với Supabase. Không được coi `COMPLETED` nếu bất kỳ nguồn nào bị bỏ sót.

**Điều kiện xác nhận hoàn thành triển khai thực tế:** dữ liệu Firebase có trên Supabase, tài khoản dự phòng được kích hoạt, nhập/chuyển/hoàn tất nghiệp vụ trên cả PC và iOS/Android khi Firebase bị giả lập ngắt, toàn bộ ký nhận/lịch sử không trùng và sau phục hồi có thể đồng bộ về chính mà không mất dữ liệu. Hiện vẫn **CHƯA đạt điều kiện**.
