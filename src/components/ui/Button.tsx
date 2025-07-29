import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  icon,
  fullWidth = false,
  disabled = false,
  style,
  ...props
}: ButtonProps) {
  const { colors, theme } = useTheme();

  const handlePress = async () => {
    if (!disabled && !isLoading) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.md,
      ...(fullWidth && { width: '100%' })
    };

    // Padding selon la taille
    switch (size) {
      case 'small':
        baseStyle.paddingHorizontal = theme.spacing.sm;
        baseStyle.paddingVertical = theme.spacing.xs;
        break;
      case 'large':
        baseStyle.paddingHorizontal = theme.spacing.lg;
        baseStyle.paddingVertical = theme.spacing.md;
        break;
      default:
        baseStyle.paddingHorizontal = theme.spacing.md;
        baseStyle.paddingVertical = theme.spacing.sm;
    }

    // Couleurs selon la variante
    switch (variant) {
      case 'primary':
        baseStyle.backgroundColor = colors.primary;
        break;
      case 'secondary':
        baseStyle.backgroundColor = colors.secondary;
        break;
      case 'danger':
        baseStyle.backgroundColor = colors.danger;
        break;
      case 'success':
        baseStyle.backgroundColor = colors.success;
        break;
      case 'ghost':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = colors.border;
        break;
    }

    // États
    if (disabled || isLoading) {
      baseStyle.opacity = 0.6;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: '600',
      textAlign: 'center'
    };

    // Taille de police selon la taille du bouton
    switch (size) {
      case 'small':
        baseStyle.fontSize = theme.fonts.sizes.sm;
        break;
      case 'large':
        baseStyle.fontSize = theme.fonts.sizes.lg;
        break;
      default:
        baseStyle.fontSize = theme.fonts.sizes.md;
    }

    // Couleur du texte
    if (variant === 'ghost') {
      baseStyle.color = colors.primary;
    } else {
      baseStyle.color = '#ffffff';
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={handlePress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'ghost' ? colors.primary : '#ffffff'}
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={[getTextStyle(), icon && { marginLeft: theme.spacing.xs }]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}