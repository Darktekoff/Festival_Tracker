import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertLevel, NotificationPreferences } from '../types';
import { eventBus } from '../utils/eventBus';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
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
      try {
        console.log('Interaction avec notification:', response);
        
        // Vérifications de sécurité pour éviter les erreurs indexOf
        const notificationData = response?.notification?.request?.content?.data;
        if (!notificationData || typeof notificationData !== 'object') {
          console.warn('Invalid notification data:', notificationData);
          return;
        }
        
        // Gérer les demandes de localisation
        if (notificationData.type === 'location_request') {
          const { requestId, fromUserId, fromUserName } = notificationData;
          
          // Vérifier que les données sont présentes
          if (!requestId || !fromUserId || !fromUserName) {
            console.warn('Missing location request data:', { requestId, fromUserId, fromUserName });
            return;
          }
          
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
        if (notificationData.type === 'chat_message') {
          const { groupId, messageId, fromUserName } = notificationData;
          
          // Vérifier que les données sont présentes
          if (!groupId || !messageId || !fromUserName) {
            console.warn('Missing chat message data:', { groupId, messageId, fromUserName });
            return;
          }
          
          // Émettre un événement pour ouvrir le chat
          eventBus.emit('openChat', { groupId, messageId, fromUserName });
        }
      } catch (error) {
        console.error('Error in notification response listener:', error);
      }
    });
  }

  async sendAlertNotification(
    title: string,
    body: string,
    alertLevel: AlertLevel,
    userId?: string,
    data?: any
  ): Promise<void> {
    try {
      if (userId) {
        const isEnabled = await this.isNotificationTypeEnabled(userId, 'consumptionAlerts');
        if (!isEnabled) return;
      } else {
        const notificationsEnabled = await AsyncStorage.getItem('notificationsEnabled');
        if (notificationsEnabled !== 'true') return;
      }

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

  async scheduleHydrationReminder(intervalHours: number = 2, userId?: string): Promise<void> {
    try {
      if (userId) {
        const isEnabled = await this.isNotificationTypeEnabled(userId, 'hydrationReminders');
        if (!isEnabled) return;
      } else {
        const notificationsEnabled = await AsyncStorage.getItem('notificationsEnabled');
        if (notificationsEnabled !== 'true') return;
      }

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
    fromUserId: string,
    toUserId?: string
  ): Promise<void> {
    try {
      if (toUserId) {
        const isEnabled = await this.isNotificationTypeEnabled(toUserId, 'locationRequests');
        if (!isEnabled) return;
      } else {
        const notificationsEnabled = await AsyncStorage.getItem('notificationsEnabled');
        if (notificationsEnabled !== 'true') return;
      }

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
    shareId: string,
    toUserId?: string
  ): Promise<void> {
    try {
      if (toUserId) {
        const isEnabled = await this.isNotificationTypeEnabled(toUserId, 'locationShares');
        if (!isEnabled) return;
      } else {
        const notificationsEnabled = await AsyncStorage.getItem('notificationsEnabled');
        if (notificationsEnabled !== 'true') return;
      }

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
      const isEnabled = await this.isNotificationTypeEnabled(currentUserId, 'chatMessages');
      if (!isEnabled) return;

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

  // Vérifier si un type de notification est activé pour un utilisateur
  async isNotificationTypeEnabled(userId: string, notificationType: keyof NotificationPreferences): Promise<boolean> {
    try {
      // Validation des paramètres d'entrée
      if (!userId || typeof userId !== 'string') {
        console.warn('Invalid userId provided to isNotificationTypeEnabled:', userId);
        return true;
      }
      
      if (!notificationType || typeof notificationType !== 'string') {
        console.warn('Invalid notificationType provided to isNotificationTypeEnabled:', notificationType);
        return true;
      }

      // Vérifier d'abord si les notifications sont activées globalement
      const notificationsEnabled = await AsyncStorage.getItem('notificationsEnabled');
      if (notificationsEnabled !== 'true') return false;

      // Récupérer les préférences utilisateur
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) return true; // Défaut activé si pas de préférences
      
      const userData = userDoc.data();
      const preferences = userData?.preferences?.notificationDetails;
      
      // Vérification plus robuste des préférences
      if (!preferences || typeof preferences !== 'object') {
        return true; // Défaut activé si pas de préférences détaillées
      }
      
      // Vérification que la clé existe dans l'objet preferences
      if (!preferences.hasOwnProperty(notificationType)) {
        return true; // Défaut activé si le type n'est pas configuré
      }
      
      return preferences[notificationType] !== false;
    } catch (error) {
      console.error('Error checking notification preference:', error);
      return true; // Défaut activé en cas d'erreur
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

  // Nouvelle boisson dans le groupe
  async sendNewDrinkNotification(
    groupId: string,
    userName: string,
    drinkName: string,
    excludeUserId: string
  ): Promise<void> {
    try {
      // TODO: Envoyer aux autres membres du groupe
      // Pour l'instant, notification locale seulement
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🍺 Nouvelle boisson',
          body: `${userName} vient de prendre ${drinkName}`,
          data: {
            type: 'new_drink',
            groupId,
            userName
          },
          sound: 'default',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending new drink notification:', error);
    }
  }

  // Membre en danger
  async sendMemberInDangerNotification(
    groupId: string,
    memberName: string,
    unitsCount: number,
    excludeUserId: string
  ): Promise<void> {
    try {
      // TODO: Envoyer aux autres membres du groupe
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Membre en danger',
          body: `${memberName} a atteint ${unitsCount.toFixed(1)} unités d'alcool`,
          data: {
            type: 'member_danger',
            groupId,
            memberName,
            unitsCount
          },
          sound: 'alarm.wav',
          priority: 'high',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending member danger notification:', error);
    }
  }

  // Alerte d'inactivité
  async sendInactivityAlert(
    userId: string,
    hoursInactive: number
  ): Promise<void> {
    try {
      const isEnabled = await this.isNotificationTypeEnabled(userId, 'inactivityAlert');
      if (!isEnabled) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '😴 Inactivité détectée',
          body: `Vous n'avez rien bu depuis ${hoursInactive}h. Pensez à vous hydrater !`,
          data: {
            type: 'inactivity_alert',
            hoursInactive
          },
          sound: 'default',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending inactivity alert:', error);
    }
  }

  // Nouveau membre dans le groupe
  async sendNewMemberNotification(
    groupId: string,
    newMemberName: string,
    excludeUserId: string
  ): Promise<void> {
    try {
      // TODO: Envoyer aux autres membres du groupe
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '👥 Nouveau membre',
          body: `${newMemberName} a rejoint le groupe !`,
          data: {
            type: 'new_member',
            groupId,
            memberName: newMemberName
          },
          sound: 'default',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending new member notification:', error);
    }
  }

  // Notification de zone festival
  async sendFestivalZoneNotification(
    userId: string,
    zoneName: string,
    memberCount: number
  ): Promise<void> {
    try {
      const isEnabled = await this.isNotificationTypeEnabled(userId, 'festivalZones');
      if (!isEnabled) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📍 Activité dans les zones',
          body: `${memberCount} membre${memberCount > 1 ? 's' : ''} ${memberCount > 1 ? 'sont' : 'est'} à ${zoneName}`,
          data: {
            type: 'festival_zone',
            zoneName,
            memberCount
          },
          sound: 'default',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending festival zone notification:', error);
    }
  }

  // Fin de session (résumé)
  async sendSessionEndNotification(
    userId: string,
    totalDrinks: number,
    totalUnits: number,
    sessionDuration: number
  ): Promise<void> {
    try {
      const isEnabled = await this.isNotificationTypeEnabled(userId, 'sessionEnd');
      if (!isEnabled) return;

      const hours = Math.floor(sessionDuration / 60);
      const minutes = sessionDuration % 60;
      const durationText = hours > 0 ? `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}` : `${minutes}min`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🏁 Fin de session',
          body: `Session de ${durationText}: ${totalDrinks} boisson${totalDrinks > 1 ? 's' : ''}, ${totalUnits.toFixed(1)} unités`,
          data: {
            type: 'session_end',
            totalDrinks,
            totalUnits,
            sessionDuration
          },
          sound: 'default',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending session end notification:', error);
    }
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