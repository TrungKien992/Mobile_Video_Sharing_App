# SLIDE THUYẾT TRÌNH BÁO CÁO ĐỀ TÀI
## ĐỀ TÀI: PHÁT TRIỂN ỨNG DỤNG CHIA SẺ VIDEO ĐA NỀN TẢNG (VIDEO SHARING APP)
**Thời lượng trình bày:** 5 phút (Tương ứng 7 Slide chuẩn)

---

### SLIDE 1: GIỚI THIỆU ĐỀ TÀI & VAI TRÒ THÀNH VIÊN TRONG NHÓM (SDLC)
- **Tên dự án:** Video Sharing Application (Mobile & Web)
- **Công nghệ cốt lõi:** React Native (Expo SDK 58), TypeScript, React Native Web, Expo-AV, AsyncStorage
- **Mục tiêu:** Xây dựng ứng dụng chia sẻ video ngắn hiện đại, mượt mà, ngôn ngữ tiếng Việt, chạy được trên iOS, Android và Web.
- **Phân chia vai trò SDLC:**
  * **Nguyễn Văn A (Nhóm trưởng):** System Architect & Project Manager (Quy hoạch SDLC, kiến trúc State & Responsive).
  * **Trần Thị B:** UI/UX Designer & Frontend Developer (12 màn hình theo thiết kế Figma, Design system).
  * **Lê Hoàng C:** Fullstack & Storage Engineer (AsyncStorage, Schema dữ liệu, CSDL Offline).
  * **Phạm Quốc D:** Performance Specialist (Engine VideoPlayer đa nền tảng, Cache RAM & Prefetching).
  * **Hoàng Minh E:** QA/QC & Technical Writer (Test Cases, Ma trận kiểm thử, Báo cáo & Tài liệu).

---

### SLIDE 2: QUY TRÌNH SDLC & PHÂN TÍCH YÊU CẦU (SRS)
- **Mô hình SDLC:** Áp dụng mô hình kết hợp Agile/Scrum qua 6 giai đoạn rõ ràng:
  `Phân tích yêu cầu (SRS) ➔ Thiết kế hệ thống (SDS) ➔ Hiện thực (Implementation) ➔ Kiểm thử (Testing) ➔ Triển khai (Deployment) ➔ Bảo trì (Maintenance)`.
- **Tác nhân chính (Actors):**
  * Khách (Guest): Khám phá video, nghe nhạc.
  * Người xem (Viewer): Thả tim, bình luận, lưu video, theo dõi tác giả.
  * Người sáng tạo (Creator): Quay video, thêm hiệu ứng lọc màu, chọn bài hát, đăng tải bài viết.
  * Người phát trực tiếp (Live Streamer): Bán hàng livestream, ghim sản phẩm, tương tác realtime.
- **12 Chức năng cốt lõi:** Bao phủ toàn bộ luồng người dùng từ Trang chủ, Tìm kiếm, Lướt xem shorts, Bình luận, Live stream, Studio tạo video, Bộ lọc, Âm thanh, Đăng video đến Hồ sơ cá nhân.

---

### SLIDE 3: THIẾT KẾ UI/UX & TRẢI NGHIỆM ĐA NỀN TẢNG (DESIGN SYSTEM)
- **Tông màu chủ đạo:** Hồng năng động (`#FF2A6D`), nền sáng tinh tế (`#FAFAFA`) và Dark Mode huyền bí (`#0F1015`).
- **Thiết kế bám sát 100% Mockup Figma:**
  * **Trang chủ:** Story bar bo tròn, thẻ Top xu hướng, lưới 8 chủ đề sắc nét, Live streaming nổi bật.
  * **Lướt Video (Shorts/Reels):** Tỉ lệ chuẩn 9:16, Sidebar tương tác mượt mà, đĩa nhạc quay tròn.
  * **Live Stream:** Hiệu ứng thả tim bay sinh động, thẻ sản phẩm ghim mua ngay, chat trực tiếp.
  * **Xưởng sáng tạo:** Viewfinder camera, thanh công cụ bên phải (Lật, Filter, Hẹn giờ, Flash), thanh đếm giây quay.
- **Responsive Web & Mobile:**
  * Trên Web Desktop: Khung điện thoại thông minh viền đổ bóng đặt ngay trung tâm.
  * Trên Mobile/Tablet: 100% toàn màn hình, cử chỉ chạm vuốt tự nhiên.

