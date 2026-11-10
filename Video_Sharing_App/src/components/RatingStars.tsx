import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface RatingStarsProps {
  value: number;
  size?: number;
  onChange?: (val: number) => void;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  value,
  size = 16,
  onChange,
}) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.row}>
      {stars.map((s) => {
        const filled = s <= Math.round(value);
        if (onChange) {
          return (
            <TouchableOpacity
              key={s}
              onPress={() => onChange(s)}
              activeOpacity={0.7}
              style={styles.starBtn}
            >
              <Text style={[styles.star, { fontSize: size, color: filled ? '#F59E0B' : '#CBD5E1' }]}>
                ★
              </Text>
            </TouchableOpacity>
          );
        }
        return (
          <Text
            key={s}
            style={[styles.star, { fontSize: size, color: filled ? '#F59E0B' : '#CBD5E1' }]}
          >
            ★
          </Text>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starBtn: {
    paddingHorizontal: 2,
  },
  star: {
    marginRight: 2,
  },
});
