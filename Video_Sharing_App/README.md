# VClip - Ứng Dụng Chia Sẻ Video Ngắn Đa Nền Tảng (Mobile & Web)

Dự án môn Lập trình Thiết bị Di động được xây dựng bằng **React Native (Expo SDK 58)**, **TypeScript**, kết hợp cùng Backend **Node.js + Express + MongoDB** (`mongodb://127.0.0.1:27017/video_sharing_db`).

---

## 🌟 Điểm Nổi Bật Của Dự Án
1. **Giao diện Tiếng Việt độc창 & Đa nền tảng (iOS, Android, Tablet, Web):**
   - Thiết kế hiện đại mang nhận diện thương hiệu **VClip** (Tím Indigo `#5B4BFF` & Hồng Coral `#FF3366`), hỗ trợ chuyển đổi **Light / Dark Mode** tức thì.
2. **100% Video Thực (.MP4 Streams) & Tải Video Thực Lên Server:**
   - Toàn bộ danh sách video đều là luồng `.mp4` thực tế độ phân giải HD.
   - Hỗ trợ chọn file `.mp4` trực tiếp từ máy tính/điện thoại tải lên máy chủ qua `Multer` (`POST /api/upload`) và xuất bản vào MongoDB (`POST /api/videos`).
3. **Không Bao Giờ Bị Reset Khi Nhấn F5 (Zero-Reset Persistence):**
   - Mọi thao tác **Thả tim (Like)**, **Lưu video (Bookmark)**, **Bình luận & Đánh giá sao**, **Theo dõi (Follow)**, **Đăng video mới**, **Chỉnh sửa hồ sơ** và **Phiên đăng nhập** đều được lưu trữ bền vững trong **MongoDB** và đồng bộ với **AsyncStorage** qua cơ chế Hydration flag (`ready`) chuẩn Bài Thực Hành Buổi 8 & Buổi 9.
4. **Đầy Đủ Các Chức Năng Theo Chuẩn Bài Thực Hành:**
   - **Xác thực:** Đăng nhập (`LoginScreen`), Đăng ký (`RegisterScreen`), Tự động đăng nhập (`authStorage`), Đăng xuất có hộp thoại xác nhận (`confirmDialog`).
   - **Quản lý Hồ sơ:** Chỉnh sửa hồ sơ (`EditProfileScreen` với trường Email khóa, kiểm tra SĐT 10 số `validatePhone`, chọn ảnh đại diện, gọi `PATCH /api/users/:id`).
   - **Tương tác & Khám phá:** Tìm kiếm có `useDebounce(300ms)`, Kéo để làm mới (`RefreshControl`), Đánh giá 1-5 sao (`RatingStars`), Thông báo thời gian thực (`NotificationsScreen` với Optimistic Update).

---

## 🚀 Cách Chạy Nhanh (Quick Start)

### 1. Chạy Backend API + MongoDB
```bash
npm run api
```
*(Server chạy tại `http://localhost:3000`, kết nối tới `mongodb://127.0.0.1:27017/video_sharing_db`).*

### 2. Chạy Ứng Dụng (Web / Mobile)
```bash
# Chạy trên trình duyệt Web:
npm run web

# Hoặc chạy cho thiết bị di động (Expo Go):
npx expo start
```

### 3. Tài Khoản Demo
- **Email:** `demo@vclip.vn` | **Mật khẩu:** `123456`
- **Email:** `demo@bookstore.vn` | **Mật khẩu:** `123456`

---

## 📂 Tài Liệu Bàn Giao Trong Dự Án
- [BAO_CAO_DU_AN_SDLC.md](./BAO_CAO_DU_AN_SDLC.md): Báo cáo tài liệu quy trình phát triển phần mềm SDLC đầy đủ 6 giai đoạn (SRS, SDS, UML, Testing, Deployment, Maintenance).
- [SLIDE_THUYET_TRINH.html](./SLIDE_THUYET_TRINH.html) & [SLIDE_THUYET_TRINH.md](./SLIDE_THUYET_TRINH.md): Bộ Slide thuyết trình nhóm.
- [KICH_BAN_VIDEO_DEMO.md](./KICH_BAN_VIDEO_DEMO.md): Kịch bản quay video demo 1-3 phút.
- [HUONG_DAN_CHAY_SOURCE.md](./HUONG_DAN_CHAY_SOURCE.md): Hướng dẫn cài đặt và kiểm thử chi tiết.
