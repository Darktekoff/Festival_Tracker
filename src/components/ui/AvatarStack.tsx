import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar } from './Avatar';
import { useTheme } from '../../context/ThemeContext';
import { parseAvatarString } from '../../utils/iconMappings';

interface AvatarStackUser {
  id: string;
  name: string;
  avatar: string;
}

interface AvatarStackProps {
  users: AvatarStackUser[];
  maxVisible?: number;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  showCount?: boolean;
}

export function AvatarStack({ 
  users, 
  maxVisible = 3, 
  size = 'small', 
  onPress,
  showCount = true 
}: AvatarStackProps) {
  const { colors } = useTheme();

  if (users.length === 0) return null;

  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;

  const avatarSize = {
    small: 24,
    medium: 32,
    large: 40
  }[size];

  const fontSize = {
    small: 10,
    medium: 12,
    large: 14
  }[size];

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.avatarsContainer}>
        {visibleUsers.map((user, index) => (
          <View
            key={user.id}
            style={[
              styles.avatarWrapper,
              { 
                marginLeft: index > 0 ? -8 : 0,
                zIndex: visibleUsers.length - index
              }
            ]}
          >
            <Avatar
              avatarData={parseAvatarString(user.avatar)}
              name={user.name}
              size={size}
              style={[
                styles.avatar,
                { 
                  borderWidth: 2, 
                  borderColor: colors.background,
                  width: avatarSize,
                  height: avatarSize
                }
              ]}
            />
          </View>
        ))}
        
        {remainingCount > 0 && (
          <View
            style={[
              styles.remainingCount,
              {
                marginLeft: -8,
                backgroundColor: colors.textLight,
                borderColor: colors.background,
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
                zIndex: 0
              }
            ]}
          >
            <Text style={[styles.remainingText, { fontSize, color: colors.background }]}>
              +{remainingCount}
            </Text>
          </View>
        )}
      </View>

      {showCount && (
        <Text style={[styles.countText, { color: colors.textLight, fontSize }]}>
          {users.length} {users.length === 1 ? 'intéressé' : 'intéressés'}
        </Text>
      )}
    </Component>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarWrapper: {
    position: 'relative'
  },
  avatar: {
    // borderWidth et borderColor seront appliqués dynamiquement
  },
  remainingCount: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2
  },
  remainingText: {
    fontWeight: '600'
  },
  countText: {
    fontWeight: '500'
  }
});