import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { PrimaryButton } from './PrimaryButton';

interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorView: React.FC<ErrorViewProps> = ({ message, onRetry }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Feather name="alert-triangle" size={36} color={theme.danger} />
      <Text style={[styles.text, { color: theme.text }]}>{message}</Text>
      {onRetry && (
        <PrimaryButton title="Thử lại" onPress={onRetry} style={{ marginTop: 14 }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
});
