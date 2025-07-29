import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { Card } from '../ui/Card';
import { useTheme } from '../../context/ThemeContext';
import { FestivalZone, ZONE_CONFIGS } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface ActivityStatsProps {
  walkingSteps: number;
  dancingSteps: number;
  totalDistance: number; // en mètres
  currentZone?: FestivalZone | null;
  zoneTimeTracking: Record<string, { totalTime: number; lastEntered: Date | null; visits: number }>;
  zones: FestivalZone[];
  onPress?: () => void;
}

export function ActivityStats({ 
  walkingSteps, 
  dancingSteps, 
  totalDistance,
  currentZone,
  zoneTimeTracking,
  zones,
  onPress 
}: ActivityStatsProps) {
  const { colors, theme } = useTheme();

  const totalSteps = walkingSteps + dancingSteps;
  const distanceKm = totalDistance / 1000;

  // Calculer la zone la plus visitée
  const mostVisitedZoneEntry = Object.entries(zoneTimeTracking)
    .reduce((max, [zoneId, tracking]) => {
      if (tracking.totalTime > (max[1]?.totalTime || 0)) {
        return [zoneId, tracking];
      }
      return max;
    }, ['', { totalTime: 0, lastEntered: null, visits: 0 }]);

  const mostVisitedZone = zones.find(z => z.id === mostVisitedZoneEntry[0]);
  const mostVisitedTime = mostVisitedZoneEntry[1].totalTime;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
    }
    return `${minutes}min`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="footsteps" size={24} color={colors.success} />
            </View>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                Activité Festival
              </Text>
              {currentZone && (
                <View style={styles.currentZoneContainer}>
                  <Text style={styles.currentZoneEmoji}>
                    {ZONE_CONFIGS[currentZone.type].emoji}
                  </Text>
                  <Text style={[styles.currentZoneText, { color: colors.primary }]}>
                    {currentZone.name}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {onPress && (
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          )}
        </View>

        <View style={styles.statsGrid}>
          {/* Pas de marche */}
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="walk" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {walkingSteps.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>
              pas marche
            </Text>
          </View>

          {/* Pas de danse */}
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: colors.secondary + '20' }]}>
              <Ionicons name="musical-notes" size={20} color={colors.secondary} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {dancingSteps.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>
              pas danse
            </Text>
          </View>

          {/* Distance */}
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="location" size={20} color={colors.warning} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatDistance(totalDistance)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>
              distance
            </Text>
          </View>

          {/* Zone préférée */}
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: colors.info + '20' }]}>
              <Ionicons name="heart" size={20} color={colors.info} />
            </View>
            {mostVisitedZone ? (
              <>
                <Text style={[styles.statValue, { color: colors.text, fontSize: 14 }]}>
                  {mostVisitedZone.name}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {formatTime(mostVisitedTime)}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  -
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  zone préférée
                </Text>
              </>
            )}
          </View>
        </View>

        {totalSteps === 0 && (
          <View style={[styles.emptyState, { borderColor: colors.border }]}>
            <Ionicons name="footsteps-outline" size={32} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              Activez le suivi pour voir vos statistiques
            </Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2
  },
  currentZoneContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  currentZoneEmoji: {
    fontSize: 14,
    marginRight: 4
  },
  currentZoneText: {
    fontSize: 14,
    fontWeight: '500'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  statItem: {
    width: '47%',
    alignItems: 'center',
    padding: 8
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center'
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center'
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    marginTop: 8
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8
  }
});