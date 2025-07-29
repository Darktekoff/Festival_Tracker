import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = 'large',
  color,
  text,
  fullScreen = false
}: LoadingSpinnerProps) {
  const { colors, theme } = useTheme();

  const content = (
    <View style={styles.container}>
      <ActivityIndicator
        size={size}
        color={color || colors.primary}
      />
      {text && (
        <Text style={[styles.text, { color: colors.textLight, marginTop: theme.spacing.sm }]}>
          {text}
        </Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
        {content}
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: {
    fontSize: 16,
    textAlign: 'center'
  }
});