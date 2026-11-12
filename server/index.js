const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Tự động đọc biến môi trường từ file .env (không cần cài thêm thư viện ngoài)
function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed
          .slice(eqIdx + 1)
          .trim()
          .replace(/^['"]|['"]$/g, '');
        if (key && !process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  } catch {}
}

loadEnvFile(path.join(__dirname, '..', '.env'));
loadEnvFile(path.join(__dirname, '.env'));

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/video_sharing_db';
const AUTH_SECRET = process.env.AUTH_SECRET || 'vclip_hmac_secret_key_2026';
let runtimeGeminiApiKey =
  process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '';
const DEFAULT_GEMINI_MODEL = process.env.AI_MODEL || 'gemini-3.8-flash';

// ============================================================================
// 0. BẢO MẬT: MÃ HÓA MẬT KHẨU (SCRYPT + SALT) & KÝ TOKEN (HMAC-SHA256)
// ============================================================================

function hashPassword(plainPassword) {
  const plain = String(plainPassword);
  if (plain.startsWith('scrypt$')) return plain;
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

function verifyPassword(plainPassword, storedPassword) {
  if (!storedPassword) return false;
  const plain = String(plainPassword);
  const stored = String(storedPassword);
  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const [, salt, hashHex] = parts;
    const derivedKey = crypto.scryptSync(plain, salt, 64);
    const storedBuf = Buffer.from(hashHex, 'hex');
    if (derivedKey.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(derivedKey, storedBuf);
  }
  return plain === stored;
}

function createAuthToken(userId) {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, iat: Date.now() })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payload)
    .digest('base64url');
  return `vclip_jwt.${payload}.${sig}`;
}

function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') return null;
  if (token.startsWith('vclip_jwt.')) {
    const [, payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expectedSig = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(payload)
      .digest('base64url');
    if (sig !== expectedSig) return null;
    try {
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      return decoded.sub || null;
    } catch {
      return null;
    }
  }
  // Tương thích ngược với token phiên cũ (vclip_jwt_<userId>_<ts> hoặc tk_<userId>)
  if (token.startsWith('vclip_jwt_')) {
    const raw = token.replace(/^vclip_jwt_/, '');
    const lastUnderscore = raw.lastIndexOf('_');
    return lastUnderscore > 0 ? raw.slice(0, lastUnderscore) : raw;
  }
  if (token.startsWith('tk_')) {
    return token.replace(/^tk_/, '');
  }
  return null;
}

function extractAuthUserId(req) {
  const authHeader = req.headers?.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    return verifyAuthToken(token);
  }
  return null;
}

// Đảm bảo thư mục lưu file upload tồn tại
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Phục vụ file tĩnh (video & ảnh người dùng tải lên) hỗ trợ tua video (Accept-Ranges)
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res) => {
    res.set('Accept-Ranges', 'bytes');
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

// Cấu hình Multer để nhận file video/ảnh thực từ người dùng
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    const safeName = 'media_' + Date.now() + '_' + Math.round(Math.random() * 1e6) + ext;
    cb(null, safeName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// ============================================================================
// 1. MONGOOSE SCHEMAS & MODELS
// ============================================================================

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  bio: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  followers: { type: [String], default: [] },
  following: { type: [String], default: [] },
  baseFollowersCount: { type: Number, default: 0 },
  baseLikesCount: { type: Number, default: 0 },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

const VideoSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  videoUrl: { type: String, required: true },
  thumbnailUrl: { type: String, default: '' },
  duration: { type: String, default: '00:20' },
  views: { type: Number, default: 0 },
  baseLikes: { type: Number, default: 0 },
  likedBy: { type: [String], default: [] },
  bookmarkedBy: { type: [String], default: [] },
  sharesCount: { type: Number, default: 0 },
  creatorId: { type: String, required: true },
  hashtags: { type: [String], default: [] },
  category: { type: String, default: 'trending' },
  music: {
    id: { type: String, default: 'm1' },
    title: { type: String, default: 'Âm thanh gốc' },
    artist: { type: String, default: 'VClip Creator' },
    duration: { type: String, default: '00:30' },
    audioUrl: { type: String, default: '' },
    coverUrl: { type: String, default: '' },
  },
  filter: { type: String, default: 'none' },
  privacy: { type: String, default: 'all' },
  commentsEnabled: { type: Boolean, default: true },
  isLive: { type: Boolean, default: false },
  liveViewerCount: { type: Number, default: 0 },
  liveProduct: {
    id: String,
    name: String,
    price: Number,
    currency: String,
    soldCount: Number,
    imageUrl: String,
  },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

const CommentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  videoId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userAvatar: { type: String, default: '' },
  rating: { type: Number, default: 5 },
  text: { type: String, required: true },
  baseLikes: { type: Number, default: 0 },
  likedBy: { type: [String], default: [] },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

const NotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() },
  target: {
    screen: { type: String, default: 'watch' },
    videoId: { type: String, default: '' },
    creatorId: { type: String, default: '' },
  },
});

const UserModel = mongoose.model('User', UserSchema);
const VideoModel = mongoose.model('Video', VideoSchema);
const CommentModel = mongoose.model('Comment', CommentSchema);
const NotificationModel = mongoose.model('Notification', NotificationSchema);

// ============================================================================
// 2. HÀM HELPER FORMAT DỮ LIỆU TRẢ VỀ CLIENT
// ============================================================================

async function buildUserLikesMap(videosList) {
  const docs = videosList || (await VideoModel.find({}, 'creatorId likedBy'));
  const userLikesMap = new Map();
  docs.forEach((v) => {
    const likesCount = Array.isArray(v.likedBy) ? v.likedBy.length : 0;
    userLikesMap.set(v.creatorId, (userLikesMap.get(v.creatorId) || 0) + likesCount);
  });
  return userLikesMap;
}

function formatUserResponse(userDoc, currentUserId, userLikesMap) {
  const u = userDoc.toObject ? userDoc.toObject() : userDoc;
  const followers = Array.isArray(u.followers) ? u.followers : [];
  const following = Array.isArray(u.following) ? u.following : [];
  return {
    id: u.id,
    name: u.name,
    displayName: u.name,
    username: u.username,
    email: u.email,
    phone: u.phone || '',
    bio: u.bio || '',
    avatarUrl: u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
    isVerified: !!u.isVerified,
    followersCount: followers.length,
    followingCount: following.length,
    likesCount: userLikesMap ? (userLikesMap.get(u.id) || 0) : 0,
    followingIds: following,
    followerIds: followers,
    isFollowed: currentUserId ? followers.includes(currentUserId) : false,
  };
}

async function formatVideoResponse(
  videoDoc,
  usersMap,
  commentsCountMap,
  currentUserId,
  userLikesMap
) {
  const v = videoDoc.toObject ? videoDoc.toObject() : videoDoc;
  const creatorDoc = usersMap.get(v.creatorId) || {
    id: v.creatorId,
    name: 'Nhà sáng tạo VClip',
    username: 'vclip_creator',
    email: 'creator@vclip.vn',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
    followers: [],
    following: [],
    baseFollowersCount: 0,
    baseLikesCount: 0,
  };
  const likedBy = Array.isArray(v.likedBy) ? v.likedBy : [];
  const bookmarkedBy = Array.isArray(v.bookmarkedBy) ? v.bookmarkedBy : [];
  const totalComments = commentsCountMap.get(v.id) ?? 0;

  return {
    id: v.id,
    title: v.title,
    description: v.description,
    videoUrl: v.videoUrl,
    thumbnailUrl: v.thumbnailUrl || '',
    duration: v.duration || '00:20',
    views: v.views || 0,
    likes: likedBy.length,
    commentsCount: totalComments,
    sharesCount: v.sharesCount || 0,
    creator: formatUserResponse(creatorDoc, currentUserId, userLikesMap),
    hashtags: v.hashtags || [],
    category: v.category || '',
    music: v.music || {
      id: 'none',
      title: 'Âm thanh gốc',
      artist: creatorDoc.name,
      duration: '00:20',
      audioUrl: '',
      coverUrl: creatorDoc.avatarUrl,
    },
    filter: v.filter || 'none',
    privacy: v.privacy || 'all',
    commentsEnabled: v.commentsEnabled !== false,
    isLive: !!v.isLive,
    liveViewerCount: v.liveViewerCount || 0,
    liveProduct: v.liveProduct || undefined,
    createdAt: v.createdAt,
    isLiked: currentUserId ? likedBy.includes(currentUserId) : false,
    isBookmarked: currentUserId ? bookmarkedBy.includes(currentUserId) : false,
  };
}

