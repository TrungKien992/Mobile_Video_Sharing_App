import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWishlist } from '../store/hooks';
import { useTheme } from '../context/ThemeContext';

interface HeartButtonProps {
  videoId: string;
  size?: number;
  style?: ViewStyle;
}

export const HeartButton: React.FC<HeartButtonProps> = ({
  videoId,
  size = 20,
  style,
}) => {
  const { isFavorite, toggle } = useWishlist();
  const { theme } = useTheme();
  const liked = isFavorite(videoId);

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: liked ? theme.accentLight : 'rgba(15, 23, 42, 0.5)',
        },
        style,
      ]}
      onPress={(e) => {
        e.stopPropagation?.();
        toggle(videoId);
      }}
      activeOpacity={0.75}
    >
      <Ionicons
        name={liked ? 'heart' : 'heart-outline'}
        size={size}
        color={liked ? theme.accent : '#FFFFFF'}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
