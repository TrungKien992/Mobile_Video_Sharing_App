import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoPlayer } from '../components/VideoPlayer';
import { FloatingHeart } from '../components/FloatingHeart';
import { useApp } from '../context/AppContext';
import { confirmDialog, showMessage } from '../utils/dialog';
import { formatNumber, formatPrice } from '../utils/format';

interface LiveMessage {
  id: string;
  sender: string;
  avatar: string;
  text: string;
}

export const LiveStreamScreen: React.FC<{ videoId: string }> = ({ videoId }) => {
  const { videos, currentUser, goBack } = useApp();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 20 : Math.max(20, insets.top + 8);
  const bottomInset = Platform.OS === 'web' ? 0 : insets.bottom;
  const liveVideo =
    videos.find((v) => v.id === videoId) ||
    videos.find((v) => v.isLive) ||
    videos[0];

  const chatScrollRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);
  const [hearts, setHearts] = useState<{ id: string; color: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Theo dõi chiều cao bàn phím để đẩy ô bình luận, khung chat & thẻ sản phẩm lên trên bàn phím
  useEffect(() => {
    const onShow = (e: any) => {
      const h = e?.endCoordinates?.height;
      if (h) setKeyboardHeight(h);
    };
    const onHide = () => setKeyboardHeight(0);

    const s1 = Keyboard.addListener('keyboardWillShow', onShow);
    const s2 = Keyboard.addListener('keyboardDidShow', onShow);
    const h1 = Keyboard.addListener('keyboardWillHide', onHide);
    const h2 = Keyboard.addListener('keyboardDidHide', onHide);
    return () => {
      s1.remove();
      s2.remove();
      h1.remove();
      h2.remove();
    };
  }, []);

  // Khi bàn phím mở: thanh nhập nằm sát trên bàn phím (không cộng thêm safe-area đáy)
  const bottomBarOffset = keyboardHeight > 0 ? keyboardHeight + 8 : 14 + bottomInset;
  const chatOffset = bottomBarOffset + 56;
  const productOffset = Math.max(235 + bottomInset, chatOffset + 165);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    const timer = setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [liveMessages.length]);

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
    <KeyboardAvoidingView style={styles.container} enabled={false}>
      {/* 1. Video Player Live Stream */}
      <VideoPlayer
        videoUrl={liveVideo.videoUrl}
        thumbnailUrl={liveVideo.thumbnailUrl}
        isPlaying={true}
        isLooping={true}
        topSafeOffset={topInset}
        onDoubleTap={() => addReaction('#FF3366')}
      />

      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.4, 0.82]}
        style={styles.scrim}
        pointerEvents="none"
      />

      {/* 2. Top bar thông tin buổi Live */}
      <View style={[styles.topBar, { top: topInset }]}>
        <View style={styles.shopPill}>
          <Ionicons name="storefront" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.shopName}>{liveVideo.creator.displayName}</Text>
        </View>

        <View style={styles.topRight}>
          <View style={styles.viewerBadge}>
            <Ionicons name="people" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.viewerCount}>
              {formatNumber((liveVideo.liveViewerCount || 0) + 1)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={goBack}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Hiệu ứng Tim bay (Floating Hearts) */}
      {hearts.map((h) => (
        <FloatingHeart key={h.id} id={h.id} color={h.color} onComplete={removeHeart} />
      ))}

      {/* 4. Thẻ sản phẩm ghim mua ngay (Pinned Product Card) */}
      {keyboardHeight === 0 && (
      <View style={[styles.pinnedProductCard, { bottom: productOffset }]}>
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
              {liveVideo.liveProduct?.soldCount ?? 0} đã bán
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
      )}

      {/* 5. Bình luận trực tiếp nổi (Live Chat overlay mở rộng & tự cuộn) */}
      <View style={[styles.liveChatContainer, { bottom: chatOffset }]}>
        <ScrollView
          ref={chatScrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {liveMessages.map((msg) => {
            const isMyLiveMsg =
              msg.sender === (currentUser.displayName || 'Bạn') ||
              msg.sender === currentUser.name;
            return (
              <View key={msg.id} style={styles.chatBubble}>
                <Image source={{ uri: msg.avatar }} style={styles.chatAvatar} />
                <View style={styles.chatTextWrap}>
                  <Text style={styles.chatSender}>{msg.sender}</Text>
                  <Text style={styles.chatMessage}>{msg.text}</Text>
                </View>
                {isMyLiveMsg && (
                  <TouchableOpacity
                    onPress={() =>
                      setLiveMessages((prev) => prev.filter((m) => m.id !== msg.id))
                    }
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginLeft: 6, alignSelf: 'center', opacity: 0.75 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={13} color="#F87171" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* 6. Thanh nhập chat & nút thả reaction */}
      <View style={[styles.bottomBar, { bottom: bottomBarOffset }]}>
        <View style={styles.chatInputWrap}>
          <TextInput
            style={styles.chatInput}
            placeholder="Để lại bình luận..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={chatInput}
            onChangeText={setChatInput}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
          />
          {chatInput.trim().length > 0 && (
            <TouchableOpacity
              style={styles.sendChatBtn}
              onPress={handleSendMessage}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={15} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

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
    </KeyboardAvoidingView>
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
    bottom: 235,
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
    right: 76,
    maxHeight: 155,
    zIndex: 10,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    justifyContent: 'flex-end',
    paddingVertical: 4,
  },
  chatBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 5,
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
    maxWidth: 230,
  },
  chatSender: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  chatMessage: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
  },
  chatInputWrap: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 6,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  chatInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    height: '100%',
  },
  sendChatBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#5B4BFF',
    alignItems: 'center',
    justifyContent: 'center',
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