// ============================================================================
// 3. SEED DỮ LIỆU MẪU BAN ĐẦU VÀO MONGODB
// ============================================================================

async function seedDatabaseIfNeeded() {
  // Tự động kiểm tra nếu có video cũ dùng link googleapis bị chặn thì làm mới lại dữ liệu mẫu
  const brokenVideo = await VideoModel.findOne({ videoUrl: { $regex: 'commondatastorage.googleapis.com' } });
  if (brokenVideo) {
    console.log('[MongoDB] Phát hiện link video mẫu cũ, đang cập nhật sang luồng MP4 thực tế...');
    await Promise.all([
      UserModel.deleteMany({}),
      VideoModel.deleteMany({}),
      CommentModel.deleteMany({}),
      NotificationModel.deleteMany({}),
    ]);
  }

  const userCount = await UserModel.countDocuments();
  if (userCount > 0) {
    // Tự động nâng cấp mật khẩu plain-text cũ trong MongoDB sang dạng mã hóa scrypt + salt
    const existingUsers = await UserModel.find({});
    let migratedCount = 0;
    for (const u of existingUsers) {
      if (u.password && !String(u.password).startsWith('scrypt$')) {
        u.password = hashPassword(u.password);
        await u.save();
        migratedCount++;
      }
    }
    if (migratedCount > 0) {
      console.log(`[MongoDB] Đã mã hóa bảo mật (scrypt+salt) cho ${migratedCount} tài khoản hiện có.`);
    }

    // Đồng bộ bỏ các chỉ số ảo cũ trên dữ liệu mẫu nếu database đã từng seed trước đó
    const hasFakeVideo = await VideoModel.findOne({ baseLikes: { $gt: 0 } });
    const hasFakeUser = await UserModel.findOne({ baseFollowersCount: { $gt: 0 } });
    const hasFakeComment = await CommentModel.findOne({ baseLikes: { $gt: 0 } });
    if (hasFakeVideo || hasFakeUser || hasFakeComment) {
      await UserModel.updateMany({}, { $set: { baseFollowersCount: 0, baseLikesCount: 0 } });
      await VideoModel.updateMany(
        { id: { $in: ['vid_1', 'vid_2', 'vid_3', 'vid_4', 'vid_5', 'vid_6', 'vid_live_1'] } },
        { $set: { views: 0, baseLikes: 0, sharesCount: 0, liveViewerCount: 0 } }
      );
      await VideoModel.updateOne(
        { id: 'vid_live_1' },
        { $set: { 'liveProduct.soldCount': 0 } }
      );
      await CommentModel.updateMany({}, { $set: { baseLikes: 0 } });

      // Đảm bảo dữ liệu follow mẫu đối xứng 2 chiều giữa các user seed
      const symmetricFollowers = {
        user_demo: ['user_bookstore_demo', 'user_khanhvy', 'user_hoangnam', 'user_baongoc'],
        user_bookstore_demo: [],
        user_khanhvy: ['user_demo', 'user_bookstore_demo', 'user_bepnhame'],
        user_thucung: ['user_demo'],
        user_bepnhame: ['user_demo'],
        user_hoangnam: [],
        user_baongoc: [],
        user_vclipshop: [],
      };
      for (const [uid, fIds] of Object.entries(symmetricFollowers)) {
        await UserModel.updateOne({ id: uid }, { $set: { followers: fIds } });
      }
      console.log('[MongoDB] Đã chuẩn hóa số liệu thực tế (xóa số liệu ảo cũ).');
    }

    console.log(`[MongoDB] Đã có dữ liệu (${userCount} users). Giữ nguyên dữ liệu hiện tại.`);
    return;
  }

  console.log('[MongoDB] Đang khởi tạo dữ liệu mẫu ban đầu (Seed)...');

  const initialUsers = [
    {
      id: 'user_demo',
      name: 'Nguyễn Minh Khôi',
      username: 'minhkhoi_vn',
      email: 'demo@vclip.vn',
      password: '123456',
      phone: '0901234567',
      bio: 'Sáng tạo nội dung Du lịch, Công nghệ & Ẩm thực Việt Nam 🇻🇳✨',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
      isVerified: true,
      followers: ['user_bookstore_demo', 'user_khanhvy', 'user_hoangnam', 'user_baongoc'],
      following: ['user_khanhvy', 'user_bepnhame', 'user_thucung'],
      baseFollowersCount: 0,
      baseLikesCount: 0,
      createdAt: '2026-10-01T08:00:00.000Z',
    },
    {
      id: 'user_bookstore_demo',
      name: 'Trần Thu Hoài',
      username: 'thuhoai_official',
      email: 'demo@bookstore.vn',
      password: '123456',
      phone: '0912345678',
      bio: 'Yêu đọc sách, quay vlog đời sống & chia sẻ năng lượng tích cực 🌸📚',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
      isVerified: true,
      followers: [],
      following: ['user_demo', 'user_khanhvy'],
      baseFollowersCount: 0,
      baseLikesCount: 0,
      createdAt: '2026-10-02T08:00:00.000Z',
    },
    {
      id: 'user_khanhvy',
      name: 'Khánh Vy Travel',
      username: 'khanhvy_travel',
      email: 'khanhvy@vclip.vn',
      password: '123456',
      phone: '0987654321',
      bio: 'Khám phá 63 tỉnh thành Việt Nam & văn hóa thế giới ✈️🌏',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      isVerified: true,
      followers: ['user_demo', 'user_bookstore_demo', 'user_bepnhame'],
      following: ['user_demo'],
      baseFollowersCount: 0,
      baseLikesCount: 0,
      createdAt: '2026-10-03T08:00:00.000Z',
    },
    {
      id: 'user_thucung',
      name: 'Trạm Thú Cưng Sài Gòn',
      username: 'tramthucung_sg',
      email: 'thucung@vclip.vn',
      password: '123456',
      phone: '0933445566',
      bio: 'Chia sẻ khoảnh khắc đáng yêu của các boss Corgi, Golden & Mèo Anh 🐶🐱',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
      isVerified: true,
      followers: ['user_demo'],
      following: [],
      baseFollowersCount: 0,
      baseLikesCount: 0,
      createdAt: '2026-10-04T08:00:00.000Z',
    },
    {
      id: 'user_bepnhame',
      name: 'Bếp Nhà Mẹ Nấu',
      username: 'bepnhame_vn',
      email: 'bepnhame@vclip.vn',
      password: '123456',
      phone: '0977889900',
      bio: 'Công thức nấu ăn gia đình Việt chuẩn vị trong 60 giây 🍜🥘',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
      isVerified: true,
      followers: ['user_demo'],
      following: ['user_khanhvy'],
      baseFollowersCount: 0,
      baseLikesCount: 0,
      createdAt: '2026-10-05T08:00:00.000Z',
    },
    {
      id: 'user_hoangnam',
      name: 'Hoàng Nam Tech & Xe',
      username: 'hoangnam_auto',
      email: 'hoangnam@vclip.vn',
      password: '123456',
      phone: '0966554433',
      bio: 'Đánh giá xe, hành trình phượt xuyên Việt & đồ chơi công nghệ 🚙⚡',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      isVerified: false,
      followers: [],
      following: ['user_demo'],
      baseFollowersCount: 0,
      baseLikesCount: 0,
      createdAt: '2026-10-06T08:00:00.000Z',
    },
    {
      id: 'user_baongoc',
      name: 'Bảo Ngọc Dance Studio',
      username: 'baongoc_dance',
      email: 'baongoc@vclip.vn',
      password: '123456',
      phone: '0944112233',
      bio: 'Biên đạo nhảy hiện đại & xu hướng âm nhạc trẻ 💃🎶',
      avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80',
      isVerified: true,
      followers: [],
      following: ['user_demo'],
      baseFollowersCount: 0,
      baseLikesCount: 0,
      createdAt: '2026-10-07T08:00:00.000Z',
    },
    {
      id: 'user_vclipshop',
      name: 'VClip Live Mall',
      username: 'vclip_mall',
      email: 'shop@vclip.vn',
      password: '123456',
      phone: '0909998877',
      bio: 'Kênh Livestream săn deal công nghệ & phụ kiện chính hãng mỗi tối 🔥🛒',
      avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
      isVerified: true,
      followers: [],
      following: [],
      baseFollowersCount: 0,
      baseLikesCount: 0,
      createdAt: '2026-10-08T08:00:00.000Z',
    },
  ];

  // Các luồng video MP4 thực tế (200 OK, tốc độ cao, chạy mượt trên cả Web HTML5 và Mobile)
  const initialVideos = [
    {
      id: 'vid_1',
      title: 'Khám phá đại dương xanh & Rùa biển quý hiếm dưới làn nước trong vắt',
      description: 'Thước phim quay cận cảnh chú rùa biển bơi lội tự do giữa lòng đại dương xanh thẳm tuyệt đẹp 🐢🌊',
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto,w_720/sea_turtle.mp4',
      thumbnailUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto,w_600/sea_turtle.jpg',
      duration: '00:14',
      views: 0,
      baseLikes: 0,
      likedBy: ['user_demo'],
      bookmarkedBy: ['user_demo'],
      sharesCount: 0,
      creatorId: 'user_khanhvy',
      hashtags: ['dulichbien', 'daiduong', 'thiennhien', 'khampha'],
      category: 'travel',
      music: {
        id: 'm1',
        title: 'Giai Điệu Đại Dương - Ocean Chill',
        artist: 'Khánh Vy Travel',
        duration: '00:30',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&auto=format&fit=crop&q=80',
      },
      createdAt: '2026-11-09T10:30:00.000Z',
    },
    {
      id: 'vid_2',
      title: 'Chú cún cưng nô đùa ngoài bãi biển đầy nắng và gió',
      description: 'Mỗi lần được dẫn đi dạo biển là chạy nhảy tung tăng không biết mệt luôn 🐶❤️',
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto,w_720/dog.mp4',
      thumbnailUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto,w_600/dog.jpg',
      duration: '00:13',
      views: 0,
      baseLikes: 0,
      likedBy: [],
      bookmarkedBy: [],
      sharesCount: 0,
      creatorId: 'user_thucung',
      hashtags: ['thucung', 'cuncon', 'doglover', 'vuinhon'],
      category: 'pets',
      music: {
        id: 'm2',
        title: 'Sunny Puppy Walk',
        artist: 'Happy Pets Audio',
        duration: '00:45',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        coverUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=200&auto=format&fit=crop&q=80',
      },
      createdAt: '2026-11-09T14:15:00.000Z',
    },
    {
      id: 'vid_3',
      title: 'Khoảnh khắc hoa nở rực rỡ dưới nắng mai (Timelapse HD)',
      description: 'Ngắm nhìn từng cánh hoa bung nở đón sương sớm mang lại cảm giác thư thái, bình yên cho tâm hồn 🌸✨',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=600&auto=format&fit=crop&q=80',
      duration: '00:06',
      views: 0,
      baseLikes: 0,
      likedBy: ['user_demo'],
      bookmarkedBy: [],
      sharesCount: 0,
      creatorId: 'user_bepnhame',
      hashtags: ['hoano', 'timelapse', 'thugiancuoituan', 'thiennhien'],
      category: 'lifestyle',
      music: {
        id: 'm3',
        title: 'Morning Coffee Acoustic',
        artist: 'Lo-Fi Kitchen',
        duration: '00:30',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        coverUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200&auto=format&fit=crop&q=80',
      },
      createdAt: '2026-11-09T18:00:00.000Z',
    },
    {
      id: 'vid_4',
      title: 'Màn trình diễn trượt ván đường phố cực đỉnh (Street Skateboarding)',
      description: 'Những cú bật nhảy kỹ thuật và tốc độ đầy năng lượng của các vận động viên trẻ 🛹🔥',
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto,w_720/skate.mp4',
      thumbnailUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto,w_600/skate.jpg',
      duration: '00:16',
      views: 0,
      baseLikes: 0,
      likedBy: [],
      bookmarkedBy: ['user_demo'],
      sharesCount: 0,
      creatorId: 'user_hoangnam',
      hashtags: ['thethao', 'skateboard', 'duongpho', 'nangluong'],
      category: 'sports',
      music: {
        id: 'm4',
        title: 'Street Energy Beats',
        artist: 'Electro Drive',
        duration: '00:40',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        coverUrl: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=200&auto=format&fit=crop&q=80',
      },
      createdAt: '2026-11-10T06:20:00.000Z',
    },
    {
      id: 'vid_5',
      title: 'Đàn ngựa phi nước đại giữa thảo nguyên tuyết trắng hùng vĩ',
      description: 'Khung cảnh mùa đông tuyệt đẹp với đàn ngựa hoang dã tung vó trên cánh đồng tuyết trắng xóa 🐎❄️',
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto,w_720/snow_horses.mp4',
      thumbnailUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto,w_600/snow_horses.jpg',
      duration: '00:18',
      views: 0,
      baseLikes: 0,
      likedBy: [],
      bookmarkedBy: [],
      sharesCount: 0,
      creatorId: 'user_demo',
      hashtags: ['muadong', 'thaonguyen', 'dulich', 'vlog'],
      category: 'travel',
      music: {
        id: 'm5',
        title: 'Winter Wind Symphony',
        artist: 'Minh Khôi Acoustic',
        duration: '00:30',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        coverUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=200&auto=format&fit=crop&q=80',
      },
      createdAt: '2026-11-10T08:45:00.000Z',
    },
    {
      id: 'vid_6',
      title: 'Phim Hoạt Hình 3D Ngắn: Chú Thỏ Khổng Lồ Big Buck Bunny',
      description: 'Tác phẩm hoạt hình mã nguồn mở nổi tiếng với chất lượng đồ họa 3D sống động và hài hước 🐰🎬',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80',
      duration: '00:10',
      views: 0,
      baseLikes: 0,
      likedBy: [],
      bookmarkedBy: [],
      sharesCount: 0,
      creatorId: 'user_baongoc',
      hashtags: ['animation3d', 'giaitri', 'bunny', 'phimngan'],
      category: 'art',
      music: {
        id: 'm6',
        title: 'Orchestra Fantasy',
        artist: 'Blender Studio',
        duration: '01:00',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        coverUrl: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=200&auto=format&fit=crop&q=80',
      },
      createdAt: '2026-11-10T09:30:00.000Z',
    },
    {
      id: 'vid_live_1',
      title: '[LIVE] Khám Phá Thế Giới Động Vật Hoang Dã Châu Phi & Săn Quà Tặng',
      description: 'Phát trực tiếp hành trình safari ngắm nhìn đàn voi châu Phi và giao lưu tặng phụ kiện quay phim!',
      videoUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto,w_720/elephants.mp4',
      thumbnailUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto,w_600/elephants.jpg',
      duration: 'LIVE',
      views: 0,
      baseLikes: 0,
      likedBy: [],
      bookmarkedBy: [],
      sharesCount: 0,
      creatorId: 'user_vclipshop',
      hashtags: ['livestream', 'vclipmall', 'safari', 'sandeal'],
      category: 'streaming',
      isLive: true,
      liveViewerCount: 0,
      liveProduct: {
        id: 'prod_mic_vclip',
        name: 'Bộ Mic Thu Âm Vlog Không Dây Pro',
        price: 450000,
        currency: 'đ',
        soldCount: 0,
        imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=200&auto=format&fit=crop&q=80',
      },
      createdAt: '2026-11-10T11:00:00.000Z',
    },
  ];

  const initialComments = [
    {
      id: 'cmt_1',
      videoId: 'vid_1',
      userId: 'user_thucung',
      userName: 'Trạm Thú Cưng Sài Gòn',
      userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
      rating: 5,
      text: 'Góc quay flycam mượt và màu phim đẹp xuất sắc luôn bạn ơi! 🌄👏',
      baseLikes: 0,
      likedBy: ['user_demo'],
      createdAt: '2026-11-10T09:10:00.000Z',
    },
    {
      id: 'cmt_2',
      videoId: 'vid_1',
      userId: 'user_bepnhame',
      userName: 'Bếp Nhà Mẹ Nấu',
      userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
      rating: 5,
      text: 'Xem xong chỉ muốn xách balo lên đi du lịch ngay lập tức ❤️',
      baseLikes: 0,
      likedBy: [],
      createdAt: '2026-11-10T10:05:00.000Z',
    },
    {
      id: 'cmt_3',
      videoId: 'vid_2',
      userId: 'user_khanhvy',
      userName: 'Khánh Vy Travel',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      rating: 5,
      text: 'Hai cái chân ngắn cũn cỡn chạy nhìn cưng xỉu luôn á 😂🐶',
      baseLikes: 0,
      likedBy: ['user_demo'],
      createdAt: '2026-11-10T10:40:00.000Z',
    },
    {
      id: 'cmt_4',
      videoId: 'vid_3',
      userId: 'user_demo',
      userName: 'Nguyễn Minh Khôi',
      userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
      rating: 5,
      text: 'Đã làm thử theo công thức của kênh và thành công ngay lần đầu! Cảm ơn Bếp Nhà Mẹ.',
      baseLikes: 0,
      likedBy: [],
      createdAt: '2026-11-10T11:15:00.000Z',
    },
  ];

  const initialNotifications = [
    {
      id: 'notif_1',
      userId: 'user_demo',
      title: 'Khánh Vy Travel đã bắt đầu theo dõi bạn 👋',
      body: 'Hãy ghé thăm trang cá nhân của Khánh Vy để xem các video du lịch mới nhất.',
      read: false,
      createdAt: '2026-11-10T10:30:00.000Z',
      target: { screen: 'creator_profile', creatorId: 'user_khanhvy', videoId: '' },
    },
    {
      id: 'notif_2',
      userId: 'user_demo',
      title: 'Video của bạn vừa đạt mốc 88.000 lượt xem 🎉',
      body: '"Vlog Cuối Tuần: Dạo phố Sài Gòn" đang nhận được rất nhiều yêu thích từ cộng đồng.',
      read: false,
      createdAt: '2026-11-10T09:15:00.000Z',
      target: { screen: 'watch', videoId: 'vid_5', creatorId: '' },
    },
    {
      id: 'notif_3',
      userId: 'user_demo',
      title: 'Trạm Thú Cưng Sài Gòn đã đăng video mới 🐶',
      body: 'Boss Corgi và buổi chiều dạo chơi công viên cực nhắng nhít.',
      read: true,
      createdAt: '2026-11-09T14:20:00.000Z',
      target: { screen: 'watch', videoId: 'vid_2', creatorId: '' },
    },
  ];

  const hashedUsers = initialUsers.map((u) => ({
    ...u,
    password: hashPassword(u.password),
  }));

  await UserModel.insertMany(hashedUsers);
  await VideoModel.insertMany(initialVideos);
  await CommentModel.insertMany(initialComments);
  await NotificationModel.insertMany(initialNotifications);

  console.log('[MongoDB] Khởi tạo dữ liệu mẫu thành công (mật khẩu đã mã hóa scrypt+salt)!');
}

