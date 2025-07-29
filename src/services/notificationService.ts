import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertLevel } from '../types';
import { eventBus } from '../utils/eventBus';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private notificationListener: any = null;
  private responseListener: any = null;

  async initialize(): Promise<void> {
    try {
      // Vérifier si on peut envoyer des notifications
      if (!Device.isDevice) {
        console.log('Les notifications nécessitent un appareil physique');
        return;
      }

      // Demander les permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Permission de notification refusée');
        return;
      }

      // Configurer les catégories de notifications
      await this.setupNotificationCategories();

      // Sauvegarder que les notifications sont activées
      await AsyncStorage.setItem('notificationsEnabled', 'true');

      // Configurer les listeners
      this.setupListeners();
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  private async setupNotificationCategories(): Promise<void> {
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('DRINK_ALERT', [
        {
          identifier: 'VIEW_STATS',
          buttonTitle: 'Voir les stats',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'DISMISS',
          buttonTitle: 'Ignorer',
          options: {
            isDestructive: true,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('LOCATION_REQUEST', [
        {
          identifier: 'ACCEPT',
          buttonTitle: 'Accepter',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'REFUSE',
          buttonTitle: 'Refuser',
          options: {
            isDestructive: true,
          },
        },
      ]);
    }
  }

  private setupListeners(): void {
    // Listener pour les notifications reçues
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification reçue:', notification);
    });

    // Listener pour les interactions avec les notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Interaction avec notification:', response);
      
      // Gérer les demandes de localisation
      if (response.notification.request.content.data?.type === 'location_request') {
        const { requestId, fromUserId, fromUserName } = response.notification.request.content.data;
        
        if (response.actionIdentifier === 'ACCEPT') {
          eventBus.emit('locationRequestAccepted', { requestId, fromUserId, fromUserName });
        } else if (response.actionIdentifier === 'REFUSE') {
          eventBus.emit('locationRequestRefused', { requestId, fromUserId, fromUserName });
        } else {
          // Clic sur la notification elle-même
          eventBus.emit('openLocationRequest', { requestId, fromUserId, fromUserName });
        }
      }

      // Gérer les messages de chat
      if (response.notification.request.content.data?.type === 'chat_message') {
        const { groupId, messageId, fromUserName } = response.notification.request.content.data;
        
        // Émettre un événement pour ouvrir le chat
        eventBus.emit('openChat', { groupId, messageId, fromUserName });
      }
    });
  }

  async sendAlertNotification(
    title: string,
    body: string,
    alertLevel: AlertLevel,
    data?: any
  ): Promise<void> {
    try {
      const notificationsEnabled = await AsyncStorage.getItem('notificationsEnabled');
      if (notificationsEnabled !== 'true') return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            ...data,
            alertLevel,
            type: 'alert'
          },
          categoryIdentifier: 'DRINK_ALERT',
          sound: alertLevel === 'critical' ? 'alarm.wav' : 'default',
          priority: alertLevel === 'critical' ? 'high' : 'default',
        },
        trigger: null, // Envoyer immédiatement
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  async sendGroupActivityNotification(
    title: string,
    body: string,
    groupId: string
  ): Promise<void> {
    try {
      const notificationsEnabled = await AsyncStorage.getItem('notificationsEnabled');
      if (notificationsEnabled !== 'true') return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            groupId,
            type: 'group_activity'
          },
          sound: 'default',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending group notification:', error);
    }
  }

  async scheduleHydrationReminder(intervalHours: number = 2): Promise<void> {
    try {
      const notificationsEnabled = await AsyncStorage.getItem('notificationsEnabled');
      if (notificationsEnabled !== 'true') return;

      // Annuler les rappels existants
      await this.cancelHydrationReminders();

      // Programmer le nouveau rappel
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💧 Pensez à vous hydrater!',
          body: "N'oubliez pas de boire de l'eau entre les verres",
          data: {
            type: 'hydration_reminder'
          },
          sound: 'default',
        },
        trigger: {
          seconds: intervalHours * 60 * 60,
          repeats: true,
        },
      });

      await AsyncStorage.setItem('hydrationReminderId', identifier);
    } catch (error) {
      console.error('Error scheduling hydration reminder:', error);
    }
  }

  async cancelHydrationReminders(): Promise<void> {
    try {
      const reminderId = await AsyncStorage.getItem('hydrationReminderId');
      if (reminderId) {
        await Notifications.cancelScheduledNotificationAsync(reminderId);
        await AsyncStorage.removeItem('hydrationReminderId');
      }
    } catch (error) {
      console.error('Error canceling hydration reminders:', error);
    }
  }

  async sendMilestoneNotification(
    userName: string,
    milestone: string,
    groupId: string
  ): Promise<void> {
    await this.sendGroupActivityNotification(
      '🎉 Milestone atteint!',
      `${userName} ${milestone}`,
      groupId
    );
  }

  async toggleNotifications(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem('notificationsEnabled', enabled ? 'true' : 'false');
    
    if (!enabled) {
      // Annuler tous les rappels programmés
      await this.cancelHydrationReminders();
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  }

  async sendLocationRequestNotification(
    fromUserName: string,
    requestId: string,
    fromUserId: string
  ): Promise<void> {
    try {
      const notificationsEnabled = await AsyncStorage.getItem('notificationsEnabled');
      if (notificationsEnabled !== 'true') return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📍 Demande de localisation',
          body: `${fromUserName} demande votre position`,
          data: {
            type: 'location_request',
            requestId,
            fromUserId,
            fromUserName
          },
          categoryIdentifier: 'LOCATION_REQUEST',
          sound: 'default',
          priority: 'high',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending location request notification:', error);
    }
  }

  async sendLocationSharedNotification(
    toUserName: string,
    shareId: string
  ): Promise<void> {
    try {
      const notificationsEnabled = await AsyncStorage.getItem('notificationsEnabled');
      if (notificationsEnabled !== 'true') return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📍 Position partagée',
          body: `${toUserName} a partagé sa position avec vous`,
          data: {
            type: 'location_shared',
            shareId
          },
          sound: 'default',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending location shared notification:', error);
    }
  }

  async sendChatMessageNotification(
    fromUserName: string,
    messageText: string,
    groupId: string,
    messageId: string,
    currentUserId: string
  ): Promise<void> {
    try {
      const notificationsEnabled = await AsyncStorage.getItem('notificationsEnabled');
      if (notificationsEnabled !== 'true') return;

      // Tronquer le message si trop long
      const truncatedMessage = messageText.length > 50 
        ? messageText.substring(0, 50) + '...' 
        : messageText;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `💬 ${fromUserName}`,
          body: truncatedMessage,
          data: {
            type: 'chat_message',
            groupId,
            messageId,
            fromUserName
          },
          sound: 'default',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending chat message notification:', error);
    }
  }

  async getNotificationSettings(): Promise<{
    enabled: boolean;
    hydrationReminders: boolean;
    alertNotifications: boolean;
  }> {
    const enabled = await AsyncStorage.getItem('notificationsEnabled') === 'true';
    const hydrationReminderId = await AsyncStorage.getItem('hydrationReminderId');
    
    return {
      enabled,
      hydrationReminders: !!hydrationReminderId,
      alertNotifications: enabled
    };
  }

  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export default new NotificationService();