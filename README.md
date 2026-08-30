# E-REPORT SAGS

Bản hiện tại: **V1.1.108 — IT FREE RTDB API**.

## API miễn phí dành cho IT

Không dùng Cloud Functions, API key, GCP service account hoặc GitHub Secret. IT đọc trực tiếp nhánh công khai giới hạn `it_public` của Firebase Realtime Database:

`GET https://e-report-sags-default-rtdb.asia-southeast1.firebasedatabase.app/it_public/YYYY-MM-DD.json`

Ví dụ ngày 30/08/2026:

`https://e-report-sags-default-rtdb.asia-southeast1.firebasedatabase.app/it_public/2026-08-30.json`

IT gọi lại mỗi **120 giây**. Mỗi cặp chuyến chỉ có 6 trường thời gian: `CHOCK_ON`, `BOARDING_CALL`, `BOARDING_FINISH`, `DOOR_CLOSE`, `CHOCK_OFF`, `PUSHBACK`. Xem hướng dẫn đầy đủ tại [HDSD-API-IT.md](HDSD-API-IT.md).

## Phát hành bản vá giao diện

1. Cập nhật đồng thời `version.json`, `APP_BUILD_VERSION` trong `index.html`, `BUILD` và `CACHE_NAME` trong `service-worker.js`.
2. Chạy `bash scripts/verify-release.sh`.
3. Commit và push lên nhánh `main`.

Workflow `Verify and deploy patch` tự kiểm tra rồi deploy GitHub Pages. Người đang thao tác chỉ chuyển sang bản mới sau khi bấm **CẬP NHẬT** theo cơ chế Service Worker hiện có.

## Cấu trúc chính

- `index.html`, `app.js`, `ai.js`: ứng dụng và nghiệp vụ chính.
- `ui.css`, `ui.js`, `theme.css`: giao diện.
- `daily-roster.js`: đồng bộ 6 mốc thời gian sang `it_public` và các chức năng Daily Roster.
- `report.js`, `report.css`, `ios-export.js`: báo cáo và xuất file.
- `service-worker.js`, `version.json`, `manifest.webmanifest`: PWA và cập nhật an toàn.
- `database.rules.json`: chỉ cho đọc công khai nhánh `it_public`; các nhánh còn lại vẫn yêu cầu xác thực.

GitHub repository chỉ cần bật một lần: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