// ============================================================================
// 4. API ROUTES
// ============================================================================

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    dbName: 'video_sharing_db',
  });
});

// ----------------------------------------------------------------------------
// 4.1. AUTHENTICATION (Đăng nhập / Đăng ký có mã hóa mật khẩu scrypt + HMAC JWT)
// ----------------------------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ email và mật khẩu' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const user = await UserModel.findOne({ email: cleanEmail });

    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // Nếu mật khẩu cũ chưa mã hóa thì tự động nâng cấp lên scrypt
    if (!String(user.password).startsWith('scrypt$')) {
      user.password = hashPassword(password);
      await user.save();
    }

    const token = createAuthToken(user.id);
    return res.json({
      user: formatUserResponse(user, user.id),
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ khi đăng nhập' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có tối thiểu 6 ký tự' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await UserModel.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ message: 'Email này đã được đăng ký' });
    }

    const newId = 'user_' + Date.now();
    const username = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '') + '_' + Math.floor(Math.random() * 100);

    const newUser = await UserModel.create({
      id: newId,
      name: String(name).trim(),
      username,
      email: cleanEmail,
      password: hashPassword(password),
      phone: phone ? String(phone).trim() : '',
      bio: 'Thành viên mới của cộng đồng sáng tạo VClip ✨',
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80`,
      isVerified: false,
      followers: [],
      following: [],
      baseFollowersCount: 0,
      baseLikesCount: 0,
      createdAt: new Date().toISOString(),
    });

    // Tạo thông báo chào mừng
    await NotificationModel.create({
      id: 'notif_' + Date.now(),
      userId: newId,
      title: 'Chào mừng bạn đến với VClip! 🎉',
      body: 'Khám phá hàng ngàn video thú vị hoặc đăng tải video đầu tiên của bạn ngay hôm nay.',
      read: false,
      createdAt: new Date().toISOString(),
      target: { screen: 'watch', videoId: 'vid_1', creatorId: '' },
    });

    const token = createAuthToken(newUser.id);
    return res.status(201).json({
      user: formatUserResponse(newUser, newUser.id),
      token,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ khi đăng ký tài khoản' });
  }
});

// ----------------------------------------------------------------------------
// 4.2. USERS & PROFILE & FOLLOW (Tham khảo Buổi 9 BT9.4 PATCH /users/:id)
// ----------------------------------------------------------------------------
app.get('/api/users', async (req, res) => {
  try {
    const currentUserId = req.query.currentUserId || '';
    const [users, userLikesMap] = await Promise.all([
      UserModel.find({}),
      buildUserLikesMap(),
    ]);
    return res.json(users.map((u) => formatUserResponse(u, currentUserId, userLikesMap)));
  } catch (err) {
    return res.status(500).json({ message: 'Không thể tải danh sách người dùng' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const currentUserId = req.query.currentUserId || '';
    const [user, userLikesMap] = await Promise.all([
      UserModel.findOne({ id: req.params.id }),
      buildUserLikesMap(),
    ]);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    return res.json(formatUserResponse(user, currentUserId, userLikesMap));
  } catch (err) {
    return res.status(500).json({ message: 'Lỗi tải thông tin người dùng' });
  }
});

// PATCH /api/users/:id - Cập nhật Họ tên, Username, Số điện thoại, Bio, Avatar (Chuẩn BT9.4)
app.patch('/api/users/:id', async (req, res) => {
  try {
    const { name, displayName, username, phone, bio, avatarUrl } = req.body;
    const user = await UserModel.findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản để cập nhật' });
    }

    const nextName = (typeof name === 'string' && name.trim()) ? name.trim() : (typeof displayName === 'string' && displayName.trim() ? displayName.trim() : '');
    if (nextName) user.name = nextName;
    if (typeof username === 'string' && username.trim()) {
      user.username = username.trim().replace(/^@/, '');
    }
    if (typeof phone === 'string') user.phone = phone.trim();
    if (typeof bio === 'string') user.bio = bio.trim();
    if (typeof avatarUrl === 'string' && avatarUrl.trim()) user.avatarUrl = avatarUrl.trim();

    await user.save();

    // Đồng bộ tên và avatar mới trong các bình luận của user này
    await CommentModel.updateMany(
      { userId: user.id },
      { $set: { userName: user.name, userAvatar: user.avatarUrl } }
    );

    return res.json(formatUserResponse(user, user.id));
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ message: 'Không thể cập nhật hồ sơ' });
  }
});

// POST /api/users/:id/follow - Toggle Theo dõi / Hủy theo dõi (Lưu bền vững vào MongoDB)
app.post('/api/users/:id/follow', async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { currentUserId } = req.body;
    if (!currentUserId) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập để theo dõi' });
    }
    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: 'Không thể tự theo dõi chính mình' });
    }

    const [targetUser, currentUser] = await Promise.all([
      UserModel.findOne({ id: targetUserId }),
      UserModel.findOne({ id: currentUserId }),
    ]);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const isCurrentlyFollowing = targetUser.followers.includes(currentUserId);
    let isFollowed = false;

    if (isCurrentlyFollowing) {
      targetUser.followers = targetUser.followers.filter((id) => id !== currentUserId);
      currentUser.following = currentUser.following.filter((id) => id !== targetUserId);
      isFollowed = false;
    } else {
      if (!targetUser.followers.includes(currentUserId)) {
        targetUser.followers.push(currentUserId);
      }
      if (!currentUser.following.includes(targetUserId)) {
        currentUser.following.push(targetUserId);
      }
      isFollowed = true;

      // Tạo thông báo khi có người theo dõi mới
      await NotificationModel.create({
        id: 'notif_' + Date.now(),
        userId: targetUserId,
        title: `${currentUser.name} đã bắt đầu theo dõi bạn 👋`,
        body: `Nhấn để xem trang cá nhân của ${currentUser.name}.`,
        read: false,
        createdAt: new Date().toISOString(),
        target: { screen: 'creator_profile', creatorId: currentUserId, videoId: '' },
      });
    }

    await Promise.all([targetUser.save(), currentUser.save()]);
    const userLikesMap = await buildUserLikesMap();

    return res.json({
      isFollowed,
      targetUser: formatUserResponse(targetUser, currentUserId, userLikesMap),
      currentUser: formatUserResponse(currentUser, currentUserId, userLikesMap),
      followedUserIds: currentUser.following,
    });
  } catch (err) {
    console.error('Follow error:', err);
    return res.status(500).json({ message: 'Lỗi khi thực hiện theo dõi' });
  }
});

// ----------------------------------------------------------------------------
// 4.3. UPLOAD FILE VIDEO / ẢNH THỰC LÊN SERVER
// ----------------------------------------------------------------------------
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Không nhận được file tải lên' });
    }
    const protocol = req.protocol;
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    return res.status(201).json({
      url: fileUrl,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ message: 'Lỗi khi tải file lên máy chủ' });
  }
});

// ----------------------------------------------------------------------------
// 4.4. VIDEOS (Lấy danh sách, Đăng video mới, Like, Bookmark, Tăng View)
// ----------------------------------------------------------------------------
app.get('/api/videos', async (req, res) => {
  try {
    const currentUserId = req.query.currentUserId || extractAuthUserId(req) || '';
    const page = Number(req.query.page) || 0;
    const limit = Number(req.query.limit) || 0;

    let videoQuery = VideoModel.find({}).sort({ createdAt: -1 });
    if (page > 0 && limit > 0) {
      videoQuery = videoQuery.skip((page - 1) * limit).limit(limit);
    }

    const [videos, users, comments] = await Promise.all([
      videoQuery,
      UserModel.find({}),
      CommentModel.find({}),
    ]);

    const usersMap = new Map();
    users.forEach((u) => usersMap.set(u.id, u));

    const commentsCountMap = new Map();
    comments.forEach((c) => {
      commentsCountMap.set(c.videoId, (commentsCountMap.get(c.videoId) || 0) + 1);
    });

    const userLikesMap = await buildUserLikesMap();

    const formatted = await Promise.all(
      videos.map((v) =>
        formatVideoResponse(v, usersMap, commentsCountMap, currentUserId, userLikesMap)
      )
    );

    return res.json(formatted);
  } catch (err) {
    console.error('Get videos error:', err);
    return res.status(500).json({ message: 'Không thể tải danh sách video' });
  }
});

// POST /api/videos/:id/view - Tăng lượt xem video thực tế khi người dùng mở xem
app.post('/api/videos/:id/view', async (req, res) => {
  try {
    const videoId = req.params.id;
    const video = await VideoModel.findOneAndUpdate(
      { id: videoId },
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!video) {
      return res.status(404).json({ message: 'Không tìm thấy video' });
    }
    return res.json({ videoId: video.id, views: video.views });
  } catch (err) {
    return res.status(500).json({ message: 'Không thể cập nhật lượt xem' });
  }
});

// POST /api/videos - Người dùng đăng video mới (Lưu vào MongoDB)
app.post('/api/videos', async (req, res) => {
  try {
    const {
      title,
      description,
      videoUrl,
      thumbnailUrl,
      duration,
      creatorId,
      hashtags,
      category,
      music,
      filter,
      privacy,
      commentsEnabled,
    } = req.body;

    if (!title || ! String(title).trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập tiêu đề video' });
    }
    if (!videoUrl || !String(videoUrl).trim()) {
      return res.status(400).json({ message: 'Vui lòng chọn hoặc nhập đường dẫn video' });
    }

    const activeCreatorId = creatorId || 'user_demo';
    const creator = await UserModel.findOne({ id: activeCreatorId });
    const resolvedMusic =
      music && music.id === 'none'
        ? {
            id: 'none',
            title: 'Âm thanh gốc',
            artist: creator ? creator.name : 'Nhà sáng tạo',
            duration: duration || '00:15',
            audioUrl: '',
            coverUrl: creator ? creator.avatarUrl : '',
          }
        : music || {
            id: 'none',
            title: 'Âm thanh gốc',
            artist: creator ? creator.name : 'Nhà sáng tạo',
            duration: duration || '00:15',
            audioUrl: '',
            coverUrl: creator ? creator.avatarUrl : '',
          };

    const newVideoDoc = await VideoModel.create({
      id: 'vid_' + Date.now(),
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      videoUrl: String(videoUrl).trim(),
      thumbnailUrl:
        thumbnailUrl && String(thumbnailUrl).trim() ? String(thumbnailUrl).trim() : '',
      duration: duration || '00:15',
      views: 0,
      baseLikes: 0,
      likedBy: [],
      bookmarkedBy: [],
      sharesCount: 0,
      creatorId: activeCreatorId,
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      category: category ? String(category).trim() : '',
      music: resolvedMusic,
      filter: filter || 'none',
      privacy: privacy || 'all',
      commentsEnabled: commentsEnabled !== false,
      isLive: false,
      createdAt: new Date().toISOString(),
    });

    // Tạo thông báo đăng thành công
    await NotificationModel.create({
      id: 'notif_' + Date.now(),
      userId: activeCreatorId,
      title: 'Đăng video thành công! 🎬',
      body: `Video "${newVideoDoc.title}" của bạn đã được đăng lên VClip.`,
      read: false,
      createdAt: new Date().toISOString(),
      target: { screen: 'watch', videoId: newVideoDoc.id, creatorId: '' },
    });

    const usersMap = new Map();
    if (creator) usersMap.set(creator.id, creator);
    const userLikesMap = await buildUserLikesMap();
    const formatted = await formatVideoResponse(
      newVideoDoc,
      usersMap,
      new Map(),
      activeCreatorId,
      userLikesMap
    );

    return res.status(201).json(formatted);
  } catch (err) {
    console.error('Create video error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ khi đăng video' });
  }
});

// DELETE /api/videos/:id - Xóa video của người dùng khỏi MongoDB
app.delete('/api/videos/:id', async (req, res) => {
  try {
    const videoId = req.params.id;
    await VideoModel.deleteOne({ id: videoId });
    await CommentModel.deleteMany({ videoId });
    return res.json({ deleted: true, id: videoId });
  } catch (err) {
    return res.status(500).json({ message: 'Không thể xóa video' });
  }
});

// POST /api/videos/:id/like - Toggle Yêu thích (Lưu vào MongoDB, F5 không mất)
app.post('/api/videos/:id/like', async (req, res) => {
  try {
    const videoId = req.params.id;
    const { userId } = req.body;
    if (!userId) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập để thả tim video' });
    }

    const video = await VideoModel.findOne({ id: videoId });
    if (!video) {
      return res.status(404).json({ message: 'Không tìm thấy video' });
    }

    const index = video.likedBy.indexOf(userId);
    let isLiked = false;
    if (index >= 0) {
      video.likedBy.splice(index, 1);
      isLiked = false;
    } else {
      video.likedBy.push(userId);
      isLiked = true;
    }

    await video.save();

    // Lấy toàn bộ ID video mà user này đã like
    const allLikedVideos = await VideoModel.find({ likedBy: userId }).select('id');
    const likedVideoIds = allLikedVideos.map((v) => v.id);

    return res.json({
      videoId: video.id,
      isLiked,
      likes: video.likedBy.length,
      likedVideoIds,
    });
  } catch (err) {
    console.error('Like video error:', err);
    return res.status(500).json({ message: 'Lỗi khi cập nhật yêu thích' });
  }
});

// POST /api/videos/:id/bookmark - Toggle Lưu video (Lưu vào MongoDB, F5 không mất)
app.post('/api/videos/:id/bookmark', async (req, res) => {
  try {
    const videoId = req.params.id;
    const { userId } = req.body;
    if (!userId) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập để lưu video' });
    }

    const video = await VideoModel.findOne({ id: videoId });
    if (!video) {
      return res.status(404).json({ message: 'Không tìm thấy video' });
    }

    const index = video.bookmarkedBy.indexOf(userId);
    let isBookmarked = false;
    if (index >= 0) {
      video.bookmarkedBy.splice(index, 1);
      isBookmarked = false;
    } else {
      video.bookmarkedBy.push(userId);
      isBookmarked = true;
    }

    await video.save();

    const allBookmarkedVideos = await VideoModel.find({ bookmarkedBy: userId }).select('id');
    const bookmarkedVideoIds = allBookmarkedVideos.map((v) => v.id);

    return res.json({
      videoId: video.id,
      isBookmarked,
      bookmarkedVideoIds,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Lỗi khi lưu video' });
  }
});

// ----------------------------------------------------------------------------
// 4.5. COMMENTS & REVIEWS (Lưu vào MongoDB, F5 không mất - Tham khảo BT8.5)
// ----------------------------------------------------------------------------
app.get('/api/comments', async (req, res) => {
  try {
    const { videoId, currentUserId } = req.query;
    const filter = videoId ? { videoId: String(videoId) } : {};
    const comments = await CommentModel.find(filter).sort({ createdAt: -1 });

    const formatted = comments.map((c) => ({
      id: c.id,
      videoId: c.videoId,
      rating: c.rating || 5,
      text: c.text,
      createdAt: c.createdAt,
      likesCount: c.likedBy ? c.likedBy.length : 0,
      isLiked: currentUserId ? (c.likedBy || []).includes(String(currentUserId)) : false,
      user: {
        id: c.userId,
        name: c.userName,
        displayName: c.userName,
        username: c.userId.replace('user_', ''),
        email: '',
        avatarUrl:
          c.userAvatar ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
        followersCount: 0,
        followingCount: 0,
        likesCount: 0,
      },
    }));

    return res.json(formatted);
  } catch (err) {
    return res.status(500).json({ message: 'Không thể tải bình luận' });
  }
});

app.post('/api/comments', async (req, res) => {
  try {
    const { videoId, userId, text, rating } = req.body;
    if (!videoId || !userId || !text || !String(text).trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập nội dung bình luận' });
    }

    const user = await UserModel.findOne({ id: userId });
    const userName = user ? user.name : 'Người dùng VClip';
    const userAvatar = user
      ? user.avatarUrl
      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80';

    const created = await CommentModel.create({
      id: 'cmt_' + Date.now(),
      videoId: String(videoId),
      userId: String(userId),
      userName,
      userAvatar,
      rating: Number(rating) || 5,
      text: String(text).trim(),
      baseLikes: 0,
      likedBy: [],
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({
      id: created.id,
      videoId: created.videoId,
      rating: created.rating,
      text: created.text,
      createdAt: created.createdAt,
      likesCount: 0,
      isLiked: false,
      user: {
        id: userId,
        name: userName,
        displayName: userName,
        username: user ? user.username : 'user',
        email: user ? user.email : '',
        avatarUrl: userAvatar,
        followersCount: 0,
        followingCount: 0,
        likesCount: 0,
      },
    });
  } catch (err) {
    console.error('Add comment error:', err);
    return res.status(500).json({ message: 'Không thể gửi bình luận' });
  }
});

app.post('/api/comments/:id/like', async (req, res) => {
  try {
    const comment = await CommentModel.findOne({ id: req.params.id });
    if (!comment) {
      return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    }
    const userId = String(req.body.userId || 'guest');
    const idx = comment.likedBy.indexOf(userId);
    let isLiked = false;
    if (idx >= 0) {
      comment.likedBy.splice(idx, 1);
      isLiked = false;
    } else {
      comment.likedBy.push(userId);
      isLiked = true;
    }
    await comment.save();
    return res.json({
      id: comment.id,
      isLiked,
      likesCount: comment.likedBy ? comment.likedBy.length : 0,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Lỗi thích bình luận' });
  }
});

// DELETE /api/comments/:id - Xóa bình luận của bản thân
app.delete('/api/comments/:id', async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.body?.userId || req.query?.userId;
    const comment = await CommentModel.findOne({ id: commentId });
    if (!comment) {
      return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    }
    if (userId && comment.userId !== String(userId)) {
      return res.status(403).json({ message: 'Bạn chỉ có thể xóa bình luận của chính mình' });
    }
    await CommentModel.deleteOne({ id: commentId });
    return res.json({ deleted: true, id: commentId, videoId: comment.videoId });
  } catch (err) {
    console.error('Delete comment error:', err);
    return res.status(500).json({ message: 'Không thể xóa bình luận' });
  }
});

// ----------------------------------------------------------------------------
// 4.6. NOTIFICATIONS (Tham khảo Buổi 9 BT9.5)
// ----------------------------------------------------------------------------
app.get('/api/notifications', async (req, res) => {
  try {
    const userId = req.query.userId || 'user_demo';
    const list = await NotificationModel.find({ userId: String(userId) }).sort({ createdAt: -1 });
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: 'Không thể tải thông báo' });
  }
});

app.patch('/api/notifications/:id', async (req, res) => {
  try {
    const notif = await NotificationModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: { read: req.body.read !== false } },
      { new: true }
    );
    if (!notif) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }
    return res.json(notif);
  } catch (err) {
    return res.status(500).json({ message: 'Không thể cập nhật thông báo' });
  }
});

// ----------------------------------------------------------------------------
// 4.7. TÍCH HỢP GOOGLE FREE AI QUA BACKEND PROXY (Gemini Free API + Google GTX)
// ----------------------------------------------------------------------------

async function callGoogleTranslateFree(text, targetLang = 'vi') {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
      targetLang
    )}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0].map((part) => (Array.isArray(part) ? part[0] : '')).join('');
    }
    return null;
  } catch {
    return null;
  }
}

async function callGoogleSuggestFree(keyword) {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=vi&q=${encodeURIComponent(
      keyword
    )}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    if (Array.isArray(data) && Array.isArray(data[1])) {
      return data[1].slice(0, 6);
    }
    return [];
  } catch {
    return [];
  }
}

function getLatestApiKey(customApiKey) {
  if (customApiKey && String(customApiKey).trim()) {
    return String(customApiKey).trim();
  }
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^GEMINI_API_KEY=(.*)$/m);
      if (match && match[1].trim()) {
        runtimeGeminiApiKey = match[1].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  } catch {}
  return (runtimeGeminiApiKey || '').trim();
}

async function callGeminiFreeAPI(promptText, customApiKey) {
  const apiKey = getLatestApiKey(customApiKey);
  if (!apiKey) return null;

  const modelsToTry = [
    DEFAULT_GEMINI_MODEL,
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
  ];
  const uniqueModels = [...new Set(modelsToTry)];

  for (const modelName of uniqueModels) {
    const endpoints = apiKey.startsWith('AQ.')
      ? [
          `https://aiplatform.googleapis.com/v1/publishers/google/models/${modelName}:generateContent?key=${encodeURIComponent(
            apiKey
          )}`,
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
            apiKey
          )}`,
        ]
      : [
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
            apiKey
          )}`,
          `https://aiplatform.googleapis.com/v1/publishers/google/models/${modelName}:generateContent?key=${encodeURIComponent(
            apiKey
          )}`,
        ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: 0.75,
              maxOutputTokens: 700,
            },
          }),
        });

        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        const rawText =
          data?.candidates?.[0]?.content?.parts
            ?.map((p) => p.text || '')
            .join('')
            .trim() || '';
        if (rawText) {
          return { text: rawText, model: modelName };
        }
      } catch {}
    }
  }

  return null;
}

async function callFreeZeroKeyAIChat(systemPrompt, userQuestion, history = []) {
  try {
    const safeHistory = Array.isArray(history)
      ? history
          .slice(-6)
          .map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: String(m.content || ''),
          }))
          .filter((m) => m.content)
      : [];

    const response = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: systemPrompt },
          ...safeHistory,
          { role: 'user', content: userQuestion },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (reply) {
      return reply;
    }
    return null;
  } catch {
    return null;
  }
}

function buildSmartContextualChatReply({
  question,
  videoTitle,
  videoDescription,
  category,
  hashtags,
  creatorName,
  musicTitle,
  trendText = '',
}) {
  const q = String(question || '').trim();
  const qLower = q.toLowerCase();
  const creator = creatorName || 'nhà sáng tạo VClip';
  const tagsStr =
    Array.isArray(hashtags) && hashtags.length > 0
      ? hashtags.map((h) => '#' + h).join(' ')
      : '#vclip #xuhuong';

  if (
    /^(xin chào|chào|hi|hello|alo|ê|bạn là ai|ai vậy|có ai không)/i.test(qLower)
  ) {
    return `👋 Xin chào bạn! Mình là Trợ lý AI thông minh trên VClip ✨. Mình đang đồng hành cùng bạn xem video "${videoTitle}" của kênh @${creator}. Bạn có thể hỏi mình bất cứ câu hỏi nào về nội dung video, âm nhạc, cách làm, dịch thuật hoặc trò chuyện tự do nhé!`;
  }

  if (qLower.includes('tóm tắt') || qLower.includes('nội dung chính')) {
    return `📌 Tóm tắt nhanh: Video "${videoTitle}" của nhà sáng tạo ${creator} thuộc chủ đề ${
      category || 'Giải trí'
    }, truyền tải thông điệp: "${videoDescription}". Video sử dụng giai điệu "${
      musicTitle || 'Original Sound'
    }" tạo cảm giác rất cuốn hút người xem.${trendText}`;
  }

  if (qLower.includes('nhạc') || qLower.includes('bài hát') || qLower.includes('âm thanh')) {
    return `🎵 Video này đang sử dụng bản nhạc nền "${
      musicTitle || 'Âm thanh gốc VClip'
    }". Bạn có thể nhấn trực tiếp vào đĩa nhạc xoay góc dưới bên phải hoặc thanh tên bài hát để nghe thử và dùng ngay âm thanh này cho video của bạn!`;
  }

  if (qLower.includes('bình luận') || qLower.includes('comment')) {
    return `💬 Gợi ý 3 bình luận cực chất cho video của ${creator}:\n1. "Xem đi xem lại vẫn thấy cuốn, 10 điểm cho chất lượng video! 🔥"\n2. "Cho mình xin bí quyết quay góc đẹp như thế này với ạ ✨"\n3. "Nhạc hợp cảnh thực sự, thả tim mạnh cho kênh ❤️"`;
  }

  if (
    qLower.includes('ai quay') ||
    qLower.includes('tác giả') ||
    qLower.includes('chủ kênh') ||
    qLower.includes('của ai')
  ) {
    return `👤 Video "${videoTitle}" được đăng tải bởi nhà sáng tạo **${creator}** trong chuyên mục **${
      category || 'Giải trí'
    }**. Bạn có thể nhấn vào ảnh đại diện của ${creator} ở cột bên phải để xem toàn bộ các video khác trên kênh nhé!`;
  }

  if (
    qLower.includes('ở đâu') ||
    qLower.includes('địa điểm') ||
    qLower.includes('chỗ nào')
  ) {
    return `📍 Dựa trên mô tả "${videoDescription}" và các thẻ ${tagsStr}, bối cảnh trong video "${videoTitle}" được ghi hình theo phong cách ${
      category || 'đời thường'
    } rất tự nhiên. Bạn có thể để lại bình luận hỏi trực tiếp @${creator} tọa độ chi tiết nhé!`;
  }

  if (
    qLower.includes('cách làm') ||
    qLower.includes('làm sao') ||
    qLower.includes('bí quyết') ||
    qLower.includes('hướng dẫn')
  ) {
    return `💡 Về câu hỏi "${q}": Trong video "${videoTitle}", @${creator} tập trung vào điểm nhấn "${videoDescription}". Để thực hiện tương tự, bạn nên chú ý góc máy cận cảnh, ánh sáng tự nhiên và kết hợp nhịp cắt theo giai điệu "${
      musicTitle || 'Original Sound'
    }" sẽ tạo hiệu ứng thị giác tốt nhất!`;
  }

  if (qLower.includes('hashtag') || qLower.includes('thẻ')) {
    return `🏷️ Bộ hashtag đang được sử dụng trong video này gồm: ${tagsStr}.${trendText}`;
  }

  return `🤖 Trả lời câu hỏi "${q}" của bạn:\nLiên quan đến video "${videoTitle}" (${
    category || 'Giải trí'
  }) của @${creator}: Nội dung xoay quanh "${videoDescription}" kết hợp cùng âm thanh "${
    musicTitle || 'Original Sound'
  }".${trendText}\n\nBạn muốn mình phân tích sâu hơn chi tiết nào hay viết giúp bạn một bình luận thật ấn tượng về ý này không? ✨`;
}

