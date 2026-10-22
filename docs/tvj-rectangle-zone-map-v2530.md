# TVJ-GOF-035 · Sơ đồ khu vực Nhập nhanh theo khung chữ nhật (V2.5.30)

**Nguồn:** `forms/tvj/page-01.png` (TVJ-GO-F-035 REV06 20260801 RAMP CHECKLIST REPORT FORM), đối chiếu `forms/forms.registry.json` với 128 trường nhập. Đây là bản mapping duy nhất cho TVJ, không thay cấu trúc biểu mẫu hãng khác.

## Quy tắc
- **Một khung chữ nhật in trên biểu mẫu = một khu Nhập nhanh.** Phân chia dựa trên tâm hình chữ nhật của chính từng trường, dùng tọa độ chuẩn hóa x/y/w/h.
- Đầu biểu mẫu là một khung chung, sau đó từng khung trái/phải được giữ nguyên, không cắt ngang khung khi qua mốc y.
- **14 khu vực / 128 trường; không thiếu, không trùng** (bài kiểm thử `tests/tvj-rectangle-groups-v2530.test.cjs` đối chiếu registry).
- Nút ◀ KHU TRƯỚC, CHỌN KHU (danh sách 14 khu), KHU TIẾP ▶ thay cho 3 tab ĐẾN/ĐI/OTHER không phù hợp mẫu giấy. Không lưu hay xóa dữ liệu khi đổi khu.
- Next/Enter: đi tới ô kế tiếp trong **cùng khung**, bao gồm checkbox; chỉ chuyển khu khi đã qua ô cuối. Khi ô được phép sử dụng dấu `/` còn trống thì vẫn tự điền `/`. NIL chỉ TVJ, giữ nguyên các thay đổi V2.5.29.
- Nếu sau này Form Manager thêm ô ra ngoài 14 khung, ô đó sẽ vào khu **TRƯỜNG BỔ SUNG** thay vì bị mất.

| # | Khung chữ nhật trên biểu mẫu giấy | Số ô | Phạm vi tọa độ (x trái-phải; y trên-dưới) |
|---:|---|---:|---|
| 1 | THÔNG TIN CHUYẾN | 15 | 0–1; 0–0.145 |
| 2 | ARRIVAL FLIGHT | 8 | 0–0.5; 0.145–0.257 |
| 3 | DEPARTURE FLIGHT | 8 | 0.5–1; 0.145–0.257 |
| 4 | BAGGAGE UNLOADING | 7 | 0–0.5; 0.257–0.350 |
| 5 | BAGGAGE LOADING | 7 | 0.5–1; 0.257–0.350 |
| 6 | CARGO UNLOADING | 7 | 0–0.5; 0.350–0.469 |
| 7 | CARGO LOADING | 8 | 0.5–1; 0.350–0.469 |
| 8 | EQUIPMENT / MANPOWER | 8 | 0–0.5; 0.469–0.566 |
| 9 | FINAL FIGURE · PAX / BAGGAGE | 11 | 0.5–1; 0.469–0.606 |
| 10 | IRREGULARITIES / DELAY / DAMAGE | 1 | 0–0.5; 0.566–0.765 |
| 11 | OFFLOADED · PAX / BAGGAGE | 8 | 0.5–1; 0.606–0.704 |
| 12 | A/C COMPARTMENT VISUAL INSPECTION | 18 | 0–0.5; 0.765–1 |
| 13 | LIR / GROUND SERVICE | 20 | 0.5–1; 0.704–0.930 |
| 14 | NAME / STAFF ID | 2 | 0.5–1; 0.930–1 |

### Nghiệm thu thực tế cần thực hiện
Trên một chuyến VZ được quyền thao tác, vào **TVJ → Nhập nhanh**; mở danh sách Khu, kiểm tra 14 mục; vào Baggage Unloading, Cargo Loading, Final Figure và Visual Inspection, xác nhận tất cả ô còn trong cùng khu và Next không báo hết khu sớm. Kiểm tra dữ liệu đã điền không mất khi quay lại, xuất PDF đối chiếu trang biểu mẫu. Để không ảnh hưởng vận hành thật, nên thử trên bản sao dữ liệu/chuyến test trước khi nghiệm thu.

### Giới hạn
Việc mapping dựa vào ảnh mẫu lưu trong repository và tọa độ Form Manager, chưa thay thế thử nghiệm trực quan đầy đủ trên thiết bị và với biểu mẫu vận hành thực tế.
