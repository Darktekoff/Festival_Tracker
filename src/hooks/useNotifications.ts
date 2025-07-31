import { useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { LineupEvent, UserFavorite } from '../types';
import favoriteService from '../services/favoriteService';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function useNotifications() {
  // Demander les permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  }, []);

  // Programmer une notification
  const scheduleNotification = useCallback(async (
    event: LineupEvent,
    reminderMinutes: number
  ): Promise<string | null> => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        console.warn('No notification permissions');
        return null;
      }

      // Calculer le moment de la notification
      const notificationDate = new Date(event.startTime.getTime() - (reminderMinutes * 60 * 1000));
      
      // Vérifier que la notification est dans le futur
      if (notificationDate <= new Date()) {
        console.warn('Notification date is in the past');
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🎵 ${event.artistName}`,
          body: `Commence dans ${reminderMinutes} minute${reminderMinutes > 1 ? 's' : ''} sur ${event.stageName} !`,
          data: {
            eventId: event.id,
            eventType: 'festival_reminder'
          },
          sound: true,
        },
        trigger: {
          date: notificationDate,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }, [requestPermissions]);

  // Annuler une notification
  const cancelNotification = useCallback(async (notificationId: string): Promise<void> => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }, []);

  // Programmer une notification pour un favori
  const scheduleForFavorite = useCallback(async (
    event: LineupEvent,
    favorite: UserFavorite
  ): Promise<boolean> => {
    try {
      // Annuler l'ancienne notification si elle existe
      if (favorite.notificationId) {
        await cancelNotification(favorite.notificationId);
      }

      // Programmer la nouvelle notification
      const notificationId = await scheduleNotification(event, favorite.reminderMinutes);
      
      if (notificationId) {
        // Mettre à jour l'ID de notification dans la base
        await favoriteService.updateNotificationId(
          favorite.userId,
          favorite.eventId,
          notificationId
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error scheduling favorite notification:', error);
      return false;
    }
  }, [scheduleNotification, cancelNotification]);

  // Annuler la notification d'un favori
  const cancelForFavorite = useCallback(async (favorite: UserFavorite): Promise<void> => {
    if (favorite.notificationId) {
      await cancelNotification(favorite.notificationId);
    }
  }, [cancelNotification]);

  // Nettoyer toutes les notifications programmées (utile lors de la déconnexion)
  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }, []);

  // Obtenir les notifications programmées (pour debug)
  const getScheduledNotifications = useCallback(async () => {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }, []);

  // Initialisation des permissions au montage
  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  return {
    requestPermissions,
    scheduleNotification,
    cancelNotification,
    scheduleForFavorite,
    cancelForFavorite,
    cancelAllNotifications,
    getScheduledNotifications
  };
}