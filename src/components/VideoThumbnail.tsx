import React from 'react';
import {
  Image,
  ImageStyle,
  Platform,
  StyleProp,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resolveMediaUrl } from '../api/client';

interface VideoThumbnailProps {
  thumbnailUrl?: string;
  videoUrl?: string;
  style?: StyleProp<ImageStyle>;
}

export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  thumbnailUrl,
  videoUrl,
  style,
}) => {
  const cleanThumb = thumbnailUrl ? thumbnailUrl.trim() : '';
  const cleanVideo = videoUrl ? resolveMediaUrl(videoUrl.trim()) : '';

  if (cleanThumb) {
    return (
      <Image
        source={{ uri: resolveMediaUrl(cleanThumb) }}
        style={style}
        resizeMode="cover"
      />
    );
  }

  if (Platform.OS === 'web' && cleanVideo) {
    return (
      <View style={[style, styles.fallbackBox]}>
        {/* @ts-ignore */}
        <video
          src={cleanVideo}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={(e: any) => {
            try {
              const target = e.currentTarget as HTMLVideoElement;
              if (target && target.duration > 0.2) {
                target.currentTime = 0.2;
              }
            } catch {}
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
          }}
        />
      </View>
    );
  }

  return (
    <View style={[style, styles.fallbackBox]}>
      <Ionicons name="videocam-outline" size={28} color="#94A3B8" />
    </View>
  );
};

const styles = StyleSheet.create({
  fallbackBox: {
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

