# HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY SOURCE CODE
## DỰ ÁN: VCLIP - NỀN TẢNG CHIA SẺ VIDEO NGẮN ĐA NỀN TẢNG (REACT NATIVE EXPO + MONGODB)

---

## 1. YÊU CẦU MÔI TRƯỜNG HỆ THỐNG
Trước khi chạy dự án, máy tính cần được cài đặt sẵn:
- **Node.js:** Phiên bản `>= 18.0.0` (Khuyến nghị v20.x hoặc v24.x LTS).
- **MongoDB Community Server:** Chạy tại cổng mặc định `mongodb://127.0.0.1:27017` (Database tự động khởi tạo: `video_sharing_db`).
- **Trình duyệt Web** (Chrome / Edge) hoặc ứng dụng **Expo Go** trên điện thoại iOS/Android.

---

## 2. CẤU TRÚC THƯ MỤC DỰ ÁN (THEO CHUẨN BÀI THỰC HÀNH BUỔI 8 & BUỔI 9)
```text
Prj/
├── server/
│   ├── index.js                  # Backend REST API (Node.js + Express + Mongoose + Multer)
│   └── uploads/                  # Thư mục lưu trữ file video .MP4 thực người dùng tải lên
├── src/
│   ├── api/
│   │   └── client.ts             # HTTP Fetch wrapper gọi tới http://localhost:3000 + uploadFile
│   ├── components/
│   │   ├── BottomTabBar.tsx      # Thanh điều hướng 5 tab dưới đáy
│   │   ├── CommentModal.tsx      # Modal bình luận + đánh giá 1-5 sao (RatingStars)
│   │   ├── EmptyState.tsx        # Hiển thị khi danh sách rỗng
│   │   ├── ErrorView.tsx         # Hiển thị lỗi + nút Thử lại
│   │   ├── FilterModal.tsx       # Bộ lọc màu video
│   │   ├── FloatingHeart.tsx     # Hiệu ứng tim bay trong phòng Live
│   │   ├── FormField.tsx         # Ô nhập liệu có label, báo lỗi đỏ & nút ẩn/hiện mật khẩu 👁
│   │   ├── HeaderBar.tsx         # Header thương hiệu VClip + chuông thông báo có badge
│   │   ├── HeartButton.tsx       # Nút thả tim đọc/ghi trực tiếp vào Store + MongoDB
│   │   ├── LoadingView.tsx       # Màn hình chờ khi Hydration dữ liệu
│   │   ├── MusicModal.tsx        # Chọn nhạc nền
│   │   ├── NotificationItem.tsx  # Thẻ thông báo (tô nền tím nhạt & chấm đỏ nếu chưa đọc)
│   │   ├── PrimaryButton.tsx     # Nút bấm chuẩn hóa (Primary / Outline / Loading)
│   │   ├── RatingStars.tsx       # Hiển thị & chọn số sao đánh giá (1..5 ★)
│   │   ├── ResponsiveContainer.tsx # Tự động căn khung trên Mobile / Tablet / Web
│   │   └── VideoPlayer.tsx       # Trình phát video .MP4 thực (HTML5 Video trên Web & expo-video trên Mobile)
│   ├── context/
│   │   ├── AppContext.tsx        # Quản lý State toàn cục đồng bộ MongoDB + AsyncStorage
│   │   └── ThemeContext.tsx      # Quản lý giao diện Sáng / Tối (Light / Dark Mode)
│   ├── data/                     # Dữ liệu khởi tạo & danh sách Video MP4 mẫu đã kiểm chứng
│   ├── hooks/
│   │   ├── useAutoPersist.ts     # Tự động lưu state xuống AsyncStorage khi ready === true
│   │   ├── useDebounce.ts        # Debounce 300ms cho ô tìm kiếm
│   │   └── usePersistence.ts     # Kiểm tra trạng thái Hydration khi khởi động / nhấn F5
│   ├── screens/
│   │   ├── HomeScreen.tsx        # Khám phá, Hero Banner, Lọc chủ đề, Lưới video 2 cột, Pull-to-refresh
│   │   ├── SearchScreen.tsx      # Tìm kiếm Debounce, lọc Hashtag, tìm Tác giả & Video đã thích
│   │   ├── VideoWatchingScreen.tsx # Xem video thực toàn màn hình, Thả tim, Lưu, Bình luận, Chia sẻ
│   │   ├── CreateVideoScreen.tsx # Quay video, chọn bộ lọc, chọn nhạc, tải file .MP4 từ máy tính
│   │   ├── PostVideoScreen.tsx   # Xem trước video thực, nhập tiêu đề/hashtag & xuất bản lên MongoDB
│   │   ├── MyProfileScreen.tsx   # Hồ sơ cá nhân, thống kê, danh sách video Đã đăng / Đã thích / Đã lưu
│   │   ├── EditProfileScreen.tsx # Chỉnh sửa hồ sơ (khóa Email, validate SĐT 10 số, đổi Avatar)
│   │   ├── NotificationsScreen.tsx # Danh sách thông báo + Optimistic markAsRead
│   │   ├── LoginScreen.tsx       # Đăng nhập tài khoản + nút chọn nhanh tài khoản Demo
│   │   ├── RegisterScreen.tsx    # Đăng ký tài khoản mới lưu vào MongoDB
│   │   ├── CreatorProfileScreen.tsx # Trang cá nhân của nhà sáng tạo khác
│   │   ├── FollowListScreen.tsx  # Quản lý Đang theo dõi / Người theo dõi / Gợi ý kết bạn
│   │   └── LiveStreamScreen.tsx  # Phòng phát trực tiếp & gắn giỏ hàng thương mại điện tử
│   ├── services/                 # Tầng nghiệp vụ: authService, userService, videoService, commentService, notificationService
│   ├── storage/                  # Tầng lưu trữ: storage.ts (saveJSON/loadJSON), authStorage.ts
│   ├── store/                    # Custom hooks: useAuth, useWishlist, useNotifications
│   ├── types/                    # Định nghĩa TypeScript Interfaces
│   └── utils/                    # Tiện ích: validators.ts, dialog.ts, format.ts
└── App.tsx                       # Entry point của ứng dụng
```