function buildSmartVietnameseCaption({ topic, category, style }) {
  const cleanTopic = (topic || category || 'Khoảnh khắc đời thường').trim();
  const cat = category || 'Giải trí';

  const styleTemplates = {
    viral: {
      titles: [
        `🔥 Không thể rời mắt: ${cleanTopic} đang gây bão mạng xã hội!`,
        `✨ Góc nhìn cực đỉnh về ${cleanTopic} mà ai cũng nên xem 1 lần`,
        `💥 Trend mới siêu cuốn: ${cleanTopic} phiên bản HD cực nét!`,
      ],
      desc: `Cùng khám phá khoảnh khắc ${cleanTopic.toLowerCase()} đầy ấn tượng trên VClip! Đừng quên thả tim ❤️ và để lại bình luận cảm nhận của bạn nhé.`,
      tags: ['xuhuong', 'viral', 'vclip', 'trending', 'fyp'],
    },
    funny: {
      titles: [
        `😂 Cười xỉu với màn ${cleanTopic} bất ổn nhất hôm nay!`,
        `🤣 Tưởng không vui mà vui không tưởng: ${cleanTopic} cực hài!`,
        `😆 Khi bạn đam mê ${cleanTopic} nhưng vũ trụ lại trêu đùa!`,
      ],
      desc: `Xem đến giây cuối đảm bảo cười mệt nghỉ với pha ${cleanTopic.toLowerCase()} siêu lầy lội này! Tag ngay hội bạn thân vào xem chung nào 😂✨`,
      tags: ['haihuoc', 'vclip', 'giaitri', 'cuoixiu', 'genz'],
    },
    chill: {
      titles: [
        `🌿 Chút bình yên dịu dàng: ${cleanTopic} giữa ngày bộn bề ✨`,
        `🌅 Chữa lành tâm hồn cùng thước phim ${cleanTopic} cực chill`,
        `🍃 Dừng lại một nhịp để tận hưởng ${cleanTopic} thật trọn vẹn`,
      ],
      desc: `Một góc nhỏ bình yên dành cho những ai yêu thích ${cleanTopic.toLowerCase()}. Bật âm thanh lên và thư giãn cùng giai điệu nhẹ nhàng này nhé 🎶`,
      tags: ['chill', 'chualanh', 'vclip', 'doisong', 'aesthetic'],
    },
    review: {
      titles: [
        `📌 Đánh giá thực tế & trải nghiệm chi tiết: ${cleanTopic}`,
        `💡 Mẹo hay & Góc nhìn toàn diện về ${cleanTopic} bạn cần biết`,
        `⭐ Trải nghiệm thực tế ${cleanTopic}: Có thật sự đáng thử?`,
      ],
      desc: `Tổng hợp những điểm nổi bật nhất về ${cleanTopic.toLowerCase()} với chất lượng hình ảnh thực tế sắc nét. Lưu lại ngay để áp dụng khi cần nhé!`,
      tags: ['review', 'meohay', 'khampha', 'vclip', 'chiase'],
    },
  };

  const chosen = styleTemplates[style] || styleTemplates.viral;
  const randomTitle =
    chosen.titles[Math.floor(Math.random() * chosen.titles.length)];

  const categorySlug = cat
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');

  const topicSlug = cleanTopic
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .slice(0, 2)
    .join('');

  const finalTags = [
    ...new Set([
      ...(topicSlug ? [topicSlug] : []),
      ...(categorySlug ? [categorySlug] : []),
      ...chosen.tags,
    ]),
  ].slice(0, 6);

  return {
    title: randomTitle,
    description: chosen.desc,
    hashtags: finalTags,
  };
}

