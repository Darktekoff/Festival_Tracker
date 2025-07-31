import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GroupMember, UserStats } from '../../types';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '../../context/ThemeContext';
import { formatUnits } from '../../utils/calculations';
import { formatRelativeDate } from '../../utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { parseAvatarString } from '../../utils/iconMappings';

interface MemberCardProps {
  member: GroupMember;
  stats?: UserStats;
  onPress?: () => void;
  showRole?: boolean;
}

export function MemberCard({ 
  member, 
  stats, 
  onPress, 
  showRole = true 
}: MemberCardProps) {
  const { colors, theme } = useTheme();

  const getRoleColor = () => {
    switch (member.role) {
      case 'creator':
        return colors.primary;
      case 'admin':
        return colors.secondary;
      default:
        return colors.textLight;
    }
  };

  const getRoleIcon = () => {
    switch (member.role) {
      case 'creator':
        return 'star';
      case 'admin':
        return 'shield';
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    return member.isActive ? colors.success : colors.textLight;
  };

  const content = (
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Avatar
            avatarData={member.avatar ? parseAvatarString(member.avatar) : undefined}
            name={member.name}
            size="medium"
          />
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: getStatusColor() }
            ]}
          />
        </View>
        
        <View style={styles.memberInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]}>
              {member.name}
            </Text>
            {showRole && getRoleIcon() && (
              <Ionicons
                name={getRoleIcon()!}
                size={16}
                color={getRoleColor()}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
          
          <Text style={[styles.lastActive, { color: colors.textLight }]}>
            {member.isActive ? 'En ligne' : formatRelativeDate(member.lastActive)}
          </Text>
        </View>
      </View>

      {stats && (
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>
              Boissons
            </Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.totalDrinks}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>
              Unités
            </Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {formatUnits(stats.totalUnits)}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>
              Moyenne/j
            </Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatUnits(stats.averagePerDay)}
            </Text>
          </View>
          
          {stats.tricheCount > 0 && (
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>
                Triches
              </Text>
              <Text style={[styles.statValue, { color: '#FF9800' }]}>
                {stats.tricheCount} ⚡
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Card style={styles.card}>
          {content}
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Card style={styles.card}>
      {content}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8
  },
  content: {
    gap: 12
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarContainer: {
    position: 'relative'
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  name: {
    fontSize: 16,
    fontWeight: '500'
  },
  lastActive: {
    fontSize: 12,
    marginTop: 2
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  statItem: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 2
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600'
  }
});