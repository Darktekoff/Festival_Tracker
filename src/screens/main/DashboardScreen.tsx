import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Modal } from '../../components/ui/Modal';
import { DrinkItem } from '../../components/drink/DrinkItem';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { useGroupContext } from '../../context/GroupContext';
import { useDrinks } from '../../hooks/useDrinks';
import { useStats } from '../../hooks/useStats';
import { useAlerts } from '../../hooks/useAlerts';
import { formatUnits, getAlertLevel, estimateAdvancedBloodAlcoholContent, calculateAdvancedCurrentBloodAlcohol, analyzeConsumptionSpeed, estimateBloodAlcoholContent } from '../../utils/calculations';
import { calculatePersonalizedLimits, evaluateAlcoholRisk } from '../../utils/alcoholLimits';
import { formatRelativeDate } from '../../utils/dateUtils';
import { parseAvatarString } from '../../utils/iconMappings';
import { Ionicons } from '@expo/vector-icons';
import { eventBus, EVENTS } from '../../utils/eventBus';
import { useActivityStream } from '../../hooks/useActivityStream';
import activityStreamService from '../../services/activityStreamService';

interface DashboardScreenProps {
  navigation: any;
}

export function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { colors, theme } = useTheme();
  const { user } = useAuthContext();
  const { group } = useGroupContext();
  const { drinks, isLoading, refresh, addDrink } = useDrinks(group?.id || null);
  const { activities } = useActivityStream(group?.id || null);
  const { 
    todayUnits, 
    currentUnits, 
    todayDrinks, 
    sessionDrinks, 
    sessionUnits, 
    sessionGroupAverage, 
    sessionStartTime, 
    alertLevel,
    isActivityTrackingAvailable,
    currentSleepStatus,
    useEnhancedDetection,
    toggleEnhancedDetection,
    todayTriches,
    sessionTriches,
    totalTriches,
    groupStats
  } = useStats(
    drinks,
    user?.id || null,
    group ? Object.values(group.members) : []
  );
  const [refreshing, setRefreshing] = useState(false);
  const [showTricheConfirm, setShowTricheConfirm] = useState(false);

  // Écouter l'événement d'ajout de boisson
  useEffect(() => {
    const handleDrinkAdded = () => {
      refresh();
    };

    eventBus.on(EVENTS.DRINK_ADDED, handleDrinkAdded);

    return () => {
      eventBus.off(EVENTS.DRINK_ADDED, handleDrinkAdded);
    };
  }, [refresh]);
  
  // Early return si user n'est pas encore chargé
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner text="Chargement des données..." fullScreen />
      </View>
    );
  }

  // Calculs d'alcoolémie personnalisés ou fallback
  const hasCompleteProfile = user?.profile?.age && user?.profile?.height && user?.profile?.weight && user?.profile?.gender;
  
  const advancedCalcs = hasCompleteProfile && user?.profile ? estimateAdvancedBloodAlcoholContent(currentUnits, {
    age: user.profile.age,
    gender: user.profile.gender,
    height: user.profile.height,
    weight: user.profile.weight,
    activityLevel: user.profile.activityLevel
  }) : null;

  const personalizedLimits = hasCompleteProfile && user?.profile ? calculatePersonalizedLimits({
    age: user.profile.age,
    gender: user.profile.gender,
    height: user.profile.height,
    weight: user.profile.weight,
    activityLevel: user.profile.activityLevel
  }) : null;

  // Évaluation des risques personnalisée ou fallback
  const personalizedRisk = hasCompleteProfile && personalizedLimits && user?.profile ? evaluateAlcoholRisk(
    currentUnits,
    todayUnits, 
    todayUnits * 7, // Estimation hebdomadaire basée sur aujourd'hui
    personalizedLimits,
    {
      age: user.profile.age,
      gender: user.profile.gender,
      weight: user.profile.weight
    }
  ) : null;

  // Analyser la vitesse de consommation des boissons de la session (exclure les triches)
  const sessionDrinksForSpeed = drinks.filter(d => !d.isTemplate && d.userId === user?.id && d.drinkType !== 'Triche');
  const sessionDrinksData = sessionDrinksForSpeed.length > 0 ? sessionDrinksForSpeed : [];
  const consumptionAnalysis = analyzeConsumptionSpeed(sessionDrinksData);
  
  // Utilisation des calculs avancés ou fallback avec vitesse de consommation
  const bloodAlcohol = advancedCalcs?.bloodAlcohol || (() => {
    const simpleCalc = estimateBloodAlcoholContent(
      currentUnits, 
      user?.profile?.weight || 70, 
      user?.profile?.gender === 'male',
      consumptionAnalysis.speedFactor
    );
    return simpleCalc.bloodAlcohol;
  })();
  const breathAlcohol = advancedCalcs?.breathAlcohol || (bloodAlcohol * 0.5);
  const eliminationTime = advancedCalcs?.timeToSober || (currentUnits / 0.15);

  useAlerts({
    currentUnits: currentUnits,
    userName: user?.name || 'Utilisateur',
    groupId: group?.id || null,
    enabled: true
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Auto-refresh quand on navigue vers cet onglet (avec délai pour éviter la boucle)
  useFocusEffect(
    useCallback(() => {
      const timeoutId = setTimeout(() => {
        refresh();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }, [])
  );

  const handleAddDrink = () => {
    navigation.navigate('AddDrink');
  };

  const handleAddTriche = () => {
    if (!user || !group) return;
    setShowTricheConfirm(true);
  };

  const confirmTriche = async () => {
    try {
      // Créer une "boisson" triche avec des valeurs spéciales
      const tricheData = {
        category: 'other' as const,
        drinkType: 'Triche',
        volume: 0,
        alcoholDegree: 0
      };
      
      // Utiliser le hook pour ajouter la triche
      await addDrink(tricheData);
      setShowTricheConfirm(false);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la triche:', error);
      setShowTricheConfirm(false);
    }
  };

  const getAlertColor = () => {
    // Utiliser l'évaluation personnalisée si disponible
    if (personalizedRisk) {
      switch (personalizedRisk.level) {
        case 'critical':
          return colors.danger;
        case 'high':
          return colors.warning;
        case 'moderate':
          return colors.warning;
        default:
          return colors.success;
      }
    }
    
    // Fallback sur l'ancien système
    switch (alertLevel) {
      case 'critical':
        return colors.danger;
      case 'high':
        return colors.warning;
      case 'moderate':
        return colors.warning;
      default:
        return colors.success;
    }
  };

  const getAlertMessage = () => {
    // Utiliser l'évaluation personnalisée si disponible
    if (personalizedRisk) {
      return personalizedRisk.message;
    }
    
    // Fallback sur l'ancien système
    switch (alertLevel) {
      case 'critical':
        return 'Niveau critique atteint! Arrêtez de boire.';
      case 'high':
        return 'Niveau élevé. Ralentissez la consommation.';
      case 'moderate':
        return 'Niveau modéré. Restez vigilant.';
      default:
        return 'Niveau sûr. Continuez à boire responsable.';
    }
  };

  const recentDrinks = drinks.filter(d => !d.isTemplate).slice(0, 5);
  
  // Calculer le nombre de boissons du jour pour chaque utilisateur (sans les triches)
  const getUserTodayDrinks = (userId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const userTodayDrinks = drinks.filter(drink => {
      const drinkDate = new Date(drink.timestamp);
      drinkDate.setHours(0, 0, 0, 0);
      return drink.userId === userId && drinkDate.getTime() === today.getTime() && !drink.isTemplate && drink.drinkType !== 'Triche';
    });
    
    return userTodayDrinks.length;
  };

  if (isLoading && drinks.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner text="Chargement..." fullScreen />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.modernHeader}>
          <View style={styles.profileSection}>
            <Avatar
              avatarData={parseAvatarString(user?.avatar || '')}
              name={user?.name || 'Utilisateur'}
              size="xlarge"
              style={styles.profileAvatar}
            />
            <Text style={[styles.modernGreeting, { color: colors.text }]}>
              Salut {user?.name || 'Utilisateur'} ! 👋
            </Text>
            {group && (
              <View style={[styles.groupBadge, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="people" size={16} color={colors.primary} />
                <Text style={[styles.groupBadgeText, { color: colors.primary }]}>
                  {group.name}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Card style={styles.modernStatsCard}>
          <View style={styles.modernStatsHeader}>
            <View style={styles.statsTitleSection}>
              <Ionicons name="time" size={20} color={colors.primary} />
              <Text style={[styles.modernStatsTitle, { color: colors.text }]}>
                Session actuelle
              </Text>
              {isActivityTrackingAvailable && (
                <TouchableOpacity 
                  onPress={toggleEnhancedDetection}
                  style={[styles.activityBadge, { 
                    backgroundColor: useEnhancedDetection ? colors.success + '20' : colors.textLight + '20' 
                  }]}
                >
                  <Ionicons 
                    name={useEnhancedDetection ? "fitness" : "fitness-outline"} 
                    size={12} 
                    color={useEnhancedDetection ? colors.success : colors.textLight} 
                  />
                  <Text style={[styles.activityBadgeText, { 
                    color: useEnhancedDetection ? colors.success : colors.textLight 
                  }]}>
                    {useEnhancedDetection ? 'Smart' : 'Basic'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.alertAndSleepContainer}>
              {currentSleepStatus.isSleeping && (
                <View style={[styles.sleepIndicator, { backgroundColor: colors.warning + '20' }]}>
                  <Ionicons name="moon" size={12} color={colors.warning} />
                  <Text style={[styles.sleepText, { color: colors.warning }]}>
                    Repos {currentSleepStatus.inactivityDuration}h
                  </Text>
                </View>
              )}
              <View style={[styles.modernAlertBadge, { backgroundColor: getAlertColor() }]}>
                <Text style={styles.modernAlertBadgeText}>
                  {personalizedRisk ? personalizedRisk.level.toUpperCase() : alertLevel.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsContent}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {sessionDrinks}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>
                Boissons session
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {formatUnits(sessionGroupAverage)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>
                Moyenne groupe
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#FF9800' }]}>
                {sessionTriches}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>
                Triches session
              </Text>
            </View>
          </View>

          <View style={[styles.alcoholIndicators, { backgroundColor: colors.surface }]}>
            <View style={styles.alcoholItem}>
              <Ionicons name="water" size={20} color={colors.primary} />
              <View style={styles.alcoholInfo}>
                <Text style={[styles.alcoholValue, { color: colors.text }]}>
                  {bloodAlcohol.toFixed(2)} g/L
                </Text>
                <Text style={[styles.alcoholLabel, { color: colors.textLight }]}>
                  dans le sang
                </Text>
              </View>
            </View>
            <View style={styles.alcoholDivider} />
            <View style={styles.alcoholItem}>
              <Ionicons name="cloud-outline" size={20} color={colors.secondary} />
              <View style={styles.alcoholInfo}>
                <Text style={[styles.alcoholValue, { color: colors.text }]}>
                  {breathAlcohol.toFixed(2)} mg/L
                </Text>
                <Text style={[styles.alcoholLabel, { color: colors.textLight }]}>
                  air expiré
                </Text>
              </View>
            </View>
          </View>

          <Text style={[styles.alertMessage, { color: getAlertColor() }]}>
            {getAlertMessage()}
          </Text>
          
          {/* Temps d'élimination si alcool présent */}
          {currentUnits > 0 && (
            <View style={styles.eliminationInfo}>
              <Ionicons name="time-outline" size={16} color={colors.textLight} />
              <Text style={[styles.eliminationText, { color: colors.textLight }]}>
                Temps d'élimination: {eliminationTime.toFixed(1)}h
              </Text>
            </View>
          )}
          
          {/* Analyse de la vitesse de consommation */}
          {sessionDrinksData.length > 1 && (
            <View style={[styles.speedAnalysis, { backgroundColor: colors.surface }]}>
              <View style={styles.speedHeader}>
                <Ionicons name="speedometer-outline" size={16} color={colors.primary} />
                <Text style={[styles.speedTitle, { color: colors.text }]}>
                  🎭 Rythme de consommation
                </Text>
              </View>
              <View style={styles.speedDetails}>
                <Text style={[styles.speedText, { color: colors.textLight }]}>
                  {consumptionAnalysis.averageTimeBetweenDrinks}min entre les verres
                </Text>
                <View style={[styles.speedBadge, { 
                  backgroundColor: consumptionAnalysis.pattern === 'binge' ? colors.danger + '20' :
                                   consumptionAnalysis.pattern === 'fast' ? colors.warning + '20' :
                                   consumptionAnalysis.pattern === 'slow' ? colors.success + '20' :
                                   colors.primary + '20'
                }]}>
                  <Text style={[styles.speedBadgeText, { 
                    color: consumptionAnalysis.pattern === 'binge' ? colors.danger :
                           consumptionAnalysis.pattern === 'fast' ? colors.warning :
                           consumptionAnalysis.pattern === 'slow' ? colors.success :
                           colors.primary
                  }]}>
                    {consumptionAnalysis.pattern === 'binge' ? '🚨 Très rapide' :
                     consumptionAnalysis.pattern === 'fast' ? '⚡ Rapide' :
                     consumptionAnalysis.pattern === 'slow' ? '🐌 Lent' :
                     '⚖️ Modéré'}
                  </Text>
                </View>
              </View>
              {consumptionAnalysis.speedFactor !== 1.0 && (
                <Text style={[styles.speedImpact, { color: colors.textLight }]}>
                  Impact: {consumptionAnalysis.speedFactor > 1 ? '+' : ''}{((consumptionAnalysis.speedFactor - 1) * 100).toFixed(0)}% d'alcoolémie
                </Text>
              )}
            </View>
          )}
          
          {/* Limites personnalisées si profil complet */}
          {hasCompleteProfile && personalizedLimits && (
            <View style={[styles.limitsInfo, { backgroundColor: colors.surface }]}>
              <Text style={[styles.limitsTitle, { color: colors.text }]}>
                🎯 Vos limites personnalisées
              </Text>
              <Text style={[styles.limitsText, { color: colors.textLight }]}>
                Quotidienne: {personalizedLimits.daily.units} unités • Session: {personalizedLimits.singleSession.units} unités
              </Text>
            </View>
          )}
          
          {/* Incitation à compléter le profil si incomplet */}
          {!hasCompleteProfile && (
            <TouchableOpacity 
              style={[styles.completeProfileInfo, { backgroundColor: colors.warning + '20' }]}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="information-circle" size={16} color={colors.warning} />
              <Text style={[styles.completeProfileText, { color: colors.warning }]}>
                Complétez votre profil pour des calculs précis
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.warning} />
            </TouchableOpacity>
          )}
          
          {/* Affichage du total des triches si > 0 */}
          {totalTriches > 0 && (
            <View style={[styles.tricheStatsInfo, { backgroundColor: '#FF9800' + '20' }]}>
              <Ionicons name="flash" size={16} color="#FF9800" />
              <Text style={[styles.tricheStatsText, { color: '#FF9800' }]}>
                Total des triches: {totalTriches} ⚡
              </Text>
            </View>
          )}
        </Card>

        <View style={styles.modernQuickActions}>
          <Button
            title="Ajouter une boisson"
            onPress={handleAddDrink}
            size="large"
            icon={<Ionicons name="add" size={22} color="#ffffff" />}
            style={[styles.addButton, styles.mainButton]}
          />
          <Button
            title=""
            onPress={handleAddTriche}
            size="large"
            variant="primary"
            icon={<View style={styles.tricheIconContainer}><Ionicons name="flash" size={20} color="#000000" /></View>}
            style={[styles.addButton, styles.tricheButton, styles.tricheButtonColor]}
          />
        </View>

        <Card style={styles.recentCard}>
          <View style={styles.recentHeader}>
            <Text style={[styles.recentTitle, { color: colors.text }]}>
              Activité récente
            </Text>
            <Button
              title="Voir tout"
              onPress={() => navigation.navigate('Group')}
              variant="ghost"
              size="small"
            />
          </View>

          {activities.length > 0 ? (
            <View style={styles.recentList}>
              {activities.slice(0, 4).map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <Avatar
                    avatarData={parseAvatarString(activity.user.avatar)}
                    name={activity.user.name}
                    size="small"
                  />
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityMessage, { color: colors.text }]} numberOfLines={2}>
                      {activity.message}
                    </Text>
                    <Text style={[styles.activityTime, { color: colors.textLight }]}>
                      {activityStreamService.getTimeAgo(activity.timestamp)}
                    </Text>
                  </View>
                  <View style={[styles.activityIcon, { backgroundColor: activity.color }]}>
                    <Ionicons 
                      name={activity.icon as any} 
                      size={20} 
                      color="#ffffff" 
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles" size={48} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>
                Aucune activité récente
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
                Les activités du groupe apparaîtront ici
              </Text>
            </View>
          )}
        </Card>

        {group && (
          <Card style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <Text style={[styles.groupTitle, { color: colors.text }]}>
                Groupe · {Object.keys(group.members).length} membres
              </Text>
              <Button
                title="Voir"
                onPress={() => navigation.navigate('Group')}
                variant="ghost"
                size="small"
              />
            </View>

            <View style={styles.groupStats}>
              <View style={styles.groupStat}>
                <Text style={[styles.groupStatValue, { color: colors.text }]}>
                  {groupStats.totalDrinks}
                </Text>
                <Text style={[styles.groupStatLabel, { color: colors.textLight }]}>
                  Boissons totales
                </Text>
              </View>
              <View style={styles.groupStat}>
                <Text style={[styles.groupStatValue, { color: colors.text }]}>
                  {formatUnits(groupStats.averagePerPerson)}
                </Text>
                <Text style={[styles.groupStatLabel, { color: colors.textLight }]}>
                  Moyenne/personne
                </Text>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Modal de confirmation triche */}
      <Modal
        visible={showTricheConfirm}
        onClose={() => setShowTricheConfirm(false)}
        size="medium"
        showCloseButton={false}
      >
        <View style={[styles.tricheModalContent, styles.tricheModalWrapper]}>
          <View style={styles.tricheModalHeader}>
            <Text style={styles.tricheModalEmoji}>⚡</Text>
            <Text style={[styles.tricheModalTitle, { color: colors.text }]}>
              Mode Triche
            </Text>
          </View>
          
          <Text style={[styles.tricheModalMessage, { color: colors.textLight }]}>
            Êtes-vous prêt à activer le pouvoir de la triche ? 🎯
          </Text>
          
          <Text style={[styles.tricheModalSubtext, { color: colors.textLight }]}>
            (toutes les substances pas très légales 🌿)
          </Text>
          
          <View style={styles.tricheModalButtons}>
            <TouchableOpacity
              style={[styles.tricheModalButton, styles.tricheCancelButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowTricheConfirm(false)}
            >
              <Text style={[styles.tricheButtonText, { color: colors.textLight }]}>
                Annuler
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tricheModalButton, styles.tricheConfirmButton]}
              onPress={confirmTriche}
            >
              <Text style={styles.tricheConfirmText}>
                ⚡ Activer !
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8
  },
  modernHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24
  },
  profileSection: {
    alignItems: 'center',
    gap: 16
  },
  profileAvatar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8
  },
  modernGreeting: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)'
  },
  groupBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2
  },
  modernStatsCard: {
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderRadius: 16
  },
  modernStatsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  statsTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  modernStatsTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  modernAlertBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  modernAlertBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    flexWrap: 'wrap'
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 14
  },
  alertMessage: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500'
  },
  modernQuickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    marginTop: 8
  },
  mainButton: {
    flex: 2
  },
  tricheButton: {
    width: 56,  // Largeur fixe pour un bouton carré
    height: 56, // Hauteur identique pour un carré parfait
    minWidth: 56,
    flex: 0, // Pas de flex pour garder la taille fixe
    paddingHorizontal: 0, // Supprimer tous les paddings
    paddingVertical: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    justifyContent: 'center',
    alignItems: 'center'
  },
  tricheButtonColor: {
    backgroundColor: '#FF9800' // Orange
  },
  tricheIconContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    top: 0
  },
  addButton: {
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3
  },
  recentCard: {
    marginBottom: 16
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  recentList: {
    gap: 8
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  activityContent: {
    flex: 1,
    marginLeft: 12
  },
  activityMessage: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2
  },
  activityTime: {
    fontSize: 12
  },
  activityIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  groupCard: {
    marginBottom: 16
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  groupStats: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  groupStat: {
    alignItems: 'center'
  },
  groupStatValue: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4
  },
  groupStatLabel: {
    fontSize: 12
  },
  alcoholIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    marginVertical: 12,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  alcoholItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  alcoholInfo: {
    alignItems: 'flex-start'
  },
  alcoholValue: {
    fontSize: 18,
    fontWeight: '600'
  },
  alcoholLabel: {
    fontSize: 12
  },
  alcoholDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e2e8f0'
  },
  eliminationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8
  },
  eliminationText: {
    fontSize: 12,
    fontWeight: '500'
  },
  limitsInfo: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  limitsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4
  },
  limitsText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16
  },
  completeProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 8
  },
  completeProfileText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center'
  },
  speedAnalysis: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  speedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  speedTitle: {
    fontSize: 13,
    fontWeight: '600'
  },
  speedDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  speedText: {
    fontSize: 12,
    fontWeight: '500'
  },
  speedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  speedBadgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  speedImpact: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4
  },
  tricheModalContent: {
    alignItems: 'center',
    paddingVertical: 12,
    width: '100%'
  },
  tricheModalWrapper: {
    maxWidth: 280,
    alignSelf: 'center'
  },
  tricheModalHeader: {
    alignItems: 'center',
    marginBottom: 16
  },
  tricheModalEmoji: {
    fontSize: 48,
    marginBottom: 8
  },
  tricheModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5
  },
  tricheModalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22
  },
  tricheModalSubtext: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
    opacity: 0.7
  },
  tricheModalButtons: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    paddingHorizontal: 4
  },
  tricheModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tricheCancelButton: {
    borderWidth: 1
  },
  tricheConfirmButton: {
    backgroundColor: '#FF9800', // Orange
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  tricheButtonText: {
    fontSize: 14,
    fontWeight: '600'
  },
  tricheConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000' // Black text on orange background
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginLeft: 8
  },
  activityBadgeText: {
    fontSize: 10,
    fontWeight: '600'
  },
  alertAndSleepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  sleepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  sleepText: {
    fontSize: 10,
    fontWeight: '600'
  },
  tricheStatsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 8
  },
  tricheStatsText: {
    fontSize: 13,
    fontWeight: '600'
  }
});