---

## 3. CÁC BƯỚC KHỞI CHẠY HỆ THỐNG (BACKEND MONGODB + FRONTEND EXPO)

### Bước 1: Cài đặt thư viện (nếu chạy lần đầu)
```bash
cd "d:\nam 4\Mobile\Prj"
npm install
```

### Bước 2: Khởi động Backend Server + MongoDB (Terminal 1)
Mở một cửa sổ Terminal tại thư mục dự án và chạy:
```bash
npm run api
# hoặc: node server/index.js
```
- Server sẽ kết nối tới `mongodb://127.0.0.1:27017/video_sharing_db` và lắng nghe tại `http://localhost:3000`.
- Lần đầu khởi chạy, hệ thống tự động nạp dữ liệu mẫu (Seed) gồm 7 video `.mp4` thực tế, 8 nhà sáng tạo, bình luận và thông báo vào MongoDB.

### Bước 3: Khởi động Ứng dụng Frontend (Terminal 2)
Mở cửa sổ Terminal thứ hai và chọn cách chạy phù hợp:

1. **Chạy trên Trình duyệt Web (Khuyến nghị để Demo & Chấm bài):**
   ```bash
   npm run web
   # hoặc: npx expo start --web
   ```
   Mở trình duyệt tại `http://localhost:8081`.

2. **Chạy trên Điện thoại thật qua Expo Go:**
   - Nếu cùng mạng Wi-Fi LAN:
     ```bash
     npx expo start
     ```
   - Nếu khác mạng hoặc mạng trường chặn LAN, dùng chế độ Tunnel (không cần đăng nhập nếu đã chạy `npx expo start --offline` hoặc đăng nhập tài khoản Expo):
     ```bash
     npm run tunnel
     ```