---

### SLIDE 4: KIẾN TRÚC HỆ THỐNG & TỔ CHỨC DỰ ÁN (SDS)
- **Kiến trúc Modular Multi-Tier:**
  * **Tầng Giao diện (Presentation Layer):** Screen Router, ResponsiveContainer, Reusable Components.
  * **Tầng Quản lý Trạng thái (State Management):** Context API (`AppContext`, `ThemeContext`) quản lý dữ liệu toàn cục.
  * **Tầng Dịch vụ (Service Layer):** `StorageService` (lưu trữ) và `VideoCacheService` (hiệu năng).
  * **Tầng Dữ liệu (Data Layer):** `AsyncStorage` kết hợp Google Storage HTTPS MP4 Streams & Unsplash CDN.
- **Tiêu chuẩn Code:** 100% TypeScript Strict Mode, cấu trúc thư mục phân tách độc lập (Single Responsibility Principle).

---

### SLIDE 5: BACKEND, DATABASE & CƠ CHẾ LƯU TRỮ (STORAGE)
- **Cơ chế Lưu trữ Dữ liệu Offline-First:**
  * Sử dụng `@react-native-async-storage/async-storage` làm hệ cơ sở dữ liệu phi quan hệ (NoSQL Key-Value Store) trên máy người dùng.
  * Mô hình ERD chuẩn hóa: Users, Videos, Comments, Musics, LiveProducts, UserFollows, UserLikes.
- **Đồng bộ trạng thái tức thời:**
  * Like / Bookmark / Follow được cập nhật tức thì vào Set trên RAM và lưu xuống đĩa nền.
  * Video mới do người dùng đăng được ghi nhận ngay vào đầu danh sách video, hiển thị tức thì trên cả Feed và Profile mà không cần tải lại app.
  * Lưu bản nháp (Drafts) giúp người dùng không bị mất nội dung khi thoát app đột ngột.

---

### SLIDE 6: NỘI DUNG ĐẶC BIỆT CÓ HIỆN THỰC TRONG DỰ ÁN (CACHE & PERFORMANCE)
1. **Trình phát Video Hybrid Đa Nền Tảng (Cross-Platform Player Engine):**
   * Web: Sử dụng thẻ HTML5 `<video>` với cơ chế tự động xử lý Autoplay Policy.
   * Mobile: Sử dụng `expo-av` native hardware-accelerated playback.
2. **In-Memory Cache (RAM Zero-Latency):**
   * Sử dụng cấu trúc `Map<string, VideoItem>` trên RAM để lấy video tức thì 0ms, loại bỏ hoàn toàn độ trễ I/O đọc đĩa.
3. **Kỹ thuật Video Prefetching:**
   * Khi đang phát video hiện tại, thuật toán tự động tải trước (prefetch) metadata và đường dẫn của 2 video kế tiếp trong feed.
4. **Playback Position Resume:**
   * Tự động lưu vị trí giây phát gần nhất, cho phép người dùng xem tiếp đoạn video đang dang dở.
5. **Hiệu ứng Micro-animations:**
   * Thuật toán vật lý tim bay ngẫu nhiên (Randomized Vector Physics) trên luồng Live Stream.

---

### SLIDE 7: KẾT QUẢ KIỂM THỬ, DEMO & KẾ HOẠCH TƯƠNG LAI
- **Kết quả Kiểm thử (Testing Matrix):**
  * 16/16 Test Cases chức năng và phi chức năng đều đạt kết quả **PASSED (100%)**.
  * 0 lỗi biên dịch TypeScript (`npx tsc --noEmit` exit 0).
  * Đóng gói Web Bundle thành công 100% (`npx expo export -p web` 429 modules).
- **Kế hoạch phát triển tương lai (Roadmap):**
  * Tích hợp AI Recommendation (Gợi ý video thông minh theo sở thích).
  * Streaming thích ứng Adaptive Bitrate (HLS chuyển đổi 1080p, 720p, 480p).
  * Tích hợp cổng thanh toán trực tiếp VNPay / MoMo trên luồng Live Stream.
- **Lời cảm ơn & Bắt đầu phần Demo trực tiếp ứng dụng!**
