# E-REPORT-SAGS SUPABASE · BẢN SAO THỬ NGHIỆM

- Dựa trên toàn bộ source E-REPORT V1.12, nhánh `supabase/e-report-clone-v1`. KHÔNG ghép vào `main` production.
- Supabase mới: `E-REPORT-SAGS-SUPABASE` (`wggirxzdcfnxyjgjvpgh`), Singapore, hoàn toàn độc lập với RNS `ivixjhwghprfxdtaupxc`.
- Đã áp dụng migration `e_report_isolated_baseline_schema`: 8 bảng, 12 policy, RLS 8/8, chưa tạo Auth users hoặc import dữ liệu.
- Module thử nghiệm tự khôi phục/đổi mật khẩu tại `supabase/auth/index.html` dùng Supabase Auth JavaScript SDK ghim `2.118.0` và publishable key (an toàn cho trình duyệt); không dùng service secret.
- Quên mật khẩu: `resetPasswordForEmail` + liên kết cùng origin HTTPS + sự kiện `PASSWORD_RECOVERY` + `updateUser`.
- Đang đăng nhập: `updateUser({password,current_password})`, tối thiểu 12 ký tự có chữ và số; đăng xuất phiên sau đổi mật khẩu.
- Không sử dụng phương án cấp mật khẩu chung 123456 của ứng dụng khác.

**Chưa tích hợp** module này vào giao diện E-REPORT nghiệp vụ cũ, chưa tạo tài khoản nhân viên, chưa chuyển roster/biểu mẫu/PDF. Nhánh này vẫn chứa mã Firebase legacy; không thể coi đây là bản E-REPORT Supabase đã chạy đầy đủ.

**Trước khi gửi email thật:** Trong Supabase Dashboard → Authentication → URL Configuration, thêm URL độc lập của trang khôi phục vào Redirect URLs và Site URL. Email mặc định chỉ gửi tới thành viên Supabase organization và giới hạn khoảng 2 email/giờ; cần SMTP riêng nếu dùng cho toàn bộ nhân viên. Xem https://supabase.com/docs/guides/auth/auth-smtp.

Các bước tiếp theo: tạo tài khoản Supabase riêng (không sao chép password hash Firebase), bảo đảm quyền AD/ĐH/CBTT/KH/PVHK; chuyển roster/bàn giao/nhận chuyến và quy tắc 42.1/55.1/42.3; lưu biểu mẫu và chữ ký; realtime và nháp offline; thử nghiệm xuất PDF; triển khai ứng dụng riêng chỉ khi hoàn thành migration.
