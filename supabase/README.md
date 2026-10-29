# E-REPORT-SAGS → SUPABASE (bản sao thử nghiệm)

**Trạng thái: NỀN TẢNG — CHƯA PHẢI ỨNG DỤNG SUPABASE CHẠY NGHIỆP VỤ.**

Nhánh \`supabase/e-report-clone-v1\` là **bản sao đầy đủ mã E-REPORT V1.12**. Không sửa \`main\`, không sửa Firebase đang chạy, không sửa database hoặc người dùng của \`SAGSCXR-RNS\`.

## Đã chuẩn bị

- \`supabase/sql/e_report_bootstrap.sql\`: thiết kế các bảng accounts, flights, assignments, forms, cloud drafts, roster, handover, audit; **bật RLS cho mọi bảng**, tránh quyền \`anon\` và hạn chế quyền ghi dữ liệu quan trọng.
- \`supabase/client/e-report-gateway.mjs\`: gateway ban đầu cho Supabase Auth, danh sách chuyến bay, assignments, forms, nháp và Realtime; chủ động từ chối dùng chung URL của SAGSCXR-RNS.
- \`tests/supabase-clone-isolation.test.cjs\`: kiểm tra guard, chính sách RLS, cấu trúc database.
- Không chứa \`service_role\` hoặc khóa Supabase bí mật, không có dữ liệu thật.

**Chưa áp dụng SQL** lên bất kỳ project nào. Khi người dùng chọn tổ chức, cần tạo **Supabase project mới** tại Singapore (\`ap-southeast-1\`). Công cụ hiện báo giá tạo project là **0 USD/tháng** trong tổ chức đã kết nối, nhưng vẫn áp dụng hạn mức Free.

## Việc còn phải chuyển

1. Supabase Auth: tạo tài khoản, đăng nhập, quản lý nhân sự/role, reset mật khẩu. Firebase password hashes không sao chép được.
2. Chuyển chính xác logic roster merge, chia 42.1/55.1/42.3, nhận và bàn giao nhiều người, không để người cũ nhận nhầm hoặc mất dữ liệu.
3. Chuyển giao dịch nhiều nhánh của Firebase RTDB sang Postgres atomic transaction / Edge Functions có xác thực thật.
4. Chuyển lưu biểu mẫu, ký, hoàn tất, lịch sử sửa đổi và phân quyền; không thay đổi font RAMP BX, TVJ, NIL, PDF và layout.
5. Supabase Realtime và localStorage + IndexedDB + cloud draft HLC; kiểm thử offline/mất mạng.
6. Truyền dữ liệu thật chỉ khi được đồng ý riêng; đo tốc độ và kiểm tra từng vai trò AD/ĐH/CBTT/KH/PVHK.
7. Tạo project Vercel **riêng**, tắt hẳn Firebase SDK trong bản sao đã chuyển xong, triển khai trên domain test.

**Không triển khai nhánh này như một bản Supabase đang hoạt động:** mã nguồn UI gốc vẫn dùng Firebase và chưa được nối vào gateway mới.

Không dùng cùng một Supabase project với SAGS-RNS; database RNS đang chứa dữ liệu khác. Chưa có tài khoản hay chuyến bay nào được di chuyển.