---

## 4. TÀI KHOẢN DEMO CÓ SẴN TRONG MONGODB
Bạn có thể đăng nhập bằng 1 cú nhấp chuột ngay tại màn hình **Đăng nhập (`LoginScreen`)** hoặc nhập:
- **Tài khoản 1:** Email: `demo@vclip.vn` | Mật khẩu: `123456` (Nguyễn Minh Khôi - SĐT: `0901234567`)
- **Tài khoản 2:** Email: `demo@bookstore.vn` | Mật khẩu: `123456` (Trần Thu Hoài - SĐT: `0912345678`)
- Hoặc vào màn hình **Đăng ký (`RegisterScreen`)** để tạo tài khoản mới bất kỳ.

---

## 5. KỊCH BẢN KIỂM THỬ CÁC TÍNH NĂNG QUAN TRỌNG (TEST CHECKLIST)

1. **Kiểm tra Video thực (.MP4 HD):**
   - Nhấn vào bất kỳ video nào ở Trang chủ hoặc Tìm kiếm -> Video `.mp4` thực phát mượt mà kèm âm thanh và thanh tiến trình chạy theo thời gian thực.
2. **Kiểm tra Đăng tải Video mới thành công:**
   - Nhấn tab **Đăng tải (+)** ở giữa thanh điều hướng dưới cùng.
   - Bấm **"Tải file MP4"** (để chọn một file `.mp4` thực từ máy tính của bạn tải lên `server/uploads/`) hoặc bấm **"Tiếp tục →"** để chọn kho video mẫu HD.
   - Nhập tiêu đề, mô tả, chọn chủ đề, thêm `#hashtag` và nhấn **"Đăng tải lên hệ thống"**.
   - Video mới lập tức được lưu vào MongoDB, phát ngay trên màn hình và xuất hiện ở đầu Trang chủ & mục **"Đã đăng"** trong Hồ sơ cá nhân.
3. **Kiểm tra KHÔNG BỊ RESET KHI NHẤN F5 (Tải lại trang):**
   - Thực hiện: **Thả tim (♥)** một video, **Lưu (Bookmark)** một video, **Bình luận + chấm 5 sao (★)** vào một video, **Theo dõi (+)** một tác giả, **Chỉnh sửa hồ sơ cá nhân**, và **Đăng tải một video mới**.
   - Nhấn phím **F5** (Reload trình duyệt): Toàn bộ trạng thái đăng nhập, số lượt thích, danh sách video đã thích/đã lưu, bình luận vừa viết, trạng thái theo dõi, thông tin hồ sơ mới và video vừa đăng đều được giữ nguyên 100% nhờ đồng bộ hai chiều **MongoDB + AsyncStorage (`usePersistence` / `useAutoPersist`)**.
4. **Kiểm tra Đăng nhập / Đăng ký / Đăng xuất & Chỉnh sửa Hồ sơ:**
   - Vào tab **Cá nhân** -> Nhấn **Chỉnh sửa hồ sơ**: Ô Email bị khóa không cho sửa, thử nhập số điện thoại sai định dạng để kiểm tra báo lỗi đỏ, sau đó sửa Họ tên + SĐT hợp lệ và nhấn **Lưu thay đổi**.
   - Nhấn **Đăng xuất** -> Hộp thoại xác nhận xuất hiện -> Chuyển về giao diện Khách -> Nhấn **Đăng nhập ngay** để đăng nhập lại.
5. **Kiểm tra Thông báo (`NotificationsScreen`):**
   - Nhấn biểu tượng 🔔 trên thanh Header (hiển thị số lượng thông báo chưa đọc).
   - Nhấn vào một thông báo chưa đọc (nền tím nhạt, có chấm đỏ) -> Thông báo lập tức chuyển sang trạng thái đã đọc (`PATCH /api/notifications/:id`) và điều hướng tới đúng video hoặc trang tác giả tương ứng.