app.get('/api/ai/status', (_req, res) => {
  return res.json({
    enabled: true,
    hasApiKey: Boolean(runtimeGeminiApiKey),
    provider: runtimeGeminiApiKey
      ? `Google Gemini (${DEFAULT_GEMINI_MODEL})`
      : 'Google Free API (Suggest + Translate GTX + VClip Smart AI)',
    model: DEFAULT_GEMINI_MODEL,
  });
});

app.post('/api/ai/config', (req, res) => {
  const { apiKey } = req.body || {};
  runtimeGeminiApiKey = String(apiKey || '').trim();

  // Lưu vào file .env ở thư mục gốc để giữ nguyên khi khởi động lại server
  try {
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('GEMINI_API_KEY=')) {
        envContent = envContent.replace(
          /GEMINI_API_KEY=.*/g,
          `GEMINI_API_KEY=${runtimeGeminiApiKey}`
        );
      } else {
        envContent += `\nGEMINI_API_KEY=${runtimeGeminiApiKey}\n`;
      }
    } else {
      envContent = `PORT=3000\nMONGODB_URI=${MONGODB_URI}\nGEMINI_API_KEY=${runtimeGeminiApiKey}\nAI_MODEL=${DEFAULT_GEMINI_MODEL}\n`;
    }
    fs.writeFileSync(envPath, envContent, 'utf8');
  } catch {}

  return res.json({
    success: true,
    hasApiKey: Boolean(runtimeGeminiApiKey),
    provider: runtimeGeminiApiKey
      ? `Google Gemini (${DEFAULT_GEMINI_MODEL})`
      : 'Google Free API (Suggest + Translate GTX + VClip Smart AI)',
  });
});

