import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

/**
 * Service utilisant Expo Push Notification Service
 * Pas besoin de configurer Firebase Cloud Messaging !
 */
class ExpoPushService {
  private expoPushToken: string | null = null;

  /**
   * Enregistre le token Expo Push de l'appareil
   */
  async registerForPushNotifications(userId: string): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.log('Les notifications push nécessitent un appareil physique');
        return null;
      }

      // Vérifier les permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Permission de notification refusée');
        return null;
      }

      // Obtenir le token Expo Push (pas besoin de Firebase !)
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId
      })).data;

      if (token) {
        this.expoPushToken = token;
        
        // Sauvegarder le token dans Firestore
        await this.saveTokenToFirestore(userId, token);
        
        console.log('Expo Push token enregistré:', token);
        return token;
      }

      return null;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement des notifications push:', error);
      return null;
    }
  }

  /**
   * Sauvegarde le token dans Firestore
   */
  private async saveTokenToFirestore(userId: string, token: string): Promise<void> {
    try {
      const userTokenRef = doc(db, 'userPushTokens', userId);
      await setDoc(userTokenRef, {
        expoPushToken: token,
        platform: Platform.OS,
        lastUpdated: new Date(),
        deviceInfo: {
          brand: Device.brand,
          modelName: Device.modelName,
          osVersion: Device.osVersion
        }
      }, { merge: true });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du token:', error);
    }
  }

  /**
   * Récupère le token Expo d'un utilisateur
   */
  async getUserPushToken(userId: string): Promise<string | null> {
    try {
      const userTokenRef = doc(db, 'userPushTokens', userId);
      const tokenDoc = await getDoc(userTokenRef);
      
      if (tokenDoc.exists()) {
        return tokenDoc.data().expoPushToken;
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération du token:', error);
      return null;
    }
  }

  /**
   * Récupère les tokens de tous les membres d'un groupe
   */
  async getGroupMemberTokens(groupId: string, excludeUserId?: string): Promise<string[]> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);
      
      if (!groupDoc.exists()) {
        return [];
      }

      const members = Object.keys(groupDoc.data().members || {});
      const tokens: string[] = [];

      for (const memberId of members) {
        if (memberId !== excludeUserId) {
          const token = await this.getUserPushToken(memberId);
          if (token) {
            tokens.push(token);
          }
        }
      }

      return tokens;
    } catch (error) {
      console.error('Erreur lors de la récupération des tokens du groupe:', error);
      return [];
    }
  }

  /**
   * Envoie une notification via Expo Push Service
   */
  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    try {
      const message = {
        to: token,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high',
        badge: 1,
        channelId: 'default' // Pour Android
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      
      if (result.data?.status === 'error') {
        console.error('Erreur Expo Push:', result.data.message);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error);
    }
  }

  /**
   * Envoie une notification à tous les membres d'un groupe
   */
  async sendGroupNotification(
    groupId: string,
    title: string,
    body: string,
    data?: any,
    excludeUserId?: string
  ): Promise<void> {
    try {
      const tokens = await this.getGroupMemberTokens(groupId, excludeUserId);
      
      // Expo recommande d'envoyer par lots de 100
      const chunks = [];
      for (let i = 0; i < tokens.length; i += 100) {
        chunks.push(tokens.slice(i, i + 100));
      }

      for (const chunk of chunks) {
        await Promise.all(
          chunk.map(token => this.sendPushNotification(token, title, body, data))
        );
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification de groupe:', error);
    }
  }

  /**
   * Supprime le token d'un utilisateur
   */
  async removePushToken(userId: string): Promise<void> {
    try {
      const userTokenRef = doc(db, 'userPushTokens', userId);
      await setDoc(userTokenRef, {
        expoPushToken: null,
        lastUpdated: new Date()
      }, { merge: true });
      
      this.expoPushToken = null;
    } catch (error) {
      console.error('Erreur lors de la suppression du token:', error);
    }
  }

  /**
   * Retourne le token actuel
   */
  getCurrentToken(): string | null {
    return this.expoPushToken;
  }
}

export default new ExpoPushService();