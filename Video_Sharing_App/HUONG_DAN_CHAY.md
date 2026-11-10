# HƯỚNG DẪN CÀI ĐẶT, KHÔI PHỤC CƠ SỞ DỮ LIỆU MONGODB & KHỞI CHẠY HỆ THỐNG VCLIP

> **Tài liệu nộp bài & Báo cáo:**
> - 📕 **File PDF chính thức:** `HUONG_DAN_CHAY_CHUONG_TRINH_VA_DB.pdf`
> - 📘 **File Word (`.docx`):** `HUONG_DAN_CHAY_CHUONG_TRINH_VA_DB.docx` (và `HUONG_DAN_CHAY_CHUONG_TRINH_VA_DB_BAN_CHUAN.docx`)

---

## PHẦN 1. YÊU CẦU MÔI TRƯỜNG & PHẦN MỀM CẦN CÀI ĐẶT

Trước khi chạy dự án, máy tính cần cài sẵn các công cụ tiêu chuẩn sau:

| STT | Phần mềm / Công cụ | Phiên bản khuyến nghị | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| 1 | **Node.js & npm** | v18.x trở lên (v20 / v22 / v24) | Môi trường chạy Backend Express API và Frontend Expo CLI |
| 2 | **MongoDB Community Server** | v6.0 / v7.0 / v8.0 | Hệ quản trị CSDL MongoDB chạy tại cổng mặc định `27017` |
| 3 | **MongoDB Compass & Tools** | Bản mới nhất | Giao diện quản lý trực quan DB hoặc công cụ dòng lệnh `mongorestore` |
| 4 | **Trình duyệt Web (Chrome / Edge)** | Bản mới nhất | Chạy và kiểm thử trực tiếp phiên bản Web & Responsive Mobile |
| 5 | **Ứng dụng Expo Go (Tùy chọn)** | Mới nhất trên iOS / Android | Quét mã QR để trải nghiệm ứng dụng trực tiếp trên điện thoại thật |

---

## PHẦN 2. CẤU TRÚC THƯ MỤC DỰ ÁN & DỮ LIỆU MẪU

Khi tải về hoặc giải nén mã nguồn dự án, cấu trúc thư mục bao gồm:

- `video_sharing_db/`: Thư mục chứa dữ liệu sao lưu của MongoDB (gồm cả file `.bson` và `.json`).
- `server/`: Mã nguồn Backend REST API (Node.js + Express + Mongoose + Multer).
- `server/uploads/`: Thư mục chứa các tệp video thực tế (`.mp4`) tải lên từ thiết bị.
- `src/`: Toàn bộ mã nguồn giao diện Frontend React Native / Expo đa nền tảng.
- `package.json`: Cấu hình danh sách thư viện và các câu lệnh khởi chạy tiện ích.

### Chi tiết dữ liệu mẫu trong thư mục `video_sharing_db/`

| Tên Collection | Tệp BSON (`mongorestore`) | Tệp JSON (Dùng cho Compass GUI) | Nội dung dữ liệu mẫu |
| :--- | :--- | :--- | :--- |
| `users` | `users.bson`, `users.metadata.json` | `users.json` | 8 tài khoản người dùng & Creators |
| `videos` | `videos.bson`, `videos.metadata.json` | `videos.json` | 8 video MP4 thực tế, hashtag, lượt tim, lượt lưu |
| `comments` | `comments.bson`, `comments.metadata.json` | `comments.json` | 5 bình luận tiếng Việt kèm đánh giá 1-5 sao |
| `notifications` | `notifications.bson`, `notifications.metadata.json` | `notifications.json` | 4 thông báo tương tác (thả tim, theo dõi, hệ thống) |

---

## PHẦN 3. HƯỚNG DẪN KHÔI PHỤC CƠ SỞ DỮ LIỆU MONGODB

> **Lưu ý:** Bạn chỉ cần chọn **MỘT trong 3 cách** dưới đây để nạp dữ liệu. Đảm bảo dịch vụ MongoDB Server đang hoạt động tại cổng `27017`.

### Cách 1: Khôi phục bằng lệnh `mongorestore` (Nhanh nhất - Khuyên dùng)

1. Mở Terminal hoặc Command Prompt / PowerShell tại thư mục gốc của dự án.
2. Chạy câu lệnh sau để khôi phục toàn bộ database `video_sharing_db`:
   ```powershell
   mongorestore --uri="mongodb://127.0.0.1:27017/video_sharing_db" --drop ./video_sharing_db
   ```
   *(Nếu chưa cấu hình PATH cho MongoDB Database Tools, bạn có thể trỏ trực tiếp tới `mongorestore.exe` trong thư mục cài đặt Tools)*:
   ```powershell
   & "C:\Program Files\MongoDB\Tools\100\bin\mongorestore.exe" --uri="mongodb://127.0.0.1:27017/video_sharing_db" --drop ./video_sharing_db
   ```

### Cách 2: Import bằng giao diện trực quan MongoDB Compass (Không cần dòng lệnh)