app.post('/api/ai/generate-caption', async (req, res) => {
  try {
    const {
      topic = '',
      category = 'Giải trí',
      style = 'viral',
      apiKey,
    } = req.body || {};

    const styleDescMap = {
      viral: 'thu hút, bắt trend xu hướng TikTok/Reels, gây tò mò',
      funny: 'hài hước, dí dỏm, trẻ trung chuẩn GenZ',
      chill: 'nhẹ nhàng, cảm xúc, chữa lành, thơ mộng',
      review: 'chuyên nghiệp, đánh giá chi tiết, cung cấp thông tin hữu ích',
    };

    const prompt = `Bạn là trợ lý sáng tạo nội dung video ngắn trên ứng dụng VClip.
Hãy viết tiêu đề, mô tả và danh sách 5-6 hashtag (không có dấu # ở đầu mỗi phần tử mảng) bằng tiếng Việt cho video có:
- Chủ đề / Ý tưởng: "${topic || category}"
- Danh mục: "${category}"
- Phong cách: ${styleDescMap[style] || styleDescMap.viral}

Trả về đúng định dạng JSON thuần túy (không bọc markdown) theo mẫu:
{"title": "...", "description": "...", "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]}`;

    const geminiRes = await callGeminiFreeAPI(prompt, apiKey);
    if (geminiRes && geminiRes.text) {
      const cleaned = geminiRes.text
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        try {
          const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
          const cleanTags = Array.isArray(parsed.hashtags)
            ? parsed.hashtags.map((t) => String(t).replace(/^#/, '').trim()).filter(Boolean)
            : ['vclip', 'xuhuong'];
          return res.json({
            success: true,
            source: `Google Gemini (${geminiRes.model})`,
            title: parsed.title || `Khám phá ${topic || category} ✨`,
            description:
              parsed.description ||
              `Video chia sẻ khoảnh khắc ${topic || category} trên VClip!`,
            hashtags: cleanTags,
          });
        } catch {}
      }
    }

    // Kết hợp Google Suggest Free API để lấy từ khóa xu hướng thực tế từ Google
    const googleSuggestions = await callGoogleSuggestFree(topic || category);
    const smartResult = buildSmartVietnameseCaption({ topic, category, style });

    if (googleSuggestions.length > 0) {
      const extraTags = googleSuggestions
        .slice(0, 2)
        .map((s) =>
          String(s)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9]/g, '')
        )
        .filter((s) => s.length >= 3 && s.length <= 18);
      smartResult.hashtags = [
        ...new Set([...smartResult.hashtags, ...extraTags]),
      ].slice(0, 6);
    }

    return res.json({
      success: true,
      source: 'Google Free API (Google Suggest + VClip Smart AI)',
      ...smartResult,
    });
  } catch (err) {
    console.error('AI generate-caption error:', err);
    return res.status(500).json({ message: 'Không thể tạo gợi ý AI lúc này' });
  }
});

