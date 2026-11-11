import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppNotification } from '../types';
import { useTheme } from '../context/ThemeContext';
import { formatDateTime } from '../utils/format';

interface NotificationItemProps {
  item: AppNotification;
  onPress: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  item,
  onPress,
}) => {
  const { theme } = useTheme();

  const getIconName = (): keyof typeof Feather.glyphMap => {
    switch (item.type) {
      case 'like':
        return 'heart';
      case 'comment':
        return 'message-circle';
      case 'follow':
        return 'user-plus';
      case 'upload':
        return 'video';
      default:
        return 'bell';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: item.read ? theme.surface : theme.primaryLight,
          borderColor: item.read ? theme.border : theme.primary,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: item.read ? theme.surfaceVariant : theme.primary },
        ]}
      >
        <Feather
          name={getIconName()}
          size={18}
          color={item.read ? theme.textSecondary : '#FFFFFF'}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              {
                color: theme.text,
                fontWeight: item.read ? '600' : '800',
              },
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.accent }]} />}
        </View>
        <Text style={[styles.body, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={[styles.time, { color: theme.textMuted }]}>
          {formatDateTime(item.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    flex: 1,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginLeft: 8,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  time: {
    fontSize: 11,
  },
});
