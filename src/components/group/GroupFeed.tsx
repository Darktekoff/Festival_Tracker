import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl
} from 'react-native';
import { GroupActivity } from '../../types';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '../../context/ThemeContext';
import { formatDateTime } from '../../utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { parseAvatarString } from '../../utils/iconMappings';
import activityStreamService, { CombinedActivity } from '../../services/activityStreamService';

interface GroupFeedProps {
  groupId: string;
  activities?: GroupActivity[]; // Optionnel maintenant
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function GroupFeed({ 
  groupId, 
  activities, 
  onRefresh, 
  refreshing = false 
}: GroupFeedProps) {
  const { colors, theme } = useTheme();
  const [combinedActivities, setCombinedActivities] = useState<CombinedActivity[]>([]);

  useEffect(() => {
    // Initialiser le service d'activités combinées
    activityStreamService.initialize(groupId);

    // S'abonner aux mises à jour
    const unsubscribe = activityStreamService.onActivitiesUpdate(setCombinedActivities);

    return unsubscribe;
  }, [groupId]);

  const renderActivity = ({ item: activity }: { item: CombinedActivity }) => (
    <Card style={styles.activityCard}>
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Avatar
            avatarData={parseAvatarString(activity.user.avatar)}
            name={activity.user.name}
            size="small"
          />
          <View style={styles.activityInfo}>
            <Text style={[styles.activityMessage, { color: colors.text }]}>
              {activity.message}
            </Text>
            <Text style={[styles.activityTime, { color: colors.textLight }]}>
              {activityStreamService.getTimeAgo(activity.timestamp)}
            </Text>
          </View>
          <View
            style={[
              styles.activityIcon,
              { backgroundColor: activity.color }
            ]}
          >
            <Text style={styles.activityEmoji}>
              {activity.icon}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles" size={48} color={colors.textLight} />
      <Text style={[styles.emptyText, { color: colors.textLight }]}>
        Aucune activité récente
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
        Les activités du groupe apparaîtront ici
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Activité du groupe
        </Text>
      </View>

      <FlatList
        data={combinedActivities}
        renderItem={renderActivity}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          combinedActivities.length === 0 && styles.emptyList
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          ) : undefined
        }
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  title: {
    fontSize: 18,
    fontWeight: '600'
  },
  list: {
    padding: 16
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center'
  },
  activityCard: {
    marginBottom: 8
  },
  activityContent: {
    gap: 8
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  activityInfo: {
    flex: 1
  },
  activityMessage: {
    fontSize: 14,
    fontWeight: '500'
  },
  activityTime: {
    fontSize: 12,
    marginTop: 2
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  activityEmoji: {
    fontSize: 16
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center'
  }
});