app.post('/api/ai/ask-video', async (req, res) => {
  try {
    const {
      videoTitle = '',
      videoDescription = '',
      category = '',
      hashtags = [],
      creatorName = '',
      musicTitle = '',
      question = 'Tóm tắt nội dung video này',
      history = [],
      apiKey,
    } = req.body || {};

    const historyContext =
      Array.isArray(history) && history.length > 0
        ? '\nLịch sử trò chuyện gần đây:\n' +
          history
            .slice(-6)
            .map((m) => `${m.role === 'assistant' ? 'AI' : 'Người xem'}: ${m.content}`)
            .join('\n')
        : '';

    const prompt = `Bạn là Trợ lý AI thông minh tích hợp trên ứng dụng video ngắn VClip.
Thông tin video người dùng đang xem:
- Tiêu đề: "${videoTitle}"
- Mô tả: "${videoDescription}"
- Danh mục: "${category}"
- Tác giả: "${creatorName}"
- Nhạc nền: "${musicTitle}"
- Hashtags: ${Array.isArray(hashtags) ? hashtags.map((h) => '#' + h).join(', ') : ''}${historyContext}

Tin nhắn / Câu hỏi hiện tại của người xem: "${question}"
Hãy trả lời trực tiếp, tự nhiên, thông minh, thân thiện bằng tiếng Việt và gợi ý 1 câu bình luận thú vị liên quan đến câu trả lời để người xem có thể đăng vào video.
Trả về JSON thuần túy theo mẫu:
{"answer": "...", "suggestedComment": "..."}`;

    const geminiRes = await callGeminiFreeAPI(prompt, apiKey);
    if (geminiRes && geminiRes.text) {
      const cleaned = geminiRes.text
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        try {
          const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
          return res.json({
            success: true,
            source: `Google Gemini (${geminiRes.model})`,
            answer: parsed.answer || geminiRes.text,
            suggestedComment:
              parsed.suggestedComment ||
              `Video "${videoTitle}" cuốn quá, thả tim cho kênh @${creatorName} nhé! ❤️🔥`,
          });
        } catch {}
      }
      return res.json({
        success: true,
        source: `Google Gemini (${geminiRes.model})`,
        answer: geminiRes.text,
        suggestedComment: `Nội dung của ${creatorName} đỉnh thật sự! ❤️✨`,
      });
    }

    // Nếu người dùng yêu cầu dịch sang tiếng Anh/ngôn ngữ khác -> Gọi trực tiếp Google Translate Free API (GTX)
    const qLower = String(question).toLowerCase();
    if (qLower.includes('dịch') || qLower.includes('tiếng anh') || qLower.includes('english')) {
      const translatedTitle = await callGoogleTranslateFree(videoTitle, 'en');
      const translatedDesc = await callGoogleTranslateFree(videoDescription, 'en');
      return res.json({
        success: true,
        source: 'Google Translate Free API (GTX)',
        answer: `🌐 Bản dịch tiếng Anh tự động từ Google:\n• Title: "${
          translatedTitle || videoTitle
        }"\n• Description: "${translatedDesc || videoDescription}"`,
        suggestedComment: `Awesome video by ${creatorName}! Love the vibe 🔥❤️`,
      });
    }

    // Gọi Free Zero-Key AI Chat Proxy để trả lời tự nhiên mọi câu hỏi chat trực tiếp
    const systemPrompt = `Bạn là Trợ lý AI thông minh trên ứng dụng xem video ngắn VClip. Người dùng đang xem video "${videoTitle}" của tác giả "${creatorName}", mô tả: "${videoDescription}", danh mục: "${category}", nhạc nền: "${musicTitle}". Hãy trả lời trực tiếp, ngắn gọn (2-4 câu), thân thiện bằng tiếng Việt cho bất kỳ câu hỏi hay tin nhắn trò chuyện nào của người dùng.`;
    const freeChatReply = await callFreeZeroKeyAIChat(systemPrompt, question, history);
    if (freeChatReply) {
      return res.json({
        success: true,
        source: 'Google & Open Free AI Chat Proxy',
        answer: freeChatReply,
        suggestedComment: `Video "${videoTitle}" của @${creatorName} chất lượng quá! Thả 5 sao ⭐❤️`,
      });
    }

    // Kết hợp Google Suggest Free API + phân tích ngữ cảnh câu hỏi trực tiếp
    const relatedTrends = await callGoogleSuggestFree(question || category || videoTitle);
    const trendText =
      relatedTrends.length > 0
        ? `\n🔥 Gợi ý tìm kiếm từ Google: ${relatedTrends.slice(0, 3).join(', ')}.`
        : '';

    const answer = buildSmartContextualChatReply({
      question,
      videoTitle,
      videoDescription,
      category,
      hashtags,
      creatorName,
      musicTitle,
      trendText,
    });

    return res.json({
      success: true,
      source: 'Google Free API (Suggest + GTX + VClip Smart Chat)',
      answer,
      suggestedComment: `Video "${videoTitle}" chất lượng quá ${creatorName} ơi! Thả 5 sao luôn ⭐❤️`,
    });
  } catch (err) {
    console.error('AI ask-video error:', err);
    return res.status(500).json({ message: 'Không thể kết nối trợ lý AI lúc này' });
  }
});

// ============================================================================
// 5. KẾT NỐI MONGODB & KHỞI CHẠY SERVER
// ============================================================================

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log(`✅ Đã kết nối MongoDB thành công tại: ${MONGODB_URI}`);
    await seedDatabaseIfNeeded();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 VClip Backend API đang chạy tại: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Lỗi kết nối MongoDB:', err.message);
    process.exit(1);
  });
