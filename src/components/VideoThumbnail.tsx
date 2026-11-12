import React, { useEffect, useState } from 'react';
import {
  Image,
  ImageStyle,
  Platform,
  StyleProp,
  StyleSheet,
  View,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { resolveMediaUrl } from '../api/client';

interface VideoThumbnailProps {
  thumbnailUrl?: string;
  videoUrl?: string;
  style?: StyleProp<ImageStyle>;
}

const NativeVideoFirstFrame: React.FC<{
  videoUri: string;
  style?: StyleProp<ImageStyle>;
}> = ({ videoUri, style }) => {
  const [failed, setFailed] = useState(false);

  const player = useVideoPlayer(videoUri, (p) => {
    p.muted = true;
    p.loop = false;
    try {
      p.currentTime = 0.15;
      p.pause();
    } catch {}
  });

  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        try {
          player.muted = true;
          player.currentTime = 0.15;
          player.pause();
        } catch {}
      } else if (status === 'error') {
        setFailed(true);
      }
    });
    return () => sub.remove();
  }, [player]);

  if (failed) {
    return (
      <View style={[style, styles.fallbackBox]}>
        <Ionicons name="videocam-outline" size={28} color="#94A3B8" />
      </View>
    );
  }

  return (
    <View style={[style, styles.fallbackBox]} pointerEvents="none">
      <VideoView
        player={player}
        contentFit="cover"
        nativeControls={false}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
};

export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  thumbnailUrl,
  videoUrl,
  style,
}) => {
  const [thumbError, setThumbError] = useState(false);
  const cleanThumb = thumbnailUrl ? thumbnailUrl.trim() : '';
  const cleanVideo = videoUrl ? resolveMediaUrl(videoUrl.trim()) : '';

  useEffect(() => {
    setThumbError(false);
  }, [cleanThumb]);

  if (cleanThumb && !thumbError) {
    return (
      <Image
        source={{ uri: resolveMediaUrl(cleanThumb) }}
        style={style}
        resizeMode="cover"
        onError={() => setThumbError(true)}
      />
    );
  }

  if (Platform.OS === 'web' && cleanVideo) {
    const videoSrcWithTime = cleanVideo.includes('#t=')
      ? cleanVideo
      : `${cleanVideo}#t=0.15`;

    return (
      <View style={[style, styles.fallbackBox]}>
        {/* @ts-ignore */}
        <video
          src={videoSrcWithTime}
          muted
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          onLoadedMetadata={(e: any) => {
            try {
              const target = e.currentTarget as HTMLVideoElement;
              if (target) {
                target.muted = true;
                target.currentTime = Math.min(0.15, (target.duration || 1) * 0.1);
              }
            } catch {}
          }}
          onLoadedData={(e: any) => {
            try {
              const target = e.currentTarget as HTMLVideoElement;
              if (target) {
                target.pause();
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

  if (Platform.OS !== 'web' && cleanVideo) {
    return <NativeVideoFirstFrame videoUri={cleanVideo} style={style} />;
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
