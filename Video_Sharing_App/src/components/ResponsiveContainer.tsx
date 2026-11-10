import React from 'react';
import { View, StyleSheet, useWindowDimensions, Platform, StatusBar } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 480,
}) => {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isWebWide = Platform.OS === 'web' && width > 768;

  if (isWebWide) {
    return (
      <View style={[styles.webOuterContainer, { backgroundColor: '#111319' }]}>
        <View
          style={[
            styles.webFrame,
            {
              maxWidth,
              backgroundColor: theme.background,
              borderColor: theme.border,
            },
          ]}
        >
          {children}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.mobileContainer, { backgroundColor: theme.background }]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  webOuterContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webFrame: {
    width: '100%',
    height: '100%',
    maxHeight: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 10,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  mobileContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