1. Mở ứng dụng **MongoDB Compass** và nhấn **Connect** vào `mongodb://127.0.0.1:27017`.
2. Nhấn dấu cộng (`+`) cạnh mục **Databases** -> Nhập Database Name: `video_sharing_db` và Collection đầu tiên: `users` -> Nhấn **Create Database**.
3. Tạo tiếp 3 collections còn lại: `videos`, `comments`, `notifications`.
4. Bấm vào từng collection -> Chọn **Add Data** -> **Import JSON or CSV file** -> Chọn file `.json` tương ứng trong thư mục `video_sharing_db/`:
   - Collection `users`: chọn `video_sharing_db/users.json` -> Nhấn **Import**
   - Collection `videos`: chọn `video_sharing_db/videos.json` -> Nhấn **Import**
   - Collection `comments`: chọn `video_sharing_db/comments.json` -> Nhấn **Import**
   - Collection `notifications`: chọn `video_sharing_db/notifications.json` -> Nhấn **Import**

### Cách 3: Cơ chế Tự động khởi tạo (Auto-Seed) tích hợp sẵn trong mã nguồn Backend

Nếu người cài đặt chưa cài MongoDB Tools hoặc chưa import thủ công: Trong `server/index.js` đã được lập trình sẵn hàm tự động kiểm tra. Ngay khi bạn khởi động Backend Server bằng lệnh `npm run api`, nếu database `video_sharing_db` chưa có dữ liệu, hệ thống sẽ **tự động khởi tạo và nạp đầy đủ 8 Users, 8 Videos thực tế, 5 Comments và 4 Notifications** vào MongoDB mà không cần thêm thao tác nào!

---

## PHẦN 4. HƯỚNG DẪN KHỞI CHẠY BACKEND SERVER (PORT 3000)

1. Mở cửa sổ Terminal thứ nhất tại thư mục dự án và cài đặt thư viện phụ thuộc (chỉ cần chạy lần đầu):
   ```powershell
   npm install
   ```
2. Khởi động Backend Server kết nối MongoDB:
   ```powershell
   npm run api
   ```
3. Quan sát thông báo kết nối thành công:
   ```text
   ✅ Đã kết nối thành công tới MongoDB: mongodb://127.0.0.1:27017/video_sharing_db
   🚀 Backend Server đang chạy tại: http://localhost:3000
   📡 API Healthcheck: http://localhost:3000/api/health
   ```

---

## PHẦN 5. HƯỚNG DẪN CHẠY FRONTEND ỨNG DỤNG (WEB & MOBILE)

Mở thêm một cửa sổ Terminal thứ 2 tại thư mục dự án:

### 1. Chạy trên Trình duyệt Web (Khuyên dùng khi chấm bài & thuyết trình)
```powershell
npm run web
```
- Ứng dụng sẽ tự động mở trên trình duyệt tại địa chỉ: `http://localhost:8081`

### 2. Chạy cả Backend + Web cùng lúc chỉ với 1 câu lệnh
```powershell
npm run dev
```

### 3. Chạy trên Điện thoại di động qua ứng dụng Expo Go
- **Cùng mạng Wi-Fi:** Chạy `npx expo start` rồi dùng Expo Go quét mã QR trên màn hình.
- **Khác mạng Wi-Fi / Mạng trường học:** Chạy chế độ xuyên tường lửa:
  ```powershell
  npm run tunnel
  ```

---

## PHẦN 6. TÀI KHOẢN DÙNG THỬ & KỊCH BẢN KIỂM THỬ

### Danh sách Tài khoản mẫu có sẵn trong Database

| Họ và tên hiển thị | Email đăng nhập | Username | Mật khẩu | Vai trò |
| :--- | :--- | :--- | :--- | :--- |
| **Kiên Vũ (Tài khoản chính)** | `kien@vclip.vn` | `kiendzvodich` | `123456` | Creator & User |
| **Pink Ka Official** | `pink.ka@vclip.vn` | `pink.ka` | `123456` | Travel Creator |
| **Chef Hoàng Long** | `chef.long@vclip.vn` | `chef.long` | `123456` | Food Creator |
| **Hà Fitness** | `fit.ha@vclip.vn` | `fit.ha` | `123456` | Gym & Health |
| **Minh Tech Lab** | `tech.minh@vclip.vn` | `tech.minh` | `123456` | Tech Reviewer |
| **Vy Dance Studio** | `dance.vy@vclip.vn` | `dance.vy` | `123456` | Choreographer |

### Kịch bản kiểm thử các chức năng chính khi báo cáo

1. **Xem Video thực tế:** Video MP4 tự động phát mượt mà, chuyển đổi các tab Đề xuất / Đang theo dõi, lọc theo hashtag (`#xuhuong`, `#amthuc`, `#congnghe`...).
2. **Kiểm thử F5 không bị mất dữ liệu:** Thử bấm Thả tim, Lưu video, Đánh giá bình luận 1-5 sao, hoặc bấm "+ Theo dõi". Sau đó nhấn phím F5 (Reload trang) -> Toàn bộ trạng thái được bảo lưu nguyên vẹn nhờ MongoDB.
3. **Đăng tải Video thực tế từ máy:** Bấm nút (+) -> Chọn file `.mp4` từ máy -> Nhập tiêu đề, hashtag -> Đăng tải. Video được upload lên `server/uploads/` và hiển thị ngay trên bảng tin.
4. **Quản lý Hồ sơ & Xóa bài:** Vào tab Hồ sơ -> Chỉnh sửa Tên, Bio, đổi Avatar -> Lưu. Tại danh sách video cá nhân, có thể xóa video đã đăng kèm hộp thoại xác nhận.
5. **Giao diện Thông báo & Popup Modal In-App:** Toàn bộ thông báo hệ thống được hiển thị bằng Popup Modal bo góc mượt mà và Toast banner phía trên màn hình.
