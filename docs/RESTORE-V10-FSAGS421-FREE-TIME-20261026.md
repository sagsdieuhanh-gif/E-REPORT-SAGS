# E-REPORT-SAGS: khôi phục V1.0 và nhập giờ tự do FSAGS 42.1

- Ngày triển khai: 2026-10-26.
- Người sử dụng yêu cầu khôi phục **toàn bộ dự án về V1.0**, đồng thời bỏ hoàn toàn quy tắc buộc nhập giờ trước mới được nhập mốc sau của **FSAGS 42.1**.
- Mốc khôi phục: `682342de6de5f3dcfd34fdc0320ee442ed50d3ea`; phiên bản hiển thị: **V1.0**.
- Hotfix: `app/boot/05-legacy.js` trả về `null` ngay khi `v22TimeRuleForKey()` được gọi với trường `f421_*`; do đó mọi thành phần dùng chung đều không được áp đặt quy tắc Start/Finish của 42.1.
- Trong chính V1.0, `orderedTimeRequirement` không áp dụng, `canCreateOrderedTime` cho mở mọi ô, `v22ValidateTimeChange` cho qua 42.1, `validateOrderedBatch` cho phép sửa độc lập, và `validatePairsBatch` không kiểm tra mốc 42.1.
- Giữ nguyên **giới hạn HH:MM**, quy tắc cho 42.3/55.1, TVJ chỉ dành cho chuyến VZ, Firebase, hồ sơ đã lưu, nháp chưa đồng bộ và mẫu PDF.
- Mã build: `V1.0-20261026-421-UNRESTRICTED-10`. 204 tài nguyên PWA được kê khai mã SHA-256.
- Sao lưu V1.3 trước khôi phục: `backup/v13-before-full-v10-421-rollback-20261026`.
- Tài liệu này không làm thay đổi ứng dụng hoặc dữ liệu; commit của nó kích hoạt kiểm thử release và triển khai bản V1.0.
