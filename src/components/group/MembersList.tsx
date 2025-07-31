import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert
} from 'react-native';
import { GroupMember, UserStats } from '../../types';
import { MemberCard } from './MemberCard';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface MembersListProps {
  members: GroupMember[];
  memberStats: Map<string, UserStats>;
  currentUserId: string;
  isAdmin: boolean;
  onRemoveMember?: (memberId: string) => void;
  onMemberPress?: (memberId: string) => void;
}

export function MembersList({
  members,
  memberStats,
  currentUserId,
  isAdmin,
  onRemoveMember,
  onMemberPress
}: MembersListProps) {
  const { colors, theme } = useTheme();
  const [sortBy, setSortBy] = useState<'name' | 'activity' | 'drinks' | 'triches'>('name');

  const sortedMembers = [...members].sort((a, b) => {
    switch (sortBy) {
      case 'activity':
        return b.lastActive.getTime() - a.lastActive.getTime();
      case 'drinks':
        const aStats = memberStats.get(a.id);
        const bStats = memberStats.get(b.id);
        return (bStats?.totalDrinks || 0) - (aStats?.totalDrinks || 0);
      case 'triches':
        const aTricheStats = memberStats.get(a.id);
        const bTricheStats = memberStats.get(b.id);
        return (bTricheStats?.tricheCount || 0) - (aTricheStats?.tricheCount || 0);
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const handleRemoveMember = (member: GroupMember) => {
    if (!onRemoveMember || !isAdmin) return;

    Alert.alert(
      'Retirer le membre',
      `Êtes-vous sûr de vouloir retirer ${member.name} du groupe ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: () => onRemoveMember(member.id)
        }
      ]
    );
  };

  const renderMember = ({ item: member }: { item: GroupMember }) => {
    const stats = memberStats.get(member.id);
    const isCurrentUser = member.id === currentUserId;
    const canRemove = isAdmin && !isCurrentUser && member.role !== 'creator';

    return (
      <View style={styles.memberItem}>
        <MemberCard
          member={member}
          stats={stats}
          style={{ flex: 1 }}
          onPress={() => onMemberPress?.(member.id)}
        />
        
        {canRemove && (
          <TouchableOpacity
            onPress={() => handleRemoveMember(member)}
            style={[styles.removeButton, { backgroundColor: colors.danger }]}
          >
            <Ionicons name="trash" size={16} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Membres ({members.length})
        </Text>
        
        <View style={styles.sortButtons}>
          <TouchableOpacity
            onPress={() => setSortBy('name')}
            style={[
              styles.sortButton,
              sortBy === 'name' && { backgroundColor: colors.primary }
            ]}
          >
            <Text
              style={[
                styles.sortText,
                {
                  color: sortBy === 'name' ? '#ffffff' : colors.textLight
                }
              ]}
            >
              Nom
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setSortBy('activity')}
            style={[
              styles.sortButton,
              sortBy === 'activity' && { backgroundColor: colors.primary }
            ]}
          >
            <Text
              style={[
                styles.sortText,
                {
                  color: sortBy === 'activity' ? '#ffffff' : colors.textLight
                }
              ]}
            >
              Activité
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setSortBy('drinks')}
            style={[
              styles.sortButton,
              sortBy === 'drinks' && { backgroundColor: colors.primary }
            ]}
          >
            <Text
              style={[
                styles.sortText,
                {
                  color: sortBy === 'drinks' ? '#ffffff' : colors.textLight
                }
              ]}
            >
              Boissons
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setSortBy('triches')}
            style={[
              styles.sortButton,
              sortBy === 'triches' && { backgroundColor: colors.primary }
            ]}
          >
            <Text
              style={[
                styles.sortText,
                {
                  color: sortBy === 'triches' ? '#ffffff' : colors.textLight
                }
              ]}
            >
              Triches
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={sortedMembers}
        renderItem={renderMember}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  title: {
    fontSize: 18,
    fontWeight: '600'
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 4
  },
  sortButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  sortText: {
    fontSize: 12,
    fontWeight: '500'
  },
  list: {
    padding: 16
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  removeButton: {
    padding: 8,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  }
});