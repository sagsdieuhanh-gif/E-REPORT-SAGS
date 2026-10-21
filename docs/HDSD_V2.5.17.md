# V2.5.17 – Roster Grnd_LS và TVJ theo chuyến VZ

- Daily Roster nhận cả Grnd_Ls, Grnd_LS và GRND_LS.
- FINAL giữ mã phân công cũ. Mẫu 54 và 94 có mã riêng, không ghi đè FINAL khi tạo chuyến. Hai mẫu vẫn theo cấu hình hãng/loại tàu.
- Khi thay người trong roster, các mẫu CBTT khác nhau không bị xem là cùng một phân công để thu hồi chéo.
- TVJ chỉ xuất hiện trong menu chuyến VZ, bao gồm tài khoản AD. Chặn mở trực tiếp TVJ trên chuyến không phải VZ.
- Sau khi bản này triển khai, dùng luồng cập nhật hiện có rồi nhập lại Daily Roster và kiểm tra FINAL/54/94 tại Grnd_LS. Không cần xóa cache.

Kiểm chứng: kiểm thử tái hiện lỗi mã trùng và menu AD, kiểm thử parser nhiều người, chữ hoa/thường tiêu đề, nhận diện hãng; toàn bộ release gate.

Giới hạn: kiểm thử mô phỏng không xác nhận dữ liệu Firebase hiện có hoặc thao tác trên điện thoại thực tế. Không tự sửa dữ liệu nghiệp vụ đã lưu trên hệ thống đang khai thác.
