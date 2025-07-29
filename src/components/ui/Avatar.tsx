import React, { useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { AvatarData, convertEmojiToIcon, IconName } from '../../utils/iconMappings';

interface AvatarProps {
  emoji?: string;
  avatarData?: AvatarData; // Nouveau prop pour supporter emoji ou icône
  name?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  style?: ViewStyle;
  backgroundColor?: string;
}

export function Avatar({
  emoji,
  avatarData,
  name,
  size = 'medium',
  style,
  backgroundColor
}: AvatarProps) {
  const { colors, theme } = useTheme();
  const [imageError, setImageError] = useState(false);

  // Reset image error when avatarData changes
  React.useEffect(() => {
    if (avatarData?.type === 'photo') {
      setImageError(false);
    }
  }, [avatarData?.value]);

  const getSize = () => {
    switch (size) {
      case 'small':
        return 32;
      case 'large':
        return 56;
      case 'xlarge':
        return 80;
      default:
        return 40;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 28;
      case 'xlarge':
        return 40;
      default:
        return 20;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 18;
      case 'large':
        return 32;
      case 'xlarge':
        return 48;
      default:
        return 24;
    }
  };

  const getInitials = (name: string): string => {
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return words[0][0].toUpperCase() + words[1][0].toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const avatarSize = getSize();
  const fontSize = getFontSize();
  const iconSize = getIconSize();

  // Debug logs (commenté après fix)
  // console.log('Avatar - Props:', { avatarData, emoji, name, imageError });

  // Déterminer le contenu à afficher
  let content: React.ReactNode;
  let bgColor = backgroundColor || colors.primary;

  if (avatarData) {
    if (avatarData.type === 'photo' && !imageError) {
      // Afficher une photo
      content = (
        <Image
          source={{ uri: avatarData.value }}
          style={styles.image}
          onError={() => setImageError(true)}
        />
      );
      bgColor = 'transparent'; // Pas de fond pour les photos
    } else if (avatarData.type === 'icon' || (avatarData.type === 'photo' && imageError)) {
      // Afficher une icône (ou fallback si erreur photo)
      const iconData = avatarData.type === 'photo' ? { name: 'person' as IconName, color: colors.primary } : avatarData;
      bgColor = backgroundColor || iconData.color || colors.primary;
      const iconName = avatarData.type === 'photo' ? 'person' : (iconData as any).value;
      content = (
        <Ionicons 
          name={iconName as IconName} 
          size={iconSize} 
          color="#ffffff" 
        />
      );
    } else {
      // Afficher un emoji
      content = <Text style={[styles.text, { fontSize }]}>{avatarData.value}</Text>;
    }
  } else if (emoji) {
    // Compatibilité avec l'ancien système - convertir l'emoji en icône
    const converted = convertEmojiToIcon(emoji);
    if (converted.type === 'icon') {
      bgColor = backgroundColor || converted.color || colors.primary;
      content = (
        <Ionicons 
          name={converted.value as IconName} 
          size={iconSize} 
          color="#ffffff" 
        />
      );
    } else {
      content = <Text style={[styles.text, { fontSize }]}>{emoji}</Text>;
    }
  } else if (name) {
    // Afficher les initiales
    content = <Text style={[styles.text, { fontSize }]}>{getInitials(name)}</Text>;
  } else {
    // Afficher un placeholder
    content = <Text style={[styles.text, { fontSize }]}>?</Text>;
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
          backgroundColor: bgColor
        },
        style,
        avatarData?.type === 'photo' && !imageError && styles.photoContainer
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: {
    color: '#ffffff'
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 999
  },
  photoContainer: {
    overflow: 'hidden'
  }
});