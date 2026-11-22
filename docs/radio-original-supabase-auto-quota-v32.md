# Kho ảnh gốc bộ đàm Supabase — V2.2 (22/11/2026)

## Mục tiêu và ranh giới

Đây là phần nâng cấp **ảnh rõ** của chức năng ký nhận bộ đàm, **không phải** chuyển cơ sở dữ liệu chính từ Firebase sang Supabase. Giao dịch Firestore được xác nhận và lưu ảnh/chữ ký chứng cứ theo logic hiện hành, sau đó ảnh màu gốc/ảnh JPEG độ phân giải cao được chuyển riêng sang Supabase. Định danh gắn cứng với `sags_radio_events_v1/{eventId}`.

Không thay đổi quyền nhận/trả, quy tắc máy lỗi vẫn dùng, giới hạn mỗi người giữ một máy, hoặc các biểu mẫu nghiệp vụ.

## Tài nguyên đã triển khai

- Supabase project `E-REPORT-SAGS-SUPABASE`, id `wggirxzdcfnxyjgjvpgh`.
- **Bucket** `sags-radio-originals-v1`: riêng tư, JPEG, tối đa 8 MiB/ảnh; không có chính sách Storage cho trình duyệt hoặc anonymous; không dùng chung bucket `sags-standby-evidence`.
- **Bảng** `public.sags_radio_photo_ledger_v1`: một ảnh cho mỗi event Firebase, lưu ngày ký theo Việt Nam, SHA-256, UID, trạng thái `LIVE`/`PURGED`, thời điểm/xuất xứ xóa. Hàng bị dọn **không xóa khỏi nhật ký**.
- **Bảng** `public.sags_radio_photo_cleanup_audit_v1`: chi tiết sự kiện tự dọn.
- **Khóa** `public.sags_radio_photo_quota_lock_v1`: chỉ một thao tác tải lên/dọn dung lượng tại một thời điểm.
- **RPC** `sags_radio_photo_usage_v1()`, `sags_radio_photo_lock_acquire_v1(uuid)`, `sags_radio_photo_lock_release_v1(uuid)` chỉ dành cho tài khoản máy chủ.
- **Edge Function** `sags-radio-photo-v1`: `GET` ảnh và `POST` ảnh qua Firebase Auth đã xác thực, không công khai ảnh; gọi Firestore REST bằng Firebase user ID token để Firestore Rules xác nhận quyền xem hoặc chủ sự kiện trước khi thao tác lưu.
- Ảnh chờ tải được lưu vào IndexedDB `sags-radio-original-queue-v1`, chỉ tài khoản gốc được gửi; mở màn bộ đàm sẽ thử đồng bộ lại.

Supabase Edge `verify_jwt=false` ở lớp gateway là **có chủ đích** vì token mang định dạng Firebase. Bên trong Function bắt buộc xác minh chữ ký RS256 bằng Google JWKS, project ID/issuer/audience/hạn sống, rồi kiểm tra quyền đối với từng sự kiện bằng Firestore. Không được bỏ hai lớp xác thực này hoặc mở quyền bucket.

## Khi kho gần đầy

- **700 MiB** là trần riêng cho kho ảnh bộ đàm, không phải đợi đủ 1 GB tài khoản Free.
- **900 MiB** là trần tổng dữ liệu Storage của dự án để giữ dung lượng dự phòng; ngưỡng khả dụng cho radio = MIN(700 MiB, 900 MiB − dữ liệu Storage ở các bucket khác).
- Trong lượt tải ảnh mới, nếu dung lượng hiện tại + ảnh mới vượt trần, dịch vụ sẽ tìm **ngày có ảnh cũ nhất theo Asia/Ho_Chi_Minh**, dọn hết ngày đó qua **Supabase Storage API**; tiếp tục theo ngày cũ kế tiếp đến khi chừa thêm được 64 MiB, hoặc dừng nếu không còn ngày đủ điều kiện.
- **Luôn bảo vệ ngày hiện tại và ngày hôm trước.** Nếu chỉ còn hai ngày này mà đã đầy, dịch vụ trả lỗi có kiểm soát. Ảnh mới tiếp tục ở hàng chờ IndexedDB, không tự xóa ảnh gần đây, không giả vờ đã tải xong.
- Tự dọn chỉ tác động ảnh gốc trong **bucket riêng này**, tuyệt đối không xóa bucket standby, sự kiện ký nhận Firebase, chữ ký, ảnh chứng cứ Firebase, hoặc ảnh của dịch vụ khác.
- Người có quyền xem lịch sử vẫn thấy sự kiện và ảnh chứng cứ Firebase sau khi bản rõ bị dọn. Supabase trả `410 AUTO_PURGED` kèm thời điểm xóa; màn xem/PDF báo rõ nguồn ảnh.
- Không dùng SQL để xóa file `storage.objects`: phải xóa qua Storage API để dọn bytes thực tế.

