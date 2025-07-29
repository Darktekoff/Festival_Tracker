import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity
} from 'react-native';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { useGroupContext } from '../../context/GroupContext';
import { useDrinks } from '../../hooks/useDrinks';
import { useMembers } from '../../hooks/useMembers';
import { useStats } from '../../hooks/useStats';
import { formatUnits } from '../../utils/calculations';
import { formatRelativeDate } from '../../utils/dateUtils';
import { parseAvatarString } from '../../utils/iconMappings';
import { DRINK_TEMPLATES } from '../../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { KnowledgeCarousel } from '../../components/carousel/KnowledgeCarousel';
import { ActivityStats } from '../../components/festival/ActivityStats';
import { useFestivalActivity } from '../../hooks/useFestivalActivity';

export function StatsScreen() {
  const { colors } = useTheme();
  const { user } = useAuthContext();
  const { group, currentMember } = useGroupContext();
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedStat, setSelectedStat] = useState<string | null>(null);

  // Protection contre les crashes : ne pas initialiser les hooks si pas de données
  const groupId = group?.id || null;
  const groupMembers = group?.members;
  const userId = user?.id || null;
  
  const { drinks } = useDrinks(groupId);
  const { members } = useMembers(groupMembers, groupId);
  const { weeklyTrend } = useStats(drinks, userId, members);
  const { currentActivity, zones, zoneTimeTracking } = useFestivalActivity();

  // Créer les catégories de boissons à partir des templates
  const DRINK_CATEGORIES = [
    { id: 'beer', name: 'Bières', emoji: '🍺' },
    { id: 'wine', name: 'Vins', emoji: '🍷' },
    { id: 'cocktail', name: 'Cocktails', emoji: '🍹' },
    { id: 'shot', name: 'Shots', emoji: '🥃' },
    { id: 'champagne', name: 'Champagne', emoji: '🥂' },
    { id: 'other', name: 'Autres', emoji: '🍸' }
  ];

  if (!group) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.noGroupContainer}>
          <Ionicons name="analytics-outline" size={64} color={colors.textLight} />
          <Text style={[styles.noGroupText, { color: colors.textLight }]}>
            Rejoignez un groupe pour voir les statistiques
          </Text>
        </View>
      </View>
    );
  }

  // Calculs statistiques avec protection
  const todayDrinks = drinks.filter(d => {
    try {
      const today = new Date();
      const drinkDate = new Date(d.timestamp);
      return drinkDate.toDateString() === today.toDateString();
    } catch (error) {
      console.error('StatsScreen - Error filtering today drinks:', error);
      return false;
    }
  });

  const totalUnits = drinks.reduce((sum, d) => {
    try {
      return sum + (d.alcoholUnits || 0);
    } catch (error) {
      console.error('StatsScreen - Error calculating total units:', error);
      return sum;
    }
  }, 0);
  
  const averagePerMember = group?.stats?.totalMembers > 0 ? totalUnits / group.stats.totalMembers : 0;

  // Calculs par catégorie pour les détails avec protection
  const drinksByCategory = drinks.reduce((acc, drink) => {
    try {
      const category = drink.category || 'other';
      if (!acc[category]) {
        acc[category] = {
          count: 0,
          volume: 0,
          units: 0,
          pureAlcohol: 0
        };
      }
      acc[category].count += 1;
      acc[category].volume += (drink.volume || 0);
      acc[category].units += (drink.alcoholUnits || 0);
      // Calcul de l'alcool pur en ml: (volume en cl * 10) * (degré / 100) * 0.8
      const volume = drink.volume || 0;
      const alcoholContent = drink.alcoholContent || 0;
      acc[category].pureAlcohol += (volume * 10) * (alcoholContent / 100) * 0.8;
      return acc;
    } catch (error) {
      console.error('StatsScreen - Error calculating drinks by category:', error);
      return acc;
    }
  }, {} as Record<string, { count: number; volume: number; units: number; pureAlcohol: number }>);

  // Total d'alcool pur en litres
  const totalPureAlcohol = Object.values(drinksByCategory).reduce(
    (sum, cat) => sum + cat.pureAlcohol, 0
  ) / 1000; // Convertir ml en litres

  // Calcul du membre le plus actif avec protection
  const memberActivity = new Map<string, { count: number; units: number }>();
  
  try {
    drinks.forEach(drink => {
      try {
        const current = memberActivity.get(drink.userId) || { count: 0, units: 0 };
        memberActivity.set(drink.userId, {
          count: current.count + 1,
          units: current.units + (drink.alcoholUnits || 0)
        });
      } catch (error) {
        console.error('StatsScreen - Error processing drink for member activity:', error);
      }
    });
  } catch (error) {
    console.error('StatsScreen - Error calculating member activity:', error);
  }

  let mostActiveMember = { 
    name: 'Aucun', 
    avatar: '🙂', 
    avatarData: parseAvatarString('🙂'),
    count: 0, 
    units: 0 
  };
  
  try {
    memberActivity.forEach((stats, userId) => {
      if (stats.count > mostActiveMember.count) {
        const member = group?.members?.[userId];
        if (member) {
          mostActiveMember = {
            name: member.name,
            avatar: member.avatar,
            avatarData: parseAvatarString(member.avatar),
            count: stats.count,
            units: stats.units
          };
        }
      }
    });
  } catch (error) {
    console.error('StatsScreen - Error finding most active member:', error);
  }

  // Statistiques principales avec protection
  const mainStats = [
    {
      id: 'members',
      icon: 'people',
      label: 'Membres',
      value: (group?.stats?.totalMembers || 0).toString(),
      color: colors.primary
    },
    {
      id: 'drinks',
      icon: 'wine',
      label: 'Boissons totales',
      value: (group?.stats?.totalDrinks || 0).toString(),
      color: colors.secondary
    },
    {
      id: 'units',
      icon: 'flash',
      label: 'Unités totales',
      value: formatUnits(totalUnits),
      color: colors.warning
    },
    {
      id: 'average',
      icon: 'analytics',
      label: 'Moyenne/membre',
      value: formatUnits(averagePerMember),
      color: colors.info
    },
    {
      id: 'today',
      icon: 'calendar',
      label: "Aujourd'hui",
      value: todayDrinks.length.toString(),
      color: colors.success
    },
    {
      id: 'duration',
      icon: 'time',
      label: 'Durée festival',
      value: group?.settings?.festivalDates ? 
        `${Math.ceil((group.settings.festivalDates.end.getTime() - group.settings.festivalDates.start.getTime()) / (1000 * 60 * 60 * 24))}j` : 
        '0j',
      color: colors.danger
    }
  ];

  const handleStatPress = (statId: string) => {
    setSelectedStat(statId);
    setDetailModalVisible(true);
  };

  // Classement des membres avec protection
  const memberRanking = Array.from(memberActivity.entries())
    .map(([userId, stats]) => ({
      userId,
      member: group?.members?.[userId],
      ...stats
    }))
    .filter(item => item.member)
    .sort((a, b) => b.units - a.units);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Statistiques du groupe
          </Text>
          <Text style={[styles.subtitle, { color: colors.textLight }]}>
            {group?.name || 'Chargement...'}
          </Text>
        </View>

        {/* Grille de statistiques principales */}
        <View style={styles.statsGrid}>
          {mainStats.map((stat, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleStatPress(stat.id)}
              activeOpacity={0.7}
              style={styles.statCardWrapper}
            >
              <Card style={styles.statCard}>
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
            </TouchableOpacity>
          ))}
        </View>

        {/* Statistiques d'activité du festival */}
        <ActivityStats
          walkingSteps={currentActivity?.steps.walking || 0}
          dancingSteps={currentActivity?.steps.dancing || 0}
          totalDistance={currentActivity?.distance || 0}
          currentZone={zones.find(z => z.id === currentActivity?.currentZone) || null}
          zoneTimeTracking={zoneTimeTracking}
          zones={zones}
          onPress={() => handleStatPress('activity')}
        />

        {/* Membre le plus actif */}
        {mostActiveMember.count > 0 && (
          <Card style={styles.highlightCard}>
            <View style={styles.highlightHeader}>
              <Ionicons name="trophy" size={24} color={colors.warning} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Membre le plus actif
              </Text>
            </View>
            <View style={styles.highlightContent}>
              <View style={styles.avatarContainer}>
                {mostActiveMember.avatarData.type === 'emoji' ? (
                  <Text style={styles.memberAvatar}>{mostActiveMember.avatarData.value}</Text>
                ) : mostActiveMember.avatarData.type === 'icon' ? (
                  <View style={[styles.iconAvatar, { backgroundColor: mostActiveMember.avatarData.color || colors.primary }]}>
                    <Ionicons 
                      name={mostActiveMember.avatarData.value as any} 
                      size={28} 
                      color="#ffffff" 
                    />
                  </View>
                ) : (
                  <Image 
                    source={{ uri: mostActiveMember.avatarData.value }} 
                    style={styles.photoAvatar}
                  />
                )}
              </View>
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.text }]}>
                  {mostActiveMember.name}
                </Text>
                <Text style={[styles.memberStats, { color: colors.textLight }]}>
                  {mostActiveMember.count} boissons • {formatUnits(mostActiveMember.units)} unités
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Graphique de tendance hebdomadaire */}
        <Card style={styles.trendCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Tendance hebdomadaire
          </Text>
          <View style={styles.trendChart}>
            {weeklyTrend.map((value, index) => {
              const maxValue = Math.max(...weeklyTrend);
              const height = maxValue > 0 ? Math.max(4, (value / maxValue) * 80) : 4;
              const isToday = new Date().getDay() === index;
              
              return (
                <View key={index} style={styles.barContainer}>
                  <Text style={[styles.barValue, { color: colors.textLight }]}>
                    {value > 0 ? value : ''}
                  </Text>
                  <View
                    style={[
                      styles.bar,
                      {
                        height,
                        backgroundColor: isToday ? colors.secondary : colors.primary
                      }
                    ]}
                  />
                  <Text style={[
                    styles.barLabel, 
                    { 
                      color: isToday ? colors.secondary : colors.textLight,
                      fontWeight: isToday ? '600' : '400'
                    }
                  ]}>
                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'][index]}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Classement des membres */}
        <Card style={styles.rankingCard}>
          <View style={styles.rankingHeader}>
            <Ionicons name="podium" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Classement
            </Text>
          </View>
          
          {memberRanking.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              Aucune consommation enregistrée
            </Text>
          ) : (
            memberRanking.map((item, index) => (
              <View key={item.userId} style={styles.rankingRow}>
                <View style={styles.rankPosition}>
                  <Text style={[styles.rankNumber, { 
                    color: index === 0 ? colors.warning : 
                           index === 1 ? colors.textLight : 
                           index === 2 ? '#CD7F32' : 
                           colors.textLight 
                  }]}>
                    {index + 1}
                  </Text>
                </View>
                {(() => {
                  const avatarData = parseAvatarString(item.member.avatar);
                  if (avatarData.type === 'emoji') {
                    return <Text style={styles.rankAvatar}>{avatarData.value}</Text>;
                  } else if (avatarData.type === 'icon') {
                    return (
                      <View style={[styles.rankIconAvatar, { backgroundColor: avatarData.color || colors.primary }]}>
                        <Ionicons 
                          name={avatarData.value as any} 
                          size={16} 
                          color="#ffffff" 
                        />
                      </View>
                    );
                  } else {
                    return (
                      <Image 
                        source={{ uri: avatarData.value }} 
                        style={styles.rankPhotoAvatar}
                      />
                    );
                  }
                })()}
                <View style={styles.rankInfo}>
                  <Text style={[styles.rankName, { color: colors.text }]}>
                    {item.member.name}
                  </Text>
                  <Text style={[styles.rankStats, { color: colors.textLight }]}>
                    {item.count} boissons
                  </Text>
                </View>
                <Text style={[styles.rankUnits, { color: colors.primary }]}>
                  {formatUnits(item.units)}
                </Text>
              </View>
            ))
          )}
        </Card>

        {/* Carousel dynamique Le saviez-vous ? */}
        <Card style={styles.knowledgeCard}>
          <KnowledgeCarousel 
            userTodayUnits={todayDrinks.filter(d => d.userId === user?.id).reduce((sum, d) => sum + (d.alcoholUnits || 0), 0)}
            userProfile={user?.profile}
            colors={colors}
          />
        </Card>
      </ScrollView>

      {/* Modal de détails */}
      <Modal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        title={mainStats.find(s => s.id === selectedStat)?.label || ''}
      >
        {selectedStat === 'drinks' && (
          <View style={styles.modalContent}>
            <View style={styles.detailHeader}>
              <Ionicons name="beaker" size={24} color={colors.primary} />
              <Text style={[styles.detailTitle, { color: colors.text }]}>
                Répartition par type
              </Text>
            </View>

            <Card style={[styles.alcoholCard, { backgroundColor: colors.danger + '20' }]}>
              <Text style={[styles.alcoholTitle, { color: colors.danger }]}>
                🍺 Alcool pur consommé
              </Text>
              <Text style={[styles.alcoholValue, { color: colors.danger }]}>
                {totalPureAlcohol.toFixed(2)} litres
              </Text>
              <Text style={[styles.alcoholSubtext, { color: colors.textLight }]}>
                Équivalent à {(totalPureAlcohol * 2.5).toFixed(0)} bières de 33cl
              </Text>
            </Card>

            {Object.entries(drinksByCategory)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([category, stats]) => {
                const categoryInfo = DRINK_CATEGORIES.find(c => c.id === category) || { id: 'other', name: 'Autre', emoji: '🍸' };
                return (
                  <Card key={category} style={styles.categoryCard}>
                    <View style={styles.categoryHeader}>
                      <Text style={[styles.categoryEmoji, { fontSize: 24 }]}>
                        {categoryInfo.emoji}
                      </Text>
                      <Text style={[styles.categoryName, { color: colors.text }]}>
                        {categoryInfo.name}
                      </Text>
                    </View>
                    <View style={styles.categoryStats}>
                      <View style={styles.categoryStat}>
                        <Text style={[styles.categoryStatValue, { color: colors.primary }]}>
                          {stats.count}
                        </Text>
                        <Text style={[styles.categoryStatLabel, { color: colors.textLight }]}>
                          boissons
                        </Text>
                      </View>
                      <View style={styles.categoryStat}>
                        <Text style={[styles.categoryStatValue, { color: colors.secondary }]}>
                          {(stats.volume / 100).toFixed(1)}L
                        </Text>
                        <Text style={[styles.categoryStatLabel, { color: colors.textLight }]}>
                          volume
                        </Text>
                      </View>
                      <View style={styles.categoryStat}>
                        <Text style={[styles.categoryStatValue, { color: colors.warning }]}>
                          {formatUnits(stats.units)}
                        </Text>
                        <Text style={[styles.categoryStatLabel, { color: colors.textLight }]}>
                          unités
                        </Text>
                      </View>
                    </View>
                  </Card>
                );
              })}
          </View>
        )}

        {/* Modal activité */}
        {selectedStat === 'activity' && (
          <View style={styles.modalContent}>
            <View style={styles.detailHeader}>
              <Ionicons name="footsteps" size={24} color={colors.success} />
              <Text style={[styles.detailTitle, { color: colors.text }]}>
                Activité du Festival
              </Text>
            </View>

            <View style={styles.activityDetailGrid}>
              <Card style={styles.activityDetailCard}>
                <Text style={[styles.activityDetailValue, { color: colors.primary }]}>
                  {(currentActivity?.steps.walking || 0).toLocaleString()}
                </Text>
                <Text style={[styles.activityDetailLabel, { color: colors.textLight }]}>
                  Pas de marche
                </Text>
                <Text style={[styles.activityDetailDesc, { color: colors.textLight }]}>
                  Déplacements entre zones
                </Text>
              </Card>

              <Card style={styles.activityDetailCard}>
                <Text style={[styles.activityDetailValue, { color: colors.secondary }]}>
                  {(currentActivity?.steps.dancing || 0).toLocaleString()}
                </Text>
                <Text style={[styles.activityDetailLabel, { color: colors.textLight }]}>
                  Pas de danse
                </Text>
                <Text style={[styles.activityDetailDesc, { color: colors.textLight }]}>
                  Mouvements devant les scènes
                </Text>
              </Card>

              <Card style={styles.activityDetailCard}>
                <Text style={[styles.activityDetailValue, { color: colors.warning }]}>
                  {((currentActivity?.distance || 0) / 1000).toFixed(1)}km
                </Text>
                <Text style={[styles.activityDetailLabel, { color: colors.textLight }]}>
                  Distance parcourue
                </Text>
                <Text style={[styles.activityDetailDesc, { color: colors.textLight }]}>
                  Basée sur la marche uniquement
                </Text>
              </Card>

              <Card style={styles.activityDetailCard}>
                <Text style={[styles.activityDetailValue, { color: colors.info }]}>
                  {zones.length}
                </Text>
                <Text style={[styles.activityDetailLabel, { color: colors.textLight }]}>
                  Zones mappées
                </Text>
                <Text style={[styles.activityDetailDesc, { color: colors.textLight }]}>
                  Zones détectables par GPS
                </Text>
              </Card>
            </View>

            {/* Temps par zone */}
            {Object.keys(zoneTimeTracking).length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
                  Temps par zone
                </Text>
                {Object.entries(zoneTimeTracking)
                  .sort((a, b) => b[1].totalTime - a[1].totalTime)
                  .slice(0, 5)
                  .map(([zoneId, tracking]) => {
                    const zone = zones.find(z => z.id === zoneId);
                    if (!zone) return null;

                    const config = ZONE_CONFIGS[zone.type];
                    const timeMinutes = Math.floor(tracking.totalTime / 60);
                    
                    return (
                      <Card key={zoneId} style={styles.zoneTimeCard}>
                        <View style={styles.zoneTimeContent}>
                          <Text style={styles.zoneTimeEmoji}>{config.emoji}</Text>
                          <View style={styles.zoneTimeInfo}>
                            <Text style={[styles.zoneTimeName, { color: colors.text }]}>
                              {zone.name}
                            </Text>
                            <Text style={[styles.zoneTimeStats, { color: colors.textLight }]}>
                              {timeMinutes}min • {tracking.visits} visite{tracking.visits > 1 ? 's' : ''}
                            </Text>
                          </View>
                        </View>
                      </Card>
                    );
                  })}
              </>
            )}
          </View>
        )}

        {/* Autres modales simplifiées */}
        {(selectedStat === 'members' || selectedStat === 'units' || selectedStat === 'average' || selectedStat === 'today' || selectedStat === 'duration') && (
          <View style={styles.modalContent}>
            <Text style={[styles.detailTitle, { color: colors.text }]}>
              Détails pour {mainStats.find(s => s.id === selectedStat)?.label}
            </Text>
            <Text style={[styles.knowledgeMainText, { color: colors.textLight }]}>
              Cette fonctionnalité sera bientôt disponible !
            </Text>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollView: {
    flex: 1,
    padding: 16
  },
  noGroupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  noGroupText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16
  },
  header: {
    marginBottom: 24
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 16
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16
  },
  statCardWrapper: {
    width: '48%'
  },
  statCard: {
    minHeight: 100,
    flex: 1
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  highlightCard: {
    marginBottom: 16
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  highlightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  memberAvatar: {
    fontSize: 48
  },
  iconAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  photoAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24
  },
  memberInfo: {
    flex: 1
  },
  memberName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4
  },
  memberStats: {
    fontSize: 14
  },
  trendCard: {
    marginBottom: 16
  },
  trendChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    marginTop: 16
  },
  barContainer: {
    alignItems: 'center',
    flex: 1
  },
  barValue: {
    fontSize: 10,
    marginBottom: 4,
    height: 14
  },
  bar: {
    width: 24,
    marginBottom: 4,
    borderRadius: 2
  },
  barLabel: {
    fontSize: 12
  },
  rankingCard: {
    marginBottom: 16
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  rankPosition: {
    width: 30,
    alignItems: 'center'
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '600'
  },
  rankAvatar: {
    fontSize: 28,
    marginHorizontal: 12
  },
  rankIconAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12
  },
  rankPhotoAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginHorizontal: 12
  },
  rankInfo: {
    flex: 1
  },
  rankName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2
  },
  rankStats: {
    fontSize: 12
  },
  rankUnits: {
    fontSize: 16,
    fontWeight: '600'
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20
  },
  knowledgeCard: {
    marginBottom: 24,
    overflow: 'hidden',
    borderRadius: 12
  },
  knowledgeMainText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    fontWeight: '500'
  },
  // Modal styles
  modalContent: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  alcoholCard: {
    padding: 16,
    marginBottom: 16,
    alignItems: 'center'
  },
  alcoholTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8
  },
  alcoholValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4
  },
  alcoholSubtext: {
    fontSize: 14,
    textAlign: 'center'
  },
  categoryCard: {
    marginBottom: 12
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12
  },
  categoryEmoji: {
    fontSize: 24
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1
  },
  categoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  categoryStat: {
    alignItems: 'center'
  },
  categoryStatValue: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4
  },
  categoryStatLabel: {
    fontSize: 12
  },
  // Activity modal styles
  activityDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  activityDetailCard: {
    width: '48%',
    padding: 12,
    alignItems: 'center'
  },
  activityDetailValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4
  },
  activityDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2
  },
  activityDetailDesc: {
    fontSize: 10,
    textAlign: 'center'
  },
  zoneTimeCard: {
    marginBottom: 8,
    padding: 12
  },
  zoneTimeContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  zoneTimeEmoji: {
    fontSize: 20,
    marginRight: 12
  },
  zoneTimeInfo: {
    flex: 1
  },
  zoneTimeName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2
  },
  zoneTimeStats: {
    fontSize: 12
  }
});