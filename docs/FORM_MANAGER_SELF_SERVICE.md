# Form Manager Self-Service — AI Assisted Form Intake

> Nhánh thử nghiệm: `feature/form-manager-ai-builder`  
> Không merge vào `main` cho đến khi AD duyệt.

## Mục tiêu

Form Manager trở thành nơi quản lý vòng đời biểu mẫu:

1. AD tạo form mới.
2. Upload PDF/PNG/JPG/WebP.
3. Local AI/OCR đọc form và đề xuất field.
4. AD review **từng field trước khi Apply**:
   - dùng / bỏ,
   - sửa Label,
   - sửa Type,
   - sửa Bind/Key.
5. AD kéo/resize vùng trên overlay.
6. TEST HIỂN THỊ và PDF PREVIEW.
7. Lưu **Integration Contract**.
8. Xuất JSON form + gói tích hợp.
9. Review trên branch.
10. Chỉ merge khi AD nói OK.

AI không được tự quyết schema cuối cùng.

---

## Các loại field chuẩn

- `text` — chuỗi ngắn.
- `textarea` — ghi chú/nội dung dài.
- `number` — số, trọng lượng, index, CG, payload...
- `time` — giờ khai thác.
- `date` — ngày.
- `checkbox` — yes/no/check.
- `signature` — vùng chữ ký.
- `static-text` — text do hệ thống dựng, không phải input người dùng.

### Thuật ngữ Weight & Balance đã được bổ sung

AI classifier hiểu các từ khóa:

`DOW, DOI, ZFW, TOW, LAW/LW, CG, MAC, TRIM, FUEL, PAYLOAD, LOAD, INDEX, MOMENT, ARM, LMC`

và ưu tiên nhận chúng là `number`.

---

## Integration Contract

Mỗi generic form có contract riêng:

```json
{
  "schema": 1,
  "formId": "fs1",
  "code": "FS1",
  "name": "Weight & Balance / Dispatch",
  "ownerDepartment": "PDH",
  "allowedRoles": ["AD", "DH"],
  "entryMode": "MY_FLIGHT",
  "menuLabel": "FS1 · W&B",
  "featureKey": "FORM_FS1",
  "workflowClass": "FLIGHT_BOUND",
  "storageNamespace": "forms/fs1",
  "exportPrefix": "FS1",
  "requiresSignature": true,
  "requiresApproval": false,
  "visible": true,
  "status": "DRAFT",
  "version": 1
}
```

### Ý nghĩa

- **ownerDepartment**: đơn vị quản lý.
- **allowedRoles**: role được phép dùng.
- **entryMode**:
  - `MY_FLIGHT`: nghiệp vụ gắn với chuyến.
  - `MENU`: chức năng độc lập từ menu.
  - `GENERIC_PICKER`: chỉ nằm trong bộ chọn form generic.
- **workflowClass**:
  - `FLIGHT_BOUND`
  - `DAILY`
  - `STANDALONE`
  - `REFERENCE`
- **featureKey**: khóa permission.
- **storageNamespace**: namespace dành riêng cho dữ liệu riêng của form.
- **exportPrefix**: tiền tố PDF/file xuất.

---

# Ví dụ: thêm FS1

## Bước 1 — Tạo form

Form Manager → **+ FORM MỚI**.

Đặt:

- ID: `fs1`
- Code: `FS1`
- Name: `Weight & Balance / Dispatch`

Upload PDF hoặc ảnh.

PDF nhiều trang dùng cơ chế import trang hiện có của Form Manager.

## Bước 2 — AI

Chọn từng trang → **AI NHẬN DẠNG**.

AI chỉ tạo preview.

Trong AI Review:

1. bỏ tick field không phải input;
2. sửa Type;
3. sửa Label;
4. sửa Bind;
5. chỉ sau đó mới bấm **ÁP DỤNG GỢI Ý**.

Field dưới 75% nên được kiểm tra thủ công.

## Bước 3 — Căn form

Dùng overlay:

- kéo field;
- resize;
- chọn nhiều;
- Undo/Redo;
- chỉnh font;
- chỉnh align.

## Bước 4 — Test

Chạy:

- **TEST HIỂN THỊ**
- **PDF PREVIEW**
- **KIỂM TRA**
- **CHUẨN HÓA**

Không phát hành nếu:

- key bị trùng;
- field vượt trang;
- vùng signature sai;
- PDF khác vị trí live view;
- field AI confidence thấp chưa được review.

## Bước 5 — Integration Contract

Bấm **🧭 TÍCH HỢP**.

Ví dụ FS1:

- Phòng: PDH
- Roles: AD, DH
- Entry: MY_FLIGHT
- Workflow: FLIGHT_BOUND
- Label: FS1 · W&B
- Feature: FORM_FS1
- Storage: forms/fs1
- Export: FS1
- Signature: tùy form
- Approval: theo nghiệp vụ thực tế

Bấm **LƯU CONTRACT**.

## Bước 6 — Xuất

Xuất:

- JSON FORM
- Gói Form
- Integration JSON
- Integration Markdown

Gói Markdown chính là checklist/câu lệnh tích hợp cho dev/AI agent.

---

# Prompt chuẩn để áp dụng một form đã duyệt

```text
Áp dụng biểu mẫu từ Form Manager theo Integration Contract đã lưu.

Yêu cầu:
- Không thay business logic của các form khác.
- Không đổi Firebase path hiện hữu.
- Không đổi auth/role hiện hữu.
- Đọc forms.registry.json làm nguồn layout.
- Tôn trọng form.integration.allowedRoles.
- Tôn trọng form.integration.featureKey.
- Tôn trọng form.integration.entryMode.
- Nếu entryMode=MY_FLIGHT, chỉ thêm entry trong Flight Workspace theo quyền; không thay luồng nhận chuyến.
- Dữ liệu riêng của form mới chỉ được ghi dưới storageNamespace của contract, trừ các field dùng chung đã được mapping rõ ràng.
- Live view và PDF phải dùng cùng registry coordinates.
- Signature phải dùng field type=signature.
- Không tự merge main.
- Làm trên branch mới.
- Chạy smoke test trước khi đề nghị merge.

Smoke test:
Login → My Flight → chọn chuyến → mở form → nhập dữ liệu → save → back → mở lại → ký → xuất PDF → reload → xác nhận dữ liệu còn nguyên.
```

---

# Quy tắc an toàn

1. AI chỉ **gợi ý**; AD là người phê duyệt.
2. Không tự map một field vào Firebase dùng chung chỉ vì tên giống nhau.
3. Không tự thêm role.
4. Không tự thay workflow.
5. Không merge main từ Form Manager.
6. Form mới phải có namespace riêng nếu có dữ liệu riêng.
7. Registry/layout thay đổi phải có preview trước.
8. Giữ khả năng Undo trước khi publish.
