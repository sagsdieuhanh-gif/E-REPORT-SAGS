# V2.2.5 R2 — SỬA CƠ CHẾ UPDATE + LỖI KÝ/XUẤT

## Vì sao máy vẫn ở V2.2.2?
Bản R2 sửa hai nhóm vấn đề:

1. **Update bị kẹt trên máy ít dung lượng**
   - Worker cũ tạo cache release mới trong lúc cache V2.2.2 vẫn còn.
   - Trên thiết bị đang báo quota, việc nhân đôi cache trong giai đoạn INSTALL có thể làm worker mới không cài xong.
   - R2 không pre-cache toàn bộ app khi INSTALL. Chỉ kiểm tra release/runtime, chờ người dùng bấm UPDATE, sau đó ACTIVATE mới dọn cache release cũ và cache lại theo nhu cầu.

2. **Ký tên xong không xuất PDF / MY FLIGHT báo quota**
   - Giữ fix V2.2.5: checkpoint local-first không lưu thêm một full envelope trùng với local session chính.
   - Trước xuất sẽ flush state/chữ ký hiện tại.
   - Không reload lại cùng assignment ngay trước xuất.

## Nền nghiệp vụ
- V2.2 local-first.
- V2.2.2 ARR → DEP production.
- Không đưa V2.2.3/V2.2.4 thử nghiệm vào bản này.
- Reset mật khẩu vẫn tạm dừng.

## Khuyến nghị deploy
Dùng `DEPLOY-V2.2.5-R2.ps1` để:
- backup file hiện tại;
- cập nhật runtime/version/SW/HDSD;
- vá `index.html` để server tự khai báo V2.2.5 và nạp đúng runtime;
- commit/push toàn bộ trong một lần;
- kiểm tra online sau push.

Nếu upload thủ công trên GitHub:
- tất cả file phải ở ROOT repo `E-REPORT-SAGS`;
- phải thật sự bấm COMMIT CHANGES;
- kiểm tra `version.json` online phải hiển thị V2.2.5 trước khi test máy.

## Test
1. Máy đang V2.2.2, mở lại app khi có mạng.
2. Popup phải báo V2.2.5.
3. Bấm UPDATE.
4. Góc trái phải thành V2.2.5.
5. Mở MY FLIGHT.
6. Ký tên → XUẤT ngay.
7. Không được báo quota; PDF giữ chữ ký.
