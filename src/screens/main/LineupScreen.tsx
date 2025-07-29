import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { useGroupContext } from '../../context/GroupContext';
import { useLineup } from '../../hooks/useLineup';
import { useFavorites } from '../../hooks/useFavorites';
import { useSocialFavorites } from '../../hooks/useSocialFavorites';
import { LineupEvent } from '../../types';
import { format, parseISO, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { getStageColor, FAVORITE_COLORS } from '../../utils/constants';
import { EventFavoriteModal } from '../../components/lineup/EventFavoriteModal';
import { AvatarStack } from '../../components/ui/AvatarStack';

interface LineupScreenProps {
  navigation: any;
}

export function LineupScreen({ navigation }: LineupScreenProps) {
  const { colors, theme } = useTheme();
  const { user } = useAuthContext();
  const { group, isAdmin } = useGroupContext();
  const { 
    lineup, 
    currentlyPlaying, 
    isLoading, 
    error, 
    refresh,
    getDayEvents,
    getAvailableDates,
    hasLineup,
    initializeLineup
  } = useLineup(group?.id || null);

  const {
    isFavorite,
    toggleFavorite,
    updateReminderMinutes,
    getFavorite
  } = useFavorites(user?.id || null, group?.id || null);

  const {
    getEventFavoriteUsers,
    getMultipleEventsSocialData,
    invalidateEventCache
  } = useSocialFavorites();

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<LineupEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  // Auto-refresh quand on navigue vers cet onglet
  useFocusEffect(
    useCallback(() => {
      console.log('LineupScreen - Focus gained, refreshing data...');
      const timeoutId = setTimeout(() => {
        refresh();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }, [])
  );

  // Sélectionner la date par défaut (aujourd'hui ou première date disponible)
  useEffect(() => {
    if (lineup && !selectedDate) {
      const today = format(new Date(), 'yyyy-MM-dd');
      const availableDates = getAvailableDates();
      
      if (availableDates.includes(today)) {
        setSelectedDate(today);
      } else if (availableDates.length > 0) {
        setSelectedDate(availableDates[0]);
      }
    }
  }, [lineup, selectedDate, getAvailableDates]);

  // Charger les données sociales pour les événements du jour sélectionné
  useEffect(() => {
    if (selectedDate && lineup) {
      const dayEvents = getDayEvents(selectedDate);
      const eventIds = dayEvents.map(event => event.id);
      
      if (eventIds.length > 0) {
        // Utiliser un timeout pour éviter les boucles infinies
        const timeoutId = setTimeout(() => {
          getMultipleEventsSocialData(eventIds);
        }, 100);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [selectedDate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleInitializeLineup = async () => {
    if (!user?.id) return;
    
    try {
      await initializeLineup(['Main Stage'], user.id);
      Alert.alert('Succès', 'Programmation initialisée avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'initialiser la programmation');
    }
  };

  const handleManageLineup = () => {
    navigation.navigate('LineupManage');
  };

  const handleEventPress = (event: LineupEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleCloseEventModal = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
  };

  const handleToggleFavorite = async (eventId: string, reminderMinutes: number = 15) => {
    const success = await toggleFavorite(eventId, reminderMinutes);
    if (success) {
      // Invalider le cache social pour cet événement
      invalidateEventCache(eventId);
    }
    return success;
  };

  const renderEvent = (event: LineupEvent) => {
    const isLive = currentlyPlaying.event?.id === event.id;
    const startTime = format(event.startTime, 'HH:mm');
    const endTime = format(event.endTime, 'HH:mm');
    const stageColor = getStageColor(event.stageName);
    const isEventFavorite = isFavorite(event.id);
    const favoriteUsers = getEventFavoriteUsers(event.id);
    
    return (
      <TouchableOpacity
        key={event.id}
        onPress={() => handleEventPress(event)}
        activeOpacity={0.7}
      >
        <Card 
          style={[
            styles.eventCard,
            { borderLeftColor: stageColor, borderLeftWidth: 4 },
            isLive && { borderColor: stageColor, borderWidth: 2 },
            isEventFavorite && { 
              borderColor: FAVORITE_COLORS.gold, 
              borderWidth: 2,
              backgroundColor: FAVORITE_COLORS.goldLight
            }
          ]}
        >
        <View style={styles.eventHeader}>
          <View style={styles.timeContainer}>
            <Text style={[styles.eventTime, { color: isEventFavorite ? '#333333' : colors.text }]}>
              {startTime} - {endTime}
            </Text>
            {isLive && (
              <View style={[styles.liveIndicator, { backgroundColor: stageColor }]}>
                <Text style={styles.liveText}>EN COURS</Text>
              </View>
            )}
          </View>
          <View style={styles.eventHeaderRight}>
            <View style={[styles.stageTag, { backgroundColor: stageColor }]}>
              <Text style={[styles.stageText, { color: '#ffffff' }]}>
                {event.stageName}
              </Text>
            </View>
            {isEventFavorite && (
              <Ionicons 
                name="star" 
                size={20} 
                color={FAVORITE_COLORS.gold}
                style={styles.favoriteIcon}
              />
            )}
          </View>
        </View>
        
        <Text style={[styles.artistName, { color: isEventFavorite ? '#333333' : colors.text }]}>
          {event.artistName}
        </Text>
        
        {event.genre && (
          <Text style={[styles.eventGenre, { color: isEventFavorite ? '#666666' : colors.textLight }]}>
            {event.genre}
          </Text>
        )}
        
        {event.description && (
          <Text style={[styles.eventDescription, { color: isEventFavorite ? '#666666' : colors.textLight }]}>
            {event.description}
          </Text>
        )}

        {favoriteUsers.length > 0 && (
          <View style={styles.socialSection}>
            <AvatarStack 
              users={favoriteUsers}
              maxVisible={3}
              size="small"
              showCount={false}
            />
          </View>
        )}
        </Card>
      </TouchableOpacity>
    );
  };

  const renderDayTabs = () => {
    const availableDates = getAvailableDates();
    
    if (availableDates.length === 0) return null;

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.dayTabs}
        contentContainerStyle={styles.dayTabsContent}
      >
        {availableDates.map(date => {
          const dateObj = parseISO(date);
          const isSelected = selectedDate === date;
          const isToday_ = isToday(dateObj);
          
          return (
            <TouchableOpacity
              key={date}
              onPress={() => setSelectedDate(date)}
              style={[
                styles.dayTab,
                isSelected && { backgroundColor: colors.primary },
                { borderColor: colors.border }
              ]}
            >
              <Text style={[
                styles.dayTabText,
                { color: isSelected ? '#ffffff' : colors.text }
              ]}>
                {format(dateObj, 'EEE', { locale: fr })}
              </Text>
              <Text style={[
                styles.dayTabDate,
                { color: isSelected ? '#ffffff' : colors.textLight }
              ]}>
                {format(dateObj, 'dd/MM')}
              </Text>
              {isToday_ && (
                <View style={[styles.todayDot, { backgroundColor: isSelected ? '#ffffff' : colors.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const renderStageFilter = () => {
    if (!lineup?.stages || lineup.stages.length <= 1) return null;

    const stages = ['all', ...lineup.stages];
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.stageFilter}
        contentContainerStyle={styles.stageFilterContent}
      >
        {stages.map(stage => {
          const isSelected = selectedStage === stage;
          const displayName = stage === 'all' ? 'Tout' : stage;
          const stageColor = stage === 'all' ? colors.primary : getStageColor(stage);
          
          return (
            <TouchableOpacity
              key={stage}
              onPress={() => setSelectedStage(stage)}
              style={[
                styles.stageFilterTab,
                {
                  backgroundColor: isSelected ? stageColor : colors.surface,
                  borderColor: stageColor,
                  borderWidth: isSelected ? 0 : 1
                }
              ]}
            >
              <Text style={[
                styles.stageFilterText,
                { color: isSelected ? '#ffffff' : stageColor }
              ]}>
                {displayName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const getFilteredEvents = () => {
    const dayEvents = getDayEvents(selectedDate);
    
    if (selectedStage === 'all') {
      return dayEvents;
    }
    
    return dayEvents.filter(event => event.stageName === selectedStage);
  };

  const renderEventsInColumns = () => {
    const dayEvents = getDayEvents(selectedDate);
    
    if (dayEvents.length === 0) {
      return (
        <View style={styles.noEventsContainer}>
          <Ionicons name="calendar" size={48} color={colors.textLight} />
          <Text style={[styles.noEventsText, { color: colors.textLight }]}>
            Aucun événement programmé pour cette journée
          </Text>
        </View>
      );
    }

    // Grouper les événements par scène
    const eventsByStage = dayEvents.reduce((acc, event) => {
      if (!acc[event.stageName]) {
        acc[event.stageName] = [];
      }
      acc[event.stageName].push(event);
      return acc;
    }, {} as Record<string, LineupEvent[]>);

    const stages = Object.keys(eventsByStage);

    return (
      <View style={styles.columnsContainer}>
        {stages.map(stageName => {
          const stageEvents = eventsByStage[stageName];
          const stageColor = getStageColor(stageName);
          
          return (
            <View key={stageName} style={styles.stageColumn}>
              <View style={[styles.stageHeader, { backgroundColor: stageColor }]}>
                <Text style={styles.stageHeaderText}>{stageName}</Text>
              </View>
              
              <ScrollView style={styles.stageEvents} showsVerticalScrollIndicator={false}>
                {stageEvents.map(event => {
                  const isLive = currentlyPlaying.event?.id === event.id;
                  const isEventFavorite = isFavorite(event.id);
                  const favoriteUsers = getEventFavoriteUsers(event.id);
                  
                  return (
                    <TouchableOpacity
                      key={event.id}
                      onPress={() => handleEventPress(event)}
                      activeOpacity={0.7}
                    >
                      <Card 
                        style={[
                          styles.columnEventCard,
                          { borderLeftColor: stageColor, borderLeftWidth: 3 },
                          isLive && { borderColor: stageColor, borderWidth: 2 },
                          isEventFavorite && { 
                            borderColor: FAVORITE_COLORS.gold, 
                            borderWidth: 2,
                            backgroundColor: FAVORITE_COLORS.goldLight
                          }
                        ]}
                      >
                      <View style={styles.columnEventHeader}>
                        <Text style={[styles.columnEventTime, { color: isEventFavorite ? '#333333' : colors.text }]}>
                          {format(event.startTime, 'HH:mm')}
                        </Text>
                        <View style={styles.columnEventIndicators}>
                          {isLive && (
                            <View style={[styles.liveIndicator, { backgroundColor: stageColor }]}>
                              <Text style={styles.liveText}>LIVE</Text>
                            </View>
                          )}
                          {isEventFavorite && (
                            <Ionicons 
                              name="star" 
                              size={16} 
                              color={FAVORITE_COLORS.gold}
                            />
                          )}
                        </View>
                      </View>
                      
                      <Text style={[styles.columnArtistName, { color: isEventFavorite ? '#333333' : colors.text }]} numberOfLines={2}>
                        {event.artistName}
                      </Text>
                      
                      {event.genre && (
                        <Text style={[styles.columnEventGenre, { color: isEventFavorite ? '#666666' : colors.textLight }]} numberOfLines={1}>
                          {event.genre}
                        </Text>
                      )}

                      {favoriteUsers.length > 0 && (
                        <View style={styles.columnSocialSection}>
                          <AvatarStack 
                            users={favoriteUsers}
                            maxVisible={2}
                            size="small"
                            showCount={false}
                          />
                        </View>
                      )}
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          );
        })}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner text="Chargement de la programmation..." />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error}
          </Text>
          <Button title="Réessayer" onPress={refresh} />
        </View>
      </View>
    );
  }

  if (!hasLineup && isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes" size={64} color={colors.textLight} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Aucune programmation
          </Text>
          <Text style={[styles.emptyText, { color: colors.textLight }]}>
            Créez la programmation de votre festival pour que les membres puissent voir les artistes.
          </Text>
          <Button
            title="Créer la programmation"
            onPress={handleInitializeLineup}
            icon={<Ionicons name="add" size={20} color="#ffffff" />}
          />
        </View>
      </View>
    );
  }

  if (!hasLineup) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes" size={64} color={colors.textLight} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Programmation non disponible
          </Text>
          <Text style={[styles.emptyText, { color: colors.textLight }]}>
            L'organisateur n'a pas encore créé la programmation du festival.
          </Text>
        </View>
      </View>
    );
  }

  const filteredEvents = getFilteredEvents();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Line-up
        </Text>
        {isAdmin && (
          <TouchableOpacity onPress={handleManageLineup}>
            <Ionicons name="settings" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Indicateur événement en cours */}
      {currentlyPlaying.isLive && (
        <Card style={[styles.liveCard, { backgroundColor: colors.primary }]}>
          <View style={styles.liveCardContent}>
            <Ionicons name="radio" size={20} color="#ffffff" />
            <View style={styles.liveInfo}>
              <Text style={styles.liveCardTitle}>
                En cours sur {currentlyPlaying.event?.stageName}
              </Text>
              <Text style={styles.liveCardArtist}>
                {currentlyPlaying.event?.artistName}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Onglets des jours */}
      {renderDayTabs()}

      {/* Filtre par scène */}
      {renderStageFilter()}

      {/* Liste des événements */}
      {selectedStage === 'all' ? (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
            />
          }
        >
          {renderEventsInColumns()}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
            />
          }
        >
          {getFilteredEvents().length === 0 ? (
            <View style={styles.noEventsContainer}>
              <Ionicons name="calendar" size={48} color={colors.textLight} />
              <Text style={[styles.noEventsText, { color: colors.textLight }]}>
                Aucun événement programmé pour cette journée
              </Text>
            </View>
          ) : (
            getFilteredEvents().map(renderEvent)
          )}
        </ScrollView>
      )}

      {/* Modal Favoris */}
      <EventFavoriteModal
        visible={showEventModal}
        event={selectedEvent}
        favorite={selectedEvent ? (getFavorite(selectedEvent.id) || null) : null}
        isFavorite={selectedEvent ? isFavorite(selectedEvent.id) : false}
        onClose={handleCloseEventModal}
        onToggleFavorite={handleToggleFavorite}
        onUpdateReminder={updateReminderMinutes}
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
    fontSize: 20,
    fontWeight: '600'
  },
  liveCard: {
    margin: 16,
    marginBottom: 8
  },
  liveCardContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  liveInfo: {
    marginLeft: 12,
    flex: 1
  },
  liveCardTitle: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.9
  },
  liveCardArtist: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  dayTabs: {
    flexGrow: 0,
    marginHorizontal: 16,
    marginVertical: 8
  },
  dayTabsContent: {
    paddingRight: 16
  },
  dayTab: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    position: 'relative'
  },
  dayTabText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  dayTabDate: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2
  },
  todayDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3
  },
  stageFilter: {
    flexGrow: 0,
    marginHorizontal: 16,
    marginBottom: 8
  },
  stageFilterContent: {
    paddingRight: 16
  },
  stageFilterTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8
  },
  stageFilterText: {
    fontSize: 14,
    fontWeight: '500'
  },
  content: {
    flex: 1,
    padding: 16
  },
  eventCard: {
    marginBottom: 12
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  eventTime: {
    fontSize: 14,
    fontWeight: '600'
  },
  liveIndicator: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  liveText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600'
  },
  stageTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  stageText: {
    fontSize: 12,
    fontWeight: '500'
  },
  artistName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4
  },
  eventGenre: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4
  },
  eventDescription: {
    fontSize: 14,
    lineHeight: 20
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center'
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 48
  },
  noEventsText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16
  },
  // Styles pour l'affichage en colonnes
  columnsContainer: {
    flexDirection: 'row',
    flex: 1,
    gap: 8
  },
  stageColumn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16
  },
  stageHeader: {
    padding: 12,
    alignItems: 'center'
  },
  stageHeaderText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  stageEvents: {
    flex: 1,
    padding: 8
  },
  columnEventCard: {
    marginBottom: 8,
    padding: 12
  },
  columnEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  columnEventTime: {
    fontSize: 12,
    fontWeight: '600'
  },
  columnArtistName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4
  },
  columnEventGenre: {
    fontSize: 10,
    fontWeight: '500'
  },
  // Styles pour les favoris
  eventHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  favoriteIcon: {
    marginLeft: 4
  },
  columnEventIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  // Styles pour les sections sociales
  socialSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  columnSocialSection: {
    marginTop: 6
  }
});