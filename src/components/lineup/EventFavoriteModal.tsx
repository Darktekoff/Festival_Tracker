import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { AvatarStack } from '../ui/AvatarStack';
import { parseAvatarString } from '../../utils/iconMappings';
import { useTheme } from '../../context/ThemeContext';
import { useGroupContext } from '../../context/GroupContext';
import { useSocialFavorites } from '../../hooks/useSocialFavorites';
import { LineupEvent, UserFavorite } from '../../types';
import { getStageColor, FAVORITE_COLORS, REMINDER_OPTIONS } from '../../utils/constants';
import { useNotifications } from '../../hooks/useNotifications';
import { format } from 'date-fns';

interface EventFavoriteModalProps {
  visible: boolean;
  event: LineupEvent | null;
  favorite: UserFavorite | null;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: (eventId: string, reminderMinutes: number) => Promise<boolean>;
  onUpdateReminder: (eventId: string, reminderMinutes: number) => Promise<boolean>;
}

export function EventFavoriteModal({
  visible,
  event,
  favorite,
  isFavorite,
  onClose,
  onToggleFavorite,
  onUpdateReminder
}: EventFavoriteModalProps) {
  const { colors } = useTheme();
  const { group } = useGroupContext();
  const { getEventSocialData } = useSocialFavorites();
  const { scheduleForFavorite, cancelForFavorite } = useNotifications();
  const [selectedReminderMinutes, setSelectedReminderMinutes] = useState(
    (favorite && typeof favorite === 'object' && favorite.reminderMinutes) ? favorite.reminderMinutes : 15
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [eventSocialData, setEventSocialData] = useState<any>(null);

  // Mettre à jour selectedReminderMinutes quand favorite change
  useEffect(() => {
    if (favorite && typeof favorite === 'object' && favorite.reminderMinutes) {
      setSelectedReminderMinutes(favorite.reminderMinutes);
    } else {
      setSelectedReminderMinutes(15);
    }
  }, [favorite]);

  // Charger les données sociales quand la modal s'ouvre
  useEffect(() => {
    if (visible && event && group) {
      const loadSocialData = async () => {
        const data = await getEventSocialData(event.id);
        setEventSocialData(data);
      };
      loadSocialData();
    }
  }, [visible, event?.id, group?.id]);

  if (!event || !event.id || !event.startTime || !event.endTime) return null;

  const stageColor = getStageColor(event.stageName || '');
  const startTime = format(event.startTime, 'HH:mm');
  const endTime = format(event.endTime, 'HH:mm');

  const handleToggleFavorite = async () => {
    setIsProcessing(true);
    try {
      if (isFavorite && favorite && typeof favorite === 'object') {
        // Retirer des favoris - annuler la notification
        await cancelForFavorite(favorite);
      }
      
      const success = await onToggleFavorite(event.id, selectedReminderMinutes);
      
      if (success && !isFavorite) {
        // Ajouter aux favoris - programmer la notification
        // Note: scheduleForFavorite sera appelé automatiquement par le hook useFavorites
        onClose();
      } else if (success && isFavorite) {
        // Favori retiré avec succès
        onClose();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateReminder = async () => {
    if (!isFavorite || !favorite || typeof favorite !== 'object') return;
    
    setIsProcessing(true);
    try {
      const success = await onUpdateReminder(event.id, selectedReminderMinutes);
      
      if (success) {
        // Reprogrammer la notification avec le nouveau délai
        await scheduleForFavorite(event, {
          id: favorite?.id || '',
          userId: favorite?.userId || '',
          eventId: event.id,
          groupId: favorite?.groupId || '',
          reminderMinutes: selectedReminderMinutes,
          isActive: favorite?.isActive ?? true,
          createdAt: favorite?.createdAt || new Date(),
          notificationId: favorite?.notificationId
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Détails du set
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content}>
          {/* Event Card */}
          <Card style={[
            styles.eventCard,
            { borderLeftColor: stageColor, borderLeftWidth: 4 },
            isFavorite && { borderColor: FAVORITE_COLORS.gold, borderWidth: 2 }
          ]}>
            <View style={styles.eventHeader}>
              <View style={styles.eventTime}>
                <Text style={[styles.timeText, { color: colors.text }]}>
                  {startTime} - {endTime}
                </Text>
                <View style={[styles.stageTag, { backgroundColor: stageColor }]}>
                  <Text style={styles.stageText}>{event.stageName || 'Scène'}</Text>
                </View>
              </View>
              {isFavorite && (
                <Ionicons 
                  name="star" 
                  size={24} 
                  color={FAVORITE_COLORS.gold} 
                />
              )}
            </View>

            <Text style={[styles.artistName, { color: colors.text }]}>
              {event.artistName || 'Artiste inconnu'}
            </Text>

            {event.genre && (
              <Text style={[styles.eventGenre, { color: colors.textLight }]}>
                {event.genre}
              </Text>
            )}

            {event.description && (
              <Text style={[styles.eventDescription, { color: colors.textLight }]}>
                {event.description}
              </Text>
            )}
          </Card>

          {/* Reminder Options */}
          <Card style={styles.reminderCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Rappel avant le début
            </Text>
            
            <View style={styles.reminderOptions}>
              {REMINDER_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setSelectedReminderMinutes(option.value)}
                  style={[
                    styles.reminderOption,
                    {
                      backgroundColor: selectedReminderMinutes === option.value 
                        ? FAVORITE_COLORS.gold 
                        : colors.surface,
                      borderColor: selectedReminderMinutes === option.value 
                        ? FAVORITE_COLORS.goldDark 
                        : colors.border
                    }
                  ]}
                >
                  <Ionicons 
                    name={option.icon as any} 
                    size={20} 
                    color={selectedReminderMinutes === option.value ? '#ffffff' : colors.text} 
                  />
                  <Text style={[
                    styles.reminderOptionText,
                    { 
                      color: selectedReminderMinutes === option.value 
                        ? '#ffffff' 
                        : colors.text 
                    }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {isFavorite && favorite && typeof favorite === 'object' && favorite.reminderMinutes !== selectedReminderMinutes && (
              <Button
                title="Mettre à jour le rappel"
                onPress={handleUpdateReminder}
                isLoading={isProcessing}
                variant="ghost"
                style={styles.updateButton}
              />
            )}
          </Card>

          {/* Section sociale */}
          {group && eventSocialData && eventSocialData.favorites && eventSocialData.favorites.length > 0 && (
            <Card style={styles.socialCard}>
              <View style={styles.socialHeader}>
                <Ionicons name="people" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Qui y va ?
                </Text>
              </View>
              
              <View style={styles.socialContent}>
                <AvatarStack 
                  users={eventSocialData.favorites.map((fav, index) => ({
                    id: fav.userId,
                    name: eventSocialData.names?.[index] || 'Utilisateur',
                    avatar: eventSocialData.avatars?.[index] || ''
                  }))}
                  size="small"
                  maxVisible={5}
                />
                
                <Text style={[styles.socialText, { color: colors.textLight }]}>
                  {eventSocialData.favorites.length === 1
                    ? `${eventSocialData.names?.[0] || 'Quelqu\'un'} prévoit d'y aller`
                    : eventSocialData.favorites.length === 2
                    ? `${eventSocialData.names?.[0] || 'Quelqu\'un'} et ${eventSocialData.names?.[1] || 'quelqu\'un d\'autre'} prévoient d'y aller`
                    : `${eventSocialData.names?.[0] || 'Quelqu\'un'}, ${eventSocialData.names?.[1] || 'quelqu\'un d\'autre'} et ${eventSocialData.favorites.length - 2} autre${eventSocialData.favorites.length - 2 > 1 ? 's' : ''} prévoient d'y aller`
                  }
                </Text>
              </View>

              {/* Liste des personnes */}
              <View style={styles.socialList}>
                {eventSocialData.favorites.map((fav: any, index: number) => {
                  const member = group.members[fav.userId];
                  if (!member) return null;
                  
                  return (
                    <View key={fav.userId} style={styles.socialListItem}>
                      <Avatar 
                        avatarData={parseAvatarString(member.avatar)}
                        name={member.name}
                        size="small"
                      />
                      <Text style={[styles.socialListName, { color: colors.text }]}>
                        {member.name}
                      </Text>
                      <View style={[styles.reminderBadge, { backgroundColor: colors.surface }]}>
                        <Ionicons name="alarm" size={12} color={colors.textLight} />
                        <Text style={[styles.reminderBadgeText, { color: colors.textLight }]}>
                          {fav.reminderMinutes}min
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          )}
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            onPress={handleToggleFavorite}
            isLoading={isProcessing}
            variant={isFavorite ? "ghost" : "primary"}
            icon={
              <Ionicons 
                name={isFavorite ? "star" : "star-outline"} 
                size={20} 
                color={isFavorite ? FAVORITE_COLORS.gold : "#ffffff"}
              />
            }
            style={[
              styles.favoriteButton,
              isFavorite && { backgroundColor: FAVORITE_COLORS.goldLight }
            ]}
          />
        </View>
      </SafeAreaView>
    </Modal>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  headerSpacer: {
    width: 24
  },
  content: {
    flex: 1,
    padding: 16
  },
  eventCard: {
    marginBottom: 16,
    padding: 16
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  eventTime: {
    flex: 1
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8
  },
  stageTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  stageText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500'
  },
  artistName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8
  },
  eventGenre: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8
  },
  eventDescription: {
    fontSize: 14,
    lineHeight: 20
  },
  reminderCard: {
    marginBottom: 16,
    padding: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16
  },
  reminderOptions: {
    gap: 8
  },
  reminderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12
  },
  reminderOptionText: {
    fontSize: 14,
    fontWeight: '500'
  },
  updateButton: {
    marginTop: 16
  },
  actions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  favoriteButton: {
    width: '100%'
  },
  socialCard: {
    marginBottom: 16,
    padding: 16
  },
  socialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  socialContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16
  },
  socialText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  },
  socialList: {
    gap: 8
  },
  socialListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4
  },
  socialListAvatar: {
    fontSize: 20
  },
  socialListName: {
    flex: 1,
    fontSize: 14
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12
  },
  reminderBadgeText: {
    fontSize: 11
  }
});