# E-REPORT SAGS

Bản sạch hiện tại: **V1.1.107**.

## Phát hành bản vá

1. Sửa code và cập nhật đồng thời `version.json`, `APP_BUILD_VERSION` trong `index.html`, `BUILD` và `CACHE_NAME` trong `service-worker.js`.
2. Chạy `bash scripts/verify-release.sh`.
3. Commit và push lên nhánh `main`.

Workflow `Verify and deploy patch` sẽ tự kiểm tra cú pháp, phiên bản và tài nguyên. Chỉ khi tất cả kiểm tra đạt, bản mới được deploy lên GitHub Pages. Người đang dùng bản cũ vẫn chỉ chuyển sang bản mới sau khi bấm **CẬP NHẬT** theo cơ chế Service Worker hiện có.

## Cấu trúc chính

- `index.html`, `app.js`, `ai.js`: ứng dụng và nghiệp vụ chính.
- `ui.css`, `ui.js`, `theme.css`: giao diện.
- `daily-roster.js`, `report.js`, `report.css`, `ios-export.js`: module chức năng.
- `service-worker.js`, `version.json`, `manifest.webmanifest`: PWA và cập nhật an toàn.
- Các file PNG/JPG/MP3/WAV: tài nguyên biểu mẫu, hình nền và cảnh báo đang được ứng dụng sử dụng.
- `firestore.rules`, `database.rules.json`, `firebase.json`: cấu hình Firebase, không đưa vào artifact GitHub Pages.

GitHub repository cần bật **Settings → Pages → Build and deployment → Source: GitHub Actions** một lần. Sau đó mỗi lần push bản vá lên `main` sẽ tự deploy.

## API 6 mốc thời gian dành cho IT

Endpoint công khai, không dùng API key:

`GET https://asia-southeast1-e-report-sags.cloudfunctions.net/flights?date=2026-08-30`

Tham số `date` bắt buộc theo định dạng `YYYY-MM-DD`. Mỗi chuyến/cặp chuyến chỉ trả đúng 6 trường: `CHOCK_ON`, `BOARDING_CALL`, `BOARDING_FINISH`, `DOOR_CLOSE`, `CHOCK_OFF`, `PUSHBACK`. Các giá trị `N/A`, `NA`, `NIL`, `-` được trả thành chuỗi rỗng. Record hậu tố `_2`, `_3` được gộp và ưu tiên bản có nhiều mốc hợp lệ hơn.

Triển khai function bằng tài khoản có quyền trên Firebase project:

`firebase deploy --only functions:flights --project e-report-sags`

Để GitHub tự deploy API sau mỗi bản vá, tạo repository secret `GCP_SA_KEY` chứa JSON của service account có quyền triển khai Cloud Functions. Workflow `Deploy flights API` sẽ chạy test rồi phát hành function `flights`; key này chỉ dùng nội bộ lúc deploy, phía IT gọi API không cần key.
