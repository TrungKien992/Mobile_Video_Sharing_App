import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoPlayer } from '../components/VideoPlayer';
import { FloatingHeart } from '../components/FloatingHeart';
import { useApp } from '../context/AppContext';
import { confirmDialog, showMessage, showToast } from '../utils/dialog';
import { formatPrice } from '../utils/format';

interface LiveMessage {
  id: string;
  sender: string;
  avatar: string;
  text: string;
}

export const LiveStreamScreen: React.FC<{ videoId: string }> = ({ videoId }) => {
  const { videos, currentUser, goBack } = useApp();
  const liveVideo =
    videos.find((v) => v.id === videoId) ||
    videos.find((v) => v.isLive) ||
    videos[0];

  const [hearts, setHearts] = useState<{ id: string; color: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([
    {
      id: 'm1',
      sender: 'Jane',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
      text: 'Sản phẩm này có màu đen không shop?',
    },
    {
      id: 'm2',
      sender: 'Lauren',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
      text: 'Tôi muốn mua 1 cái cho cún cưng sinh nhật sắp tới, đặt thế nào ạ?',
    },
    {
      id: 'm3',
      sender: 'Minh',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      text: 'Shop giao hàng về Đà Nẵng mất mấy ngày vậy?',
    },
  ]);

  const addReaction = (color: string = '#FF2A6D') => {
    const newHeart = { id: 'heart_' + Date.now() + Math.random(), color };
    setHearts((prev) => [...prev, newHeart]);
  };

  const removeHeart = (id: string) => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMsg: LiveMessage = {
      id: 'msg_' + Date.now(),
      sender: currentUser.displayName || 'Bạn',
      avatar: currentUser.avatarUrl,
      text: chatInput.trim(),
    };
    setLiveMessages((prev) => [...prev, newMsg]);
    setChatInput('');
    addReaction('#FF3366');
    showToast('Đã gửi bình luận trực tiếp 💬', 'info');
  };

  const handleBuyLiveProduct = async () => {
    const prodName = liveVideo.liveProduct?.name || 'Bộ Mic Thu Âm Vlog Không Dây Pro';
    const prodPrice = formatPrice(liveVideo.liveProduct?.price || 450000);
    const ok = await confirmDialog(
      'Xác nhận đặt hàng nhanh 🛒',
      `Bạn muốn đặt mua sản phẩm "${prodName}" với giá ưu đãi Livestream là ${prodPrice}?`
    );
    if (ok) {
      showMessage(
        'Đặt hàng thành công! 🎉',
        `Đơn hàng "${prodName}" (${prodPrice}) đã được ghi nhận cho ${currentUser.displayName} (${currentUser.phone || '0901234567'}). Shop sẽ liên hệ giao hàng sớm nhất!`
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Video Player Live Stream */}
      <VideoPlayer
        videoUrl={liveVideo.videoUrl}
        thumbnailUrl={liveVideo.thumbnailUrl}
        isPlaying={true}
        isLooping={true}
      />

      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.8)']}
        locations={[0, 0.4, 0.85]}
        style={styles.scrim}
        pointerEvents="none"
      />

      {/* 2. Top bar thông tin buổi Live */}
      <View style={styles.topBar}>
        <View style={styles.shopPill}>
          <Ionicons name="storefront" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.shopName}>{liveVideo.creator.displayName}</Text>
        </View>

        <View style={styles.topRight}>
          <View style={styles.viewerBadge}>
            <Ionicons name="people" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.viewerCount}>
              {liveVideo.liveViewerCount ? `${(liveVideo.liveViewerCount / 1000).toFixed(1)}k` : '1.2k'}
            </Text>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={goBack} activeOpacity={0.8}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Hiệu ứng Tim bay (Floating Hearts) */}
      {hearts.map((h) => (
        <FloatingHeart key={h.id} id={h.id} color={h.color} onComplete={removeHeart} />
      ))}

      {/* 4. Thẻ sản phẩm ghim mua ngay (Pinned Product Card) */}
      <View style={styles.pinnedProductCard}>
        <Image
          source={{
            uri:
              liveVideo.liveProduct?.imageUrl ||
              'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=200',
          }}
          style={styles.productImg}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {liveVideo.liveProduct?.name || 'Bộ Mic Thu Âm Vlog Không Dây Pro'}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>
              {formatPrice(liveVideo.liveProduct?.price || 450000)}
            </Text>
            <Text style={styles.productSold}>
              {liveVideo.liveProduct?.soldCount || 340} đã bán
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.buyNowBtn}
          activeOpacity={0.8}
          onPress={handleBuyLiveProduct}
        >
          <Text style={styles.buyNowText}>Mua ngay</Text>
        </TouchableOpacity>
      </View>

      {/* 5. Bình luận trực tiếp nổi (Live Chat overlay) */}
      <View style={styles.liveChatContainer}>
        <ScrollView
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {liveMessages.map((msg) => (
            <View key={msg.id} style={styles.chatBubble}>
              <Image source={{ uri: msg.avatar }} style={styles.chatAvatar} />
              <View style={styles.chatTextWrap}>
                <Text style={styles.chatSender}>{msg.sender}</Text>
                <Text style={styles.chatMessage}>{msg.text}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 6. Thanh nhập chat & nút thả reaction */}
      <View style={styles.bottomBar}>
        <TextInput
          style={styles.chatInput}
          placeholder="Để lại bình luận..."
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={chatInput}
          onChangeText={setChatInput}
          onSubmitEditing={handleSendMessage}
        />

        <View style={styles.reactionsRow}>
          <TouchableOpacity
            style={styles.reactionBtn}
            onPress={() => addReaction('#3B82F6')}
            activeOpacity={0.7}
          >
            <Text style={styles.emojiText}>👍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.reactionBtn}
            onPress={() => addReaction('#FF2A6D')}
            activeOpacity={0.7}
          >
            <Text style={styles.emojiText}>❤️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.reactionBtn}
            onPress={() => addReaction('#F59E0B')}
            activeOpacity={0.7}
          >
            <Text style={styles.emojiText}>😆</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  shopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  shopName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  viewerCount: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedProductCard: {
    position: 'absolute',
    bottom: 150,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 15,
  },
  productImg: {
    width: 52,
    height: 52,
    borderRadius: 8,
    marginRight: 10,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FF2A6D',
  },
  productSold: {
    fontSize: 11,
    color: '#6B7280',
  },
  buyNowBtn: {
    backgroundColor: '#FF2A6D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  buyNowText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  liveChatContainer: {
    position: 'absolute',
    bottom: 70,
    left: 16,
    right: 80,
    maxHeight: 70,
    zIndex: 10,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    justifyContent: 'flex-end',
  },
  chatBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  chatAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 6,
    marginTop: 2,
  },
  chatTextWrap: {
    maxWidth: 220,
  },
  chatSender: {
    color: '#E5E7EB',
    fontSize: 11,
    fontWeight: '700',
  },
  chatMessage: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
  },
  chatInput: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 13,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  reactionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  reactionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  emojiText: {
    fontSize: 18,
  },
});
