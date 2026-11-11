import { CommentItem } from '../types';
import { INITIAL_CREATORS, CURRENT_USER } from './initialCreators';

const creatorThuCung = INITIAL_CREATORS.find((c) => c.id === 'user_thucung') || CURRENT_USER;
const creatorBepNhaMe = INITIAL_CREATORS.find((c) => c.id === 'user_bepnhame') || CURRENT_USER;
const creatorKhanhVy = INITIAL_CREATORS.find((c) => c.id === 'user_khanhvy') || CURRENT_USER;

export const INITIAL_COMMENTS: CommentItem[] = [
  {
    id: 'cmt_1',
    videoId: 'vid_1',
    user: creatorThuCung,
    rating: 5,
    text: 'Góc quay dưới biển mượt và màu nước trong vắt đẹp xuất sắc luôn bạn ơi! 🐢🌊',
    createdAt: '2026-11-10T09:10:00.000Z',
    likesCount: 43,
    isLiked: true,
  },
  {
    id: 'cmt_2',
    videoId: 'vid_1',
    user: creatorBepNhaMe,
    rating: 5,
    text: 'Xem xong chỉ muốn xách balo lên đi biển ngay lập tức ❤️',
    createdAt: '2026-11-10T10:05:00.000Z',
    likesCount: 19,
    isLiked: false,
  },
  {
    id: 'cmt_3',
    videoId: 'vid_2',
    user: creatorKhanhVy,
    rating: 5,
    text: 'Chú cún chạy ngoài biển nhìn cưng xỉu luôn á 😂🐶',
    createdAt: '2026-11-10T10:40:00.000Z',
    likesCount: 86,
    isLiked: true,
  },
  {
    id: 'cmt_4',
    videoId: 'vid_3',
    user: CURRENT_USER,
    rating: 5,
    text: 'Cảnh hoa nở timelapse nhìn thư giãn thực sự, nhạc nền quá hợp!',
    createdAt: '2026-11-10T11:15:00.000Z',
    likesCount: 31,
    isLiked: false,
  },
];
