import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { FestivalGroup, DrinkRecord } from '../../types';
import { Card } from '../ui/Card';
import { useTheme } from '../../context/ThemeContext';
import { formatUnits } from '../../utils/calculations';
import { formatRelativeDate } from '../../utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';

interface GroupStatsProps {
  group: FestivalGroup;
  drinks: DrinkRecord[];
  weeklyTrend: number[];
}

export function GroupStats({ group, drinks, weeklyTrend }: GroupStatsProps) {
  const { colors, theme } = useTheme();

  const todayDrinks = drinks.filter(d => {
    const today = new Date();
    const drinkDate = new Date(d.timestamp);
    return drinkDate.toDateString() === today.toDateString();
  });

  const totalUnits = drinks.reduce((sum, d) => sum + d.alcoholUnits, 0);
  const averagePerMember = group.stats.totalMembers > 0 ? totalUnits / group.stats.totalMembers : 0;

  // Calcul du membre le plus actif
  const memberActivity = new Map<string, number>();
  drinks.forEach(drink => {
    const current = memberActivity.get(drink.userId) || 0;
    memberActivity.set(drink.userId, current + 1);
  });

  let mostActiveMember = '';
  let maxActivity = 0;
  memberActivity.forEach((count, userId) => {
    if (count > maxActivity) {
      maxActivity = count;
      const member = group.members[userId];
      mostActiveMember = member?.name || 'Inconnu';
    }
  });

  const stats = [
    {
      icon: 'people',
      label: 'Membres',
      value: group.stats.totalMembers.toString(),
      color: colors.primary
    },
    {
      icon: 'wine',
      label: 'Boissons totales',
      value: group.stats.totalDrinks.toString(),
      color: colors.secondary
    },
    {
      icon: 'flash',
      label: 'Unités totales',
      value: formatUnits(totalUnits),
      color: colors.warning
    },
    {
      icon: 'analytics',
      label: 'Moyenne/membre',
      value: formatUnits(averagePerMember),
      color: colors.info
    },
    {
      icon: 'calendar',
      label: "Aujourd'hui",
      value: todayDrinks.length.toString(),
      color: colors.success
    },
    {
      icon: 'trophy',
      label: 'Plus actif',
      value: mostActiveMember || 'Aucun',
      color: colors.danger
    }
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.grid}>
        {stats.map((stat, index) => (
          <Card key={index} style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={[styles.iconContainer, { backgroundColor: stat.color }]}>
                <Ionicons name={stat.icon as any} size={24} color="#ffffff" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stat.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>
                {stat.label}
              </Text>
            </View>
          </Card>
        ))}
      </View>

      <Card style={styles.trendCard}>
        <Text style={[styles.trendTitle, { color: colors.text }]}>
          Tendance hebdomadaire
        </Text>
        <View style={styles.trendChart}>
          {weeklyTrend.map((value, index) => {
            const height = Math.max(4, (value / Math.max(...weeklyTrend)) * 60);
            return (
              <View key={index} style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: colors.primary
                    }
                  ]}
                />
                <Text style={[styles.barLabel, { color: colors.textLight }]}>
                  {['D', 'L', 'M', 'M', 'J', 'V', 'S'][index]}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Card style={styles.infoCard}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>
          Festival
        </Text>
        <View style={styles.infoContent}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color={colors.textLight} />
            <Text style={[styles.infoText, { color: colors.textLight }]}>
              Du {formatRelativeDate(group.settings.festivalDates.start)} au{' '}
              {formatRelativeDate(group.settings.festivalDates.end)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time" size={16} color={colors.textLight} />
            <Text style={[styles.infoText, { color: colors.textLight }]}>
              Créé {formatRelativeDate(group.createdAt)}
            </Text>
          </View>
          {group.stats.mostActiveDay && (
            <View style={styles.infoRow}>
              <Ionicons name="trending-up" size={16} color={colors.textLight} />
              <Text style={[styles.infoText, { color: colors.textLight }]}>
                Jour le plus actif: {formatRelativeDate(new Date(group.stats.mostActiveDay))}
              </Text>
            </View>
          )}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16
  },
  statCard: {
    width: '48%',
    minHeight: 100
  },
  statContent: {
    alignItems: 'center'
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center'
  },
  trendCard: {
    marginBottom: 16
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12
  },
  trendChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80
  },
  barContainer: {
    alignItems: 'center',
    flex: 1
  },
  bar: {
    width: 20,
    marginBottom: 4,
    borderRadius: 2
  },
  barLabel: {
    fontSize: 10
  },
  infoCard: {
    marginBottom: 16
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12
  },
  infoContent: {
    gap: 8
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  infoText: {
    fontSize: 14
  }
});