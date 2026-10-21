# E-REPORT SAGS · Thống nhất màu chữ và độ tương phản V2.5.20

## Mục tiêu và phạm vi
- Một hệ token nền/chữ cho giao diện sáng và tối trên cả mobile lẫn PC; không ép chữ sáng lên thẻ trắng hoặc chữ tối lên thẻ tối.
- Mọi chữ thường đặt mục tiêu WCAG AA >= 4,5:1; chữ cỡ lớn >= 3:1. Bộ token cốt lõi gồm 17 cặp mức 4,5:1.
- Bao gồm đăng nhập, menu/landing, dashboard hãng, My Flight, hồ sơ chuyến, các bảng chuyến, admin, settings, roster, form quản lý, popup, nút, nhãn, placeholder, badge, trạng thái thiếu và các khối Sổ tay hãng.
- Duy trì các quy tắc sửa giao diện nghiệp vụ/phân quyền của theme-contrast.v2.js; không can thiệp màu in PDF, giấy gốc, SVG biểu mẫu, canvas chữ ký, vị trí field, dữ liệu biểu mẫu, hay kết nối Firebase.

## Cơ chế
- File nguồn mới `app/styles/unified-contrast.v1.css` được load cuối cùng sau theme-contrast.v2.js; chỉ áp dụng `@media screen`.
- Cặp token `--ec-dark-*` cho mặt tối và `--ec-light-*` cho mặt sáng; các vùng nhập phụ thuộc theme hiện có không bị đổi nền tràn lan.
- Sổ tay hãng luôn là thẻ sáng; chữ giá trị chính, nhãn, chưa cập nhật, lưu ý và nguồn đều được cố định màu phù hợp nền, kể cả khi E-Report chạy theme tối.
- Không sử dụng JS observer/interval, không thay đổi kích thước, layout hay ảnh để giảm nguy cơ lag.

## QA và release
- Unit test `tests/unified-contrast-contract.test.cjs`: kiểm tra cặp AA, phạm vi surface, thứ tự load, vùng cấm và hash asset.
- Toàn bộ `npm run release` (build-runtime, build-styles, checksum, syntax và regressions) phải PASS trước merge main.
- CI không thay thế kiểm tra trực quan có dữ liệu thật: nên kiểm tra riêng PC/mobile, dark/light và Safari/iOS, đặc biệt biểu mẫu 54/94/208, popup, tài khoản AD, My Flight.
- Các trạng thái lag vượt ngoài CSS cần thu thập trace Performance, tránh tuyên bố đã sửa nếu chưa đo.