**Cơ chế là dọn theo nhu cầu tại mỗi lượt tải ảnh mới** (không cần job định kỳ). Khi không có ai gửi ảnh, nó không tự xóa ảnh chỉ vì đã quá một số ngày. Lượng bytes ghi nhận trên Storage của Supabase tính theo GB-giờ nên xóa file không nhất thiết xóa ngay toàn bộ usage đã tính trước đó.

## Các file tích hợp

`supabase/functions/sags-radio-photo-v1/index.ts`: quản lý upload/read/retention phía máy chủ. `app/modules/radio-photo-vault.v1.js`: kho ảnh chờ/đồng bộ trong máy. `app/modules/radio-custody.v1.js`: sinh JPEG đầy đủ thời gian, chữ ký sau khi Firestore ký nhận xong; upload nền và ưu tiên đọc ảnh gốc khi mở lịch sử hoặc xuất PDF. `tests/radio-supabase-original-v32.test.cjs`: mô phỏng JWT RS256, private upload/read, tự dọn theo ngày, không xóa ngày mới và ghi audit. Workflow `radio-photo-supabase-edge-smoke.yml`: kiểm tra endpoint thật từ chối không xác thực hoặc origin không tin cậy.

## Điều kiện nghiệm thu (không được bỏ)

1. Trên iPhone Safari và Android Chrome, chụp ảnh nhận và trả, ký nhận; xác minh Firestore event và giờ ký thực tế còn nguyên.
2. Xác nhận IndexedDB có ảnh chờ khi mất mạng; bật mạng và mở bộ đàm, kiểm tra ảnh được tải lên private bucket với cùng event ID.
3. Đăng nhập AD **trên máy khác**, mở lịch sử, xem ảnh rõ từ Supabase, phóng to số seri; xuất PDF kèm ảnh với JPEG gốc không bị nén lại.
4. Dùng thử ảnh dung lượng lớn/HEIC/JPEG trên iPhone, ảnh timestamp và chữ ký; thử đổi máy cần hai ảnh, bảo đảm một ảnh không gây mất ảnh kia.
5. Kiểm tra deny khi không đăng nhập, token giả mạo, UID khác, origin không hợp lệ; bucket không có quyền anonymous.
6. Dùng dữ liệu **mô phỏng** kiểm tra quá ngưỡng để xác minh ngày cũ nhất bị dọn hoàn toàn, ngày hiện tại và hôm trước an toàn, log `PURGED` còn và Firebase giữ nguyên. Không chạy thử xóa ảnh thật của nhân viên.
7. Kiểm tra chất lượng/độ trễ Safari với nhiều ảnh trước khi triển khai production.

**Tại thời điểm dựng hạ tầng**, bucket mới chưa có ảnh thật; kiểm thử logic bằng dữ liệu giả, không thể tự tuyên bố trải nghiệm iPhone/AD đã đạt nếu chưa chạy trên tài khoản thực tế.

## Kiểm tra trạng thái bằng Supabase SQL Editor

```sql
select
 (select count(*) from public.sags_radio_photo_ledger_v1 where state='LIVE') as live_images,
 (select count(*) from public.sags_radio_photo_ledger_v1 where state='PURGED') as auto_purged,
 (select count(*) from public.sags_radio_photo_cleanup_audit_v1) as audit_entries,
 (select radio_used_bytes from public.sags_radio_photo_usage_v1()) as used_radio_bytes,
 (select other_used_bytes from public.sags_radio_photo_usage_v1()) as used_other_bytes,
 (select public from storage.buckets where id='sags-radio-originals-v1') as publicly_visible;
```

Khôi phục code nếu có lỗi: revert merge commit này trên GitHub, deploy lại GitHub Pages. Không xóa bucket, Edge Function hoặc ledger khi rollback vì sẽ mất ảnh gốc đã ký nhận.
