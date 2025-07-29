import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { DrinkItem } from '../../components/drink/DrinkItem';
import { TimeSeparator } from '../../components/drink/TimeSeparator';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { useGroupContext } from '../../context/GroupContext';
import { useDrinks } from '../../hooks/useDrinks';
import { useStats } from '../../hooks/useStats';
import locationRequestService from '../../services/locationRequestService';
import locationService from '../../services/locationService';
import { formatUnits, estimateBloodAlcoholContent, getAlertLevel } from '../../utils/calculations';
import { LocationRequest, LocationShare } from '../../types/location';
import { eventBus, EVENTS } from '../../utils/eventBus';
import { formatDate, groupByDay } from '../../utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { parseAvatarString } from '../../utils/iconMappings';

interface MemberProfileScreenProps {
  navigation: any;
  route: {
    params: {
      memberId: string;
    };
  };
}

export function MemberProfileScreen({ navigation, route }: MemberProfileScreenProps) {
  const { colors } = useTheme();
  const { user } = useAuthContext();
  const { group } = useGroupContext();
  const { drinks, isLoading } = useDrinks(group?.id || null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [currentLocationRequest, setCurrentLocationRequest] = useState<LocationRequest | null>(null);
  const [currentLocationShare, setCurrentLocationShare] = useState<LocationShare | null>(null);
  const [requestTimeLeft, setRequestTimeLeft] = useState<number>(0);
  const memberId = route.params.memberId;
  
  const member = group?.members[memberId];
  
  // Filtrer les boissons du membre
  const memberDrinks = useMemo(() => {
    return drinks.filter(d => d.userId === memberId);
  }, [drinks, memberId]);

  // Utiliser le hook de stats pour ce membre
  const { userStats, todayUnits, todayDrinks, currentUnits, alertLevel } = useStats(
    memberDrinks,
    memberId,
    group ? Object.values(group.members) : []
  );

  // Estimation du taux d'alcoolémie (avec données par défaut si pas de profil)
  const { bloodAlcohol, breathAlcohol } = estimateBloodAlcoholContent(
    currentUnits,
    member?.profile?.weight || 70, // Poids par défaut 70kg
    member?.profile?.gender === 'male' // Par défaut homme
  );

  // Fonctions utilitaires pour les alertes
  const getAlertColor = () => {
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

  // Écouter les événements de localisation
  useEffect(() => {
    const handleLocationResponse = (data: any) => {
      if (data.request?.toUserId === memberId && data.request?.fromUserId === user?.id) {
        if (data.status === 'accepted' && data.location) {
          // Créer un partage de localisation factice à partir de la réponse
          const locationShare: LocationShare = {
            id: `share_${Date.now()}`,
            fromUserId: memberId,
            fromUserName: member?.name || 'Utilisateur',
            toUserId: user.id,
            groupId: group?.id || '',
            location: data.location,
            sharedAt: new Date(),
            viewed: false
          };
          setCurrentLocationShare(locationShare);
          setCurrentLocationRequest(null);
        } else if (data.status === 'declined') {
          setCurrentLocationRequest(prev => prev ? { ...prev, status: 'declined' } : null);
        }
      }
    };

    const handleLocationRequestExpired = (data: any) => {
      if (data.requestId === currentLocationRequest?.id) {
        setCurrentLocationRequest(prev => prev ? { ...prev, status: 'expired' } : null);
      }
    };

    eventBus.on(EVENTS.LOCATION_REQUEST_RESPONDED, handleLocationResponse);
    eventBus.on(EVENTS.LOCATION_REQUEST_EXPIRED, handleLocationRequestExpired);

    return () => {
      eventBus.off(EVENTS.LOCATION_REQUEST_RESPONDED, handleLocationResponse);
      eventBus.off(EVENTS.LOCATION_REQUEST_EXPIRED, handleLocationRequestExpired);
    };
  }, [memberId, user?.id, currentLocationRequest?.id, member?.name, group?.id]);

  // Timer pour le compte à rebours
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentLocationRequest && currentLocationRequest.status === 'pending') {
      interval = setInterval(() => {
        const now = new Date();
        const timeLeft = Math.max(0, Math.floor((currentLocationRequest.expiresAt.getTime() - now.getTime()) / 1000));
        
        setRequestTimeLeft(timeLeft);
        
        if (timeLeft === 0) {
          setCurrentLocationRequest(prev => prev ? { ...prev, status: 'expired' } : null);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentLocationRequest]);

  // Vérifier les demandes existantes au chargement
  useEffect(() => {
    if (user?.id && group?.id) {
      checkExistingRequests();
      checkRecentShares();
    }
  }, [user?.id, group?.id, memberId]);

  const checkExistingRequests = async () => {
    try {
      const sentRequests = await locationRequestService.getSentRequests(user!.id);
      const pendingRequest = sentRequests.find(req => 
        req.toUserId === memberId && req.status === 'pending'
      );
      
      if (pendingRequest) {
        const now = new Date();
        if (now <= pendingRequest.expiresAt) {
          setCurrentLocationRequest(pendingRequest);
          const timeLeft = Math.floor((pendingRequest.expiresAt.getTime() - now.getTime()) / 1000);
          setRequestTimeLeft(timeLeft);
        }
      }
    } catch (error) {
      console.error('Error checking existing requests:', error);
    }
  };

  const checkRecentShares = async () => {
    try {
      const receivedShares = await locationRequestService.getReceivedShares(user!.id);
      const recentShare = receivedShares.find(share => 
        share.fromUserId === memberId && !share.viewed
      );
      
      if (recentShare) {
        // Vérifier si le partage n'est pas trop ancien (ex: moins de 30 minutes)
        const now = new Date();
        const shareAge = (now.getTime() - recentShare.sharedAt.getTime()) / (1000 * 60);
        
        if (shareAge < 30) {
          setCurrentLocationShare(recentShare);
        }
      }
    } catch (error) {
      console.error('Error checking recent shares:', error);
    }
  };

  // Fonction pour demander la localisation
  const handleRequestLocation = async () => {
    if (!user || !group || !member) return;
    
    // Éviter de demander sa propre localisation
    if (memberId === user.id) return;

    try {
      setIsRequestingLocation(true);
      
      const requestId = await locationRequestService.sendLocationRequest(
        user.id,
        user.name,
        memberId,
        member.name,
        group.id
      );

      // Créer l'objet de demande locale
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
      
      const newRequest: LocationRequest = {
        id: requestId,
        fromUserId: user.id,
        fromUserName: user.name,
        toUserId: memberId,
        toUserName: member.name,
        groupId: group.id,
        status: 'pending',
        createdAt: now,
        expiresAt
      };

      setCurrentLocationRequest(newRequest);
      setCurrentLocationShare(null); // Clear any previous share
      setRequestTimeLeft(5 * 60); // 5 minutes in seconds
      
    } catch (error) {
      console.error('Error requesting location:', error);
      // TODO: Afficher un toast d'erreur
    } finally {
      setIsRequestingLocation(false);
    }
  };

  // Fonction pour annuler la demande
  const handleCancelRequest = async () => {
    if (!currentLocationRequest) return;

    try {
      await locationRequestService.cancelLocationRequest(currentLocationRequest.id);
      setCurrentLocationRequest(null);
      setRequestTimeLeft(0);
    } catch (error) {
      console.error('Error cancelling request:', error);
    }
  };

  // Fonction pour ouvrir dans Maps
  const handleOpenInMaps = async () => {
    if (!currentLocationShare) return;

    try {
      await locationService.openInMaps(
        currentLocationShare.location.coordinates.latitude,
        currentLocationShare.location.coordinates.longitude,
        `Position de ${currentLocationShare.fromUserName}`
      );

      // Marquer comme vu
      if (!currentLocationShare.viewed) {
        await locationRequestService.markShareAsViewed(currentLocationShare.id);
        setCurrentLocationShare(prev => prev ? { ...prev, viewed: true } : null);
      }
    } catch (error) {
      console.error('Error opening maps:', error);
    }
  };

  // Fonction pour formater le temps restant
  const formatTimeLeft = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Fonction pour fermer/réinitialiser l'état de localisation
  const handleCloseLocationCard = () => {
    setCurrentLocationShare(null);
    setCurrentLocationRequest(null);
    setRequestTimeLeft(0);
  };

  // Grouper les boissons par jour
  const groupedDrinks = groupByDay(memberDrinks);
  const sortedDays = Array.from(groupedDrinks.entries())
    .sort(([a], [b]) => b.localeCompare(a));

  if (!member) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          Membre introuvable
        </Text>
      </View>
    );
  }

  if (isLoading && memberDrinks.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <LoadingSpinner text="Chargement..." fullScreen />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* En-tête du profil */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Avatar 
              avatarData={member.avatar ? parseAvatarString(member.avatar) : undefined}
              name={member.name} 
              size="large" 
            />
            <Text style={[styles.memberName, { color: colors.text }]}>
              {member.name}
            </Text>
            <View style={styles.roleContainer}>
              {member.role === 'creator' && (
                <View style={[styles.roleBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="star" size={14} color="#ffffff" />
                  <Text style={styles.roleText}>Créateur</Text>
                </View>
              )}
              {member.role === 'admin' && (
                <View style={[styles.roleBadge, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="shield" size={14} color="#ffffff" />
                  <Text style={styles.roleText}>Admin</Text>
                </View>
              )}
            </View>
          </View>

          {/* Statistiques */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {userStats.totalDrinks}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>
                Boissons totales
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {formatUnits(userStats.totalUnits)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>
                Unités totales
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatUnits(userStats.dailyAverage)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>
                Moyenne/jour
              </Text>
            </View>
          </View>

          {/* Stats du jour */}
          <View style={[styles.todayStats, { backgroundColor: colors.surface }]}>
            <View style={styles.statsHeader}>
              <Text style={[styles.todayTitle, { color: colors.text }]}>
                Aujourd'hui
              </Text>
              <View style={[styles.alertBadge, { backgroundColor: getAlertColor() }]}>
                <Text style={styles.alertBadgeText}>{alertLevel.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.statsContent}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {todayDrinks}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  Boissons
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {formatUnits(currentUnits)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  Unités actuelles
                </Text>
              </View>
            </View>

            <View style={[styles.alcoholIndicators, { backgroundColor: colors.surface }]}>
              <View style={styles.alcoholItem}>
                <Ionicons name="water" size={20} color={colors.primary} />
                <View style={styles.alcoholInfo}>
                  <Text style={[styles.alcoholValue, { color: colors.text }]}>
                    {bloodAlcohol} g/L
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
                    {breathAlcohol} mg/L
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
          </View>

          {/* Section de localisation */}
          {user && memberId !== user.id && (
            <View style={styles.locationSection}>
              {/* Bouton initial ou état par défaut */}
              {!currentLocationRequest && !currentLocationShare && (
                <Button
                  title={isRequestingLocation ? 'Envoi en cours...' : 'Demander la localisation'}
                  onPress={handleRequestLocation}
                  disabled={isRequestingLocation}
                  variant="secondary"
                  icon={
                    isRequestingLocation ? 
                      <LoadingSpinner size="small" color={colors.textLight} /> :
                      <Ionicons name="location" size={18} color={colors.primary} />
                  }
                />
              )}

              {/* Carte d'attente */}
              {currentLocationRequest && currentLocationRequest.status === 'pending' && (
                <View style={[styles.locationCard, { backgroundColor: colors.background }]}>
                  <View style={styles.locationCardHeader}>
                    <View style={styles.locationCardTitle}>
                      <LoadingSpinner size="small" color={colors.primary} />
                      <Text style={[styles.locationCardTitleText, { color: colors.text }]}>
                        Demande envoyée
                      </Text>
                    </View>
                    <TouchableOpacity onPress={handleCloseLocationCard}>
                      <Ionicons name="close" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.locationCardMessage, { color: colors.textLight }]}>
                    En attente de la réponse de {member?.name}...
                  </Text>
                  {requestTimeLeft > 0 && (
                    <View style={styles.locationCardTimer}>
                      <Ionicons name="time-outline" size={16} color={colors.textLight} />
                      <Text style={[styles.locationCardTimerText, { color: colors.textLight }]}>
                        Expire dans {formatTimeLeft(requestTimeLeft)}
                      </Text>
                    </View>
                  )}
                  <Button
                    title="Annuler la demande"
                    onPress={handleCancelRequest}
                    variant="ghost"
                    style={styles.locationCardButton}
                  />
                </View>
              )}

              {/* Carte de refus */}
              {currentLocationRequest && currentLocationRequest.status === 'declined' && (
                <View style={[styles.locationCard, { backgroundColor: colors.background }]}>
                  <View style={styles.locationCardHeader}>
                    <View style={styles.locationCardTitle}>
                      <Ionicons name="close-circle" size={20} color={colors.danger} />
                      <Text style={[styles.locationCardTitleText, { color: colors.text }]}>
                        Demande refusée
                      </Text>
                    </View>
                    <TouchableOpacity onPress={handleCloseLocationCard}>
                      <Ionicons name="close" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.locationCardMessage, { color: colors.textLight }]}>
                    {member?.name} a refusé de partager sa position.
                  </Text>
                  <Button
                    title="Faire une nouvelle demande"
                    onPress={handleRequestLocation}
                    variant="secondary"
                    style={styles.locationCardButton}
                    disabled={isRequestingLocation}
                  />
                </View>
              )}

              {/* Carte d'expiration */}
              {currentLocationRequest && currentLocationRequest.status === 'expired' && (
                <View style={[styles.locationCard, { backgroundColor: colors.background }]}>
                  <View style={styles.locationCardHeader}>
                    <View style={styles.locationCardTitle}>
                      <Ionicons name="time-outline" size={20} color={colors.warning} />
                      <Text style={[styles.locationCardTitleText, { color: colors.text }]}>
                        Demande expirée
                      </Text>
                    </View>
                    <TouchableOpacity onPress={handleCloseLocationCard}>
                      <Ionicons name="close" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.locationCardMessage, { color: colors.textLight }]}>
                    {member?.name} n'a pas répondu à temps.
                  </Text>
                  <Button
                    title="Faire une nouvelle demande"
                    onPress={handleRequestLocation}
                    variant="secondary"
                    style={styles.locationCardButton}
                    disabled={isRequestingLocation}
                  />
                </View>
              )}

              {/* Carte de position reçue */}
              {currentLocationShare && (
                <View style={[styles.locationCard, { backgroundColor: colors.background }]}>
                  <View style={styles.locationCardHeader}>
                    <View style={styles.locationCardTitle}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                      <Text style={[styles.locationCardTitleText, { color: colors.text }]}>
                        Position reçue
                      </Text>
                    </View>
                    <TouchableOpacity onPress={handleCloseLocationCard}>
                      <Ionicons name="close" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.locationCardMessage, { color: colors.textLight }]}>
                    {member?.name} a partagé sa position actuelle.
                  </Text>
                  <View style={styles.locationCardDetails}>
                    <View style={styles.locationCardRow}>
                      <Ionicons name="navigate" size={16} color={colors.textLight} />
                      <Text style={[styles.locationCardCoords, { color: colors.textLight }]}>
                        {currentLocationShare.location.coordinates.latitude.toFixed(4)}, 
                        {currentLocationShare.location.coordinates.longitude.toFixed(4)}
                      </Text>
                    </View>
                    {currentLocationShare.location.address && (
                      <View style={styles.locationCardRow}>
                        <Ionicons name="location-outline" size={16} color={colors.textLight} />
                        <Text style={[styles.locationCardAddress, { color: colors.textLight }]}>
                          {currentLocationShare.location.address}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Button
                    title="Ouvrir dans Maps"
                    onPress={handleOpenInMaps}
                    variant="primary"
                    style={styles.locationCardButton}
                    icon={<Ionicons name="map" size={18} color="#ffffff" />}
                  />
                </View>
              )}
            </View>
          )}
        </Card>

        {/* Boisson préférée */}
        {userStats.favoriteType && (
          <Card style={styles.favoriteCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Boisson préférée
            </Text>
            <Text style={[styles.favoriteType, { color: colors.primary }]}>
              {userStats.favoriteType.split(':')[1]}
            </Text>
          </Card>
        )}

        {/* Historique des boissons */}
        <Card style={styles.historyCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Historique des boissons
          </Text>
          
          {sortedDays.length > 0 ? (
            <View style={styles.historyContent}>
              {sortedDays.map(([dateStr, dayDrinks]) => (
                <View key={dateStr} style={styles.daySection}>
                  <Text style={[styles.dayHeader, { color: colors.text }]}>
                    {formatDate(new Date(dateStr), 'EEEE dd/MM')}
                  </Text>
                  <Text style={[styles.dayCount, { color: colors.textLight }]}>
                    {dayDrinks.length} boisson{dayDrinks.length > 1 ? 's' : ''}
                  </Text>
                  <View style={styles.dayDrinks}>
                    {dayDrinks.map((drink, index) => (
                      <React.Fragment key={drink.id}>
                        <DrinkItem
                          drink={drink}
                          showUser={false}
                          compact
                        />
                        {index < dayDrinks.length - 1 && (
                          <TimeSeparator
                            minutes={Math.floor(
                              (dayDrinks[index].timestamp.getTime() - dayDrinks[index + 1].timestamp.getTime()) / 60000
                            )}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="wine-outline" size={48} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>
                Aucune boisson enregistrée
              </Text>
            </View>
          )}
        </Card>
      </ScrollView>
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
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 32
  },
  profileCard: {
    marginBottom: 16
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24
  },
  memberName: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 8
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16
  },
  roleText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12
  },
  todayStats: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8
  },
  todayTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8
  },
  todayValues: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  todayValue: {
    fontSize: 14,
    fontWeight: '500'
  },
  favoriteCard: {
    marginBottom: 16,
    alignItems: 'center'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12
  },
  favoriteType: {
    fontSize: 20,
    fontWeight: '500'
  },
  historyCard: {
    marginBottom: 32
  },
  historyContent: {
    marginTop: 16
  },
  daySection: {
    marginBottom: 16
  },
  dayHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  dayCount: {
    fontSize: 12,
    marginBottom: 8
  },
  dayDrinks: {
    gap: 1
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12
  },
  // Styles pour le taux d'alcool
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  alertBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  alertBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600'
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16
  },
  alcoholIndicators: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  alcoholItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  alcoholInfo: {
    flex: 1
  },
  alcoholValue: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2
  },
  alcoholLabel: {
    fontSize: 12
  },
  alcoholDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 16
  },
  alertMessage: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center'
  },
  // Styles pour la section de localisation
  locationSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  locationCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  locationCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  locationCardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  locationCardTitleText: {
    fontSize: 16,
    fontWeight: '600'
  },
  locationCardMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12
  },
  locationCardTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  locationCardTimerText: {
    fontSize: 12,
    fontWeight: '500'
  },
  locationCardButton: {
    marginTop: 8
  },
  locationCardDetails: {
    marginBottom: 12,
    gap: 8
  },
  locationCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  locationCardCoords: {
    fontSize: 13,
    fontFamily: 'monospace'
  },
  locationCardAddress: {
    fontSize: 13,
    flex: 1
  }
});