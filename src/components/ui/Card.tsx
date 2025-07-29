import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export function Card({
  children,
  variant = 'default',
  padding = 'medium',
  style,
  ...props
}: CardProps) {
  const { colors, theme } = useTheme();

  const getPaddingStyle = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'small':
        return theme.spacing.sm;
      case 'large':
        return theme.spacing.lg;
      default:
        return theme.spacing.md;
    }
  };

  const getVariantStyle = () => {
    switch (variant) {
      case 'outlined':
        return {
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: 'transparent'
        };
      case 'elevated':
        return {
          backgroundColor: colors.surface,
          ...theme.shadows.medium
        };
      default:
        return {
          backgroundColor: colors.surface,
          ...theme.shadows.small
        };
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: theme.borderRadius.md,
          padding: getPaddingStyle()
        },
        getVariantStyle(),
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden'
  }
});