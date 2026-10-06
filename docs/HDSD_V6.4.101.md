# HDSD V6.4.101 · Bản cập nhật thứ 101

Ngày phát hành theo giờ Việt Nam: 06/10/2026. Nền: V6.4.100.

## Giao diện trang chủ

- Logo HAV dùng nguyên ảnh người dùng cung cấp. AK và FD hiển thị hai thẻ riêng. Mã hãng đặt trên tên đầy đủ; hàng thẻ tăng từ 48px lên 96px. Bấm mũi tên cuối hàng để xem các hãng tiếp theo; ở cuối danh sách, mũi tên đưa về đầu. Có thể vuốt ngang hoặc dùng bàn phím khi hàng được focus.
- Bảng chuyến bay sắp tăng dần theo giờ đang hiển thị (STD, nếu thiếu dùng STA); giờ chưa có đặt cuối. Giới hạn số dòng theo chiều cao màn hình PC. Bấm **Xem tất cả** để mở phần còn lại, **Thu gọn** để trở lại. Dữ liệu và quyền mở chuyến vẫn từ Daily Roster/My Flight của tài khoản hiện tại.
- Khi trở về trang chủ sau đăng nhập, dữ liệu được khởi tạo bằng sự kiện trạng thái, không quét toàn bộ DOM.

## Tự ký Daily Roster

Chỉ chạy khi đã đăng nhập và đang mở biểu mẫu của chuyến. Trang chủ không tự xử lý chuyến còn lưu từ phiên trước và không hiện popup thiếu chữ ký. Khi mở biểu mẫu mà chưa có chữ ký, chỉ hiện nhắc ngắn một lần cho từng tài khoản/phân công; người dùng vẫn cần lưu mẫu chữ ký thật. Không tạo chữ ký giả. Phân công phải đúng chủ sở hữu và còn active. Hủy kết quả đang chờ nếu đổi tài khoản/chuyến; ảnh chữ ký chỉ giải mã/cắt một lần cho ARR, DEP và BBBT.

## Nhập nhanh mobile

- 42.3/42.1/55.1: đầu trang gọn gồm thông tin chuyến, tùy chỉnh và đóng; tab chọn phần; danh sách giờ cuộn riêng; nút cập nhật luôn ở chân màn hình. Bỏ nút quay lại lặp với nút đóng trong nhập nhanh.
- FSAGS 09: giữ kết sổ, giờ bay, theo dõi; các nút cùng màu navy/cyan, vùng chạm tối thiểu 40–44px. Không đổi logic PAX, TOTAL, LMC, FINAL DATA hoặc kiểm tra thời gian.
- Nhập số: bảng trượt từ dưới, Trước/Tiếp/N/A trong tầm ngón tay. Chuyển ô không vẽ lại tờ giấy phía sau; dữ liệu vẫn lưu theo cơ chế cũ và vẽ lại khi đóng. Các popup theo chiều cao visual viewport khi bàn phím mở.

## Tối ưu và kiểm tra

Đo 3 lượt cold-load trên cùng trình duyệt Chromium, viewport 390×844, CPU throttle 4×, độ trễ phục vụ tệp nội bộ 25ms, không có Firebase/network ngoài. Median trước/sau:

| Chỉ số | V6.4.100 | V6.4.101 |
|---|---:|---:|
| Lượt tải tài nguyên | 140 | 110 |
| First Contentful Paint | 784ms | 432ms |
| DOMContentLoaded | 3846ms | 3431ms |
| Trung bình xử lý bố cục popup trong mỗi lượt (median 3 lượt) | 104.7ms | 37.7ms |

Gom 31 tệp CSS thành 2 request, giữ thứ tự cascade và ID cũ. Chỉ chuẩn hóa popup đang hiện; không duyệt input/footer của popup ẩn. Dữ liệu field nhập giờ được lập chỉ mục theo nhóm trong phiên. Bỏ lịch tự ký sau mọi lần bấm và các timer lặp; giữ sự kiện mở biểu mẫu, đổi chuyến và lưu chữ ký. Logo 27 hãng được phục vụ từ ứng dụng và cache theo manifest; tải khi cần. Không tắt kiểm tra phân quyền, lưu nháp, audit hay xác thực dữ liệu để tăng tốc.

