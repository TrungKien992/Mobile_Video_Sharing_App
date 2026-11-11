import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FloatingHeartProps {
  id: string;
  color?: string;
  onComplete: (id: string) => void;
}

export const FloatingHeart: React.FC<FloatingHeartProps> = ({
  id,
  color = '#FF2A6D',
  onComplete,
}) => {
  const positionY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const positionX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const randomX = (Math.random() - 0.5) * 80;

    Animated.parallel([
      Animated.timing(positionY, {
        toValue: -280,
        duration: 1800,
        useNativeDriver: true,
      }),
      Animated.timing(positionX, {
        toValue: randomX,
        duration: 1800,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onComplete(id);
    });
  }, []);

  return (
    <Animated.View
      style={[
        styles.heartContainer,
        {
          opacity,
          transform: [
            { translateY: positionY },
            { translateX: positionX },
          ],
        },
      ]}
    >
      <Ionicons name="heart" size={28} color={color} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  heartContainer: {
    position: 'absolute',
    bottom: 80,
    right: 25,
    zIndex: 99,
  },
});