Bố cục kiểm tra PC cao 768/900/1080px; mobile rộng 360/375/390/412/430px và viewport thấp 500px để mô phỏng bàn phím. Test trình duyệt có fixture 30 chuyến để kiểm tra sắp giờ/thu gọn/mở hết, không đưa dữ liệu fixture vào sản phẩm. Đã kiểm tra mở 42.3, 42.1, 55.1, FSAGS 09; lưu/chuyển ô nhập số; không có pageerror.

Bộ kiểm thử: 26/33 đạt. Bản nền V6.4.100 đạt 23/31, 8 lỗi. Bản này thêm 2 test và sửa đồng bộ hash PWA; không phát sinh lỗi mới. 7 lỗi cũ: airline-form-policy, fsags208-configured-flow, fsags208-toolbar, myflight-dossier, repair-unregister-first, stale-controller-detach, startup-performance. Hai test sau còn phụ thuộc phiên bản/ngày cố định. Chưa kiểm tra giao dịch Firebase hoặc ký/gửi FINAL/PDF bằng tài khoản thật. Các số đo trên không đảm bảo thời gian mạng/Firebase thực tế; tốc độ thiết bị thật phụ thuộc phần cứng và kết nối.

## Nguồn nhận diện hãng

Đối chiếu tên hãng ngày 06/10/2026 theo giờ Việt Nam. Danh sách xuất hiện vẫn lấy từ `data/carrier-service-guide.json`; không thay quy tắc phục vụ hay phân quyền.

| Mã | Tên hiển thị | Nguồn đối chiếu |
|---|---|---|
| HAV | HAV Aviation | https://havaviation.com/ |
| VJ | Vietjet Air | https://www.vietjetair.com/vi |
| QH | Bamboo Airways | https://www.bambooairways.com/vn/en/ |
| DV | SCAT Airlines | https://www.scat.kz/en/ |
| KC | Air Astana | https://ir.airastana.com/en/about-us/overview/ |
| C6 | Centrum Air | https://centrum-air.com/en |
| KA | Aero Nomad Airlines | https://www.aeronomad.kg/en |
| N4 | Nordwind Airlines | https://nordwindairlines.ru/ru/covid-19/safe |
| AK | AirAsia | https://support.airasia.com/s/article/What-travel-documents-do-I-need-en |
| FD | Thai AirAsia | https://support.airasia.com/s/article/What-travel-documents-do-I-need-en |
| KE | Korean Air | https://www.koreanair.com/flights/en/flights-from-seoul-to-vietnam |
| BX | Air Busan | https://en.airbusan.com/content/common/introduction/aircraft |
| WE | Parata Air | https://brand.parataair.com/en |
| RF | Aero K | https://www.aerok.com/en-US/cscenter/announcement/1330?page=1 |
| TW | T’way Air | https://www.twayair.com/app/customerCenter/notice/retrieve/11885 |
| OZ | Asiana Airlines | https://flyasiana.com/ |
| LJ | Jin Air | https://sso.jinair.com/login |
| 3U | Sichuan Airlines | https://global.sichuanair.com/ |
| UQ | Urumqi Air | https://www.urumqi-air.com/fecms.pub.bucket.uq/20230317/gjysztj_2021_1.pdf |
| DR | Ruili Airlines | https://www.iata.org/en/about/members/airline-list/ruili-airlines/547/ |
| TR | Scoot | https://www.flyscoot.com/en |
| HY | Uzbekistan Airways | https://www.uzairways.com/en |
| HU | Hainan Airlines | https://www.hainanairlines.com/go/2017.6-6/DOCS/Responsibilities_and_Prospects/HNA_CSR-Report_2015_EN-1.pdf |
| VZ | Thai Vietjet Air | https://th.vietjetair.com/public/th/news/category/travel-guide?page=8 |
| 9G | Sun PhuQuoc Airways | https://www.sunphuquocairways.com/gl/en/about-us/spa-story |
| B2 | Belavia | https://en.belavia.by/news/4890591/ |
| VU | Vietravel Airlines | https://www.vietravelairlines.com/us/en/about-us/news/launching-international-route-ho-chi-minh-city-bangkok-473 |

Logo: HAV là ảnh đính kèm người dùng; KA lấy nguyên SVG logo header từ https://www.aeronomad.kg/_next/static/media/header-logo.289efce0.svg, tránh logo Cathay Dragon cũ theo mã KA. 25 logo PNG còn lại lấy từ https://images.kiwi.com/airlines/64/{CODE}.png và được lưu cùng ứng dụng. Không sửa hình dạng/nhãn thương hiệu.
