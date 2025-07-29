import { db } from '../config/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
  updateDoc,
  increment,
  runTransaction,
  QueryDocumentSnapshot,
  DocumentData,
  deleteDoc
} from 'firebase/firestore';
import { DrinkRecord, DrinkFormData } from '../types';
import { calculateAlcoholUnits } from '../utils/calculations';
import authService from './authService';
import groupService from './groupService';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateDrinkActivityMessage, generateAlertActivityMessage } from '../utils/activityMessages';

class DrinkService {
  private drinkListeners: Map<string, Unsubscribe> = new Map();
  private pendingDrinks: DrinkRecord[] = [];

  async addDrink(
    groupId: string,
    drinkData: DrinkFormData,
    todayCount?: number
  ): Promise<DrinkRecord | null> {
    try {
      const userId = authService.getCurrentUserId();
      const user = authService.getCurrentUser();
      if (!userId || !user) return null;

      const alcoholUnits = calculateAlcoholUnits(drinkData.volume, drinkData.alcoholDegree);

      const newDrink: DrinkRecord = {
        id: uuidv4(),
        groupId,
        userId,
        userName: user.name,
        userAvatar: user.avatar,
        category: drinkData.category,
        drinkType: drinkData.drinkType,
        customName: drinkData.customName,
        brand: drinkData.brand,
        volume: drinkData.volume,
        alcoholDegree: drinkData.alcoholDegree,
        alcoholContent: drinkData.alcoholDegree, // Alias pour alcoholDegree
        alcoholUnits,
        timestamp: new Date(),
        createdAt: new Date(),
        syncStatus: 'pending',
        lastModified: new Date()
      };

      // Essayer de sauvegarder en ligne
      try {
        let drinkRef: any;
        
        await runTransaction(db, async (transaction) => {
          // Créer le document de boisson
          drinkRef = doc(collection(db, 'groups', groupId, 'drinks'));
          
          // Créer l'objet à sauvegarder en excluant les valeurs undefined
          const drinkToSave: any = {
            ...newDrink,
            id: drinkRef.id,
            timestamp: serverTimestamp(),
            createdAt: serverTimestamp(),
            lastModified: serverTimestamp(),
            syncStatus: 'synced'
          };
          
          // Supprimer les champs undefined pour Firebase
          Object.keys(drinkToSave).forEach(key => {
            if (drinkToSave[key] === undefined) {
              delete drinkToSave[key];
            }
          });
          
          transaction.set(drinkRef, drinkToSave);

          // Mettre à jour les stats du groupe
          const groupRef = doc(db, 'groups', groupId);
          transaction.update(groupRef, {
            'stats.totalDrinks': increment(1),
            [`members.${userId}.totalContributions`]: increment(1),
            [`members.${userId}.lastActive`]: serverTimestamp()
          });
        });

        // Mettre à jour l'ID réel du document
        newDrink.id = drinkRef.id;
        newDrink.syncStatus = 'synced';

        // Calculer le nombre de boissons du jour si non fourni
        let finalTodayCount = todayCount;
        if (!finalTodayCount) {
          // Récupérer les boissons d'aujourd'hui pour ce user
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          
          const todayDrinksQuery = query(
            collection(db, 'groups', groupId, 'drinks'),
            where('userId', '==', userId),
            where('timestamp', '>=', todayStart),
            orderBy('timestamp', 'desc')
          );
          
          const todaySnapshot = await getDocs(todayDrinksQuery);
          finalTodayCount = todaySnapshot.size; // Inclut la boisson qu'on vient d'ajouter
        }

        // Générer un message d'activité personnalisé et fun
        const funMessage = generateDrinkActivityMessage(
          user.name, 
          drinkData, 
          finalTodayCount,
          new Date()
        );

        // Ajouter l'activité avec le message fun
        const activityMetadata: any = {
          drinkType: drinkData.drinkType,
          todayCount: finalTodayCount,
          alcoholUnits: alcoholUnits
        };
        
        // Ajouter customName seulement s'il existe
        if (drinkData.customName) {
          activityMetadata.customName = drinkData.customName;
        }
        
        await groupService.addGroupActivity(
          groupId,
          userId,
          'drink_added',
          funMessage,
          activityMetadata
        );
      } catch (error) {
        console.error('Error syncing drink, saving locally:', error);
        // Sauvegarder localement si hors ligne
        newDrink.syncStatus = 'pending';
        this.pendingDrinks.push(newDrink);
        await this.savePendingDrinks();
      }

      return newDrink;
    } catch (error) {
      console.error('Error adding drink:', error);
      return null;
    }
  }

  async getDrinks(
    groupId: string,
    limitCount: number = 50,
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<{ drinks: DrinkRecord[]; lastDoc?: QueryDocumentSnapshot<DocumentData> }> {
    try {
      let q = query(
        collection(db, 'groups', groupId, 'drinks'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const drinks: DrinkRecord[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        drinks.push({
          ...data,
          id: doc.id,
          timestamp: data.timestamp?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          lastModified: data.lastModified?.toDate() || new Date()
        } as DrinkRecord);
      });

      // Ajouter les boissons en attente
      const pendingForGroup = this.pendingDrinks.filter(d => d.groupId === groupId);
      drinks.unshift(...pendingForGroup);

      return {
        drinks,
        lastDoc: snapshot.docs[snapshot.docs.length - 1]
      };
    } catch (error) {
      console.error('Error getting drinks:', error);
      return { drinks: [] };
    }
  }

  async getUserDrinks(
    groupId: string,
    userId: string,
    limitCount: number = 50
  ): Promise<DrinkRecord[]> {
    try {
      const q = query(
        collection(db, 'groups', groupId, 'drinks'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const drinks: DrinkRecord[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        drinks.push({
          ...data,
          id: doc.id,
          timestamp: data.timestamp?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          lastModified: data.lastModified?.toDate() || new Date()
        } as DrinkRecord);
      });

      // Ajouter les boissons en attente pour cet utilisateur
      const pendingForUser = this.pendingDrinks.filter(
        d => d.groupId === groupId && d.userId === userId
      );
      drinks.unshift(...pendingForUser);

      return drinks;
    } catch (error) {
      console.error('Error getting user drinks:', error);
      return [];
    }
  }

  async getDrinksByDateRange(
    groupId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DrinkRecord[]> {
    try {
      const q = query(
        collection(db, 'groups', groupId, 'drinks'),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const drinks: DrinkRecord[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        drinks.push({
          ...data,
          id: doc.id,
          timestamp: data.timestamp?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          lastModified: data.lastModified?.toDate() || new Date()
        } as DrinkRecord);
      });

      return drinks;
    } catch (error) {
      console.error('Error getting drinks by date range:', error);
      return [];
    }
  }

  subscribeToDrinks(
    groupId: string,
    onUpdate: (drinks: DrinkRecord[]) => void,
    onError?: (error: Error) => void,
    limitCount: number = 50
  ): () => void {
    // Nettoyer l'ancien listener s'il existe
    this.unsubscribeFromDrinks(groupId);

    const q = query(
      collection(db, 'groups', groupId, 'drinks'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const drinks: DrinkRecord[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          drinks.push({
            ...data,
            id: doc.id,
            timestamp: data.timestamp?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            lastModified: data.lastModified?.toDate() || new Date()
          } as DrinkRecord);
        });

        // Ajouter les boissons en attente
        const pendingForGroup = this.pendingDrinks.filter(d => d.groupId === groupId);
        drinks.unshift(...pendingForGroup);

        onUpdate(drinks);
      },
      (error) => {
        console.error('Error in drinks subscription:', error);
        onError?.(error);
      }
    );

    this.drinkListeners.set(groupId, unsubscribe);
    return () => this.unsubscribeFromDrinks(groupId);
  }

  unsubscribeFromDrinks(groupId: string): void {
    const unsubscribe = this.drinkListeners.get(groupId);
    if (unsubscribe) {
      unsubscribe();
      this.drinkListeners.delete(groupId);
    }
  }

  async syncPendingDrinks(): Promise<void> {
    if (this.pendingDrinks.length === 0) return;

    const toSync = [...this.pendingDrinks];
    this.pendingDrinks = [];

    for (const drink of toSync) {
      try {
        await runTransaction(db, async (transaction) => {
          // Créer le document de boisson
          const drinkRef = doc(collection(db, 'groups', drink.groupId, 'drinks'));
          
          // Créer l'objet à sauvegarder en excluant les valeurs undefined
          const drinkToSave: any = {
            ...drink,
            id: drinkRef.id,
            syncStatus: 'synced',
            lastModified: serverTimestamp()
          };
          
          // Supprimer les champs undefined pour Firebase
          Object.keys(drinkToSave).forEach(key => {
            if (drinkToSave[key] === undefined) {
              delete drinkToSave[key];
            }
          });
          
          transaction.set(drinkRef, drinkToSave);

          // Mettre à jour les stats du groupe
          const groupRef = doc(db, 'groups', drink.groupId);
          transaction.update(groupRef, {
            'stats.totalDrinks': increment(1),
            [`members.${drink.userId}.totalContributions`]: increment(1)
          });
        });
      } catch (error) {
        console.error('Error syncing pending drink:', error);
        // Remettre dans la file d'attente
        this.pendingDrinks.push(drink);
      }
    }

    if (this.pendingDrinks.length > 0) {
      await this.savePendingDrinks();
    } else {
      await AsyncStorage.removeItem('pendingDrinks');
    }
  }

  private async savePendingDrinks(): Promise<void> {
    try {
      await AsyncStorage.setItem('pendingDrinks', JSON.stringify(this.pendingDrinks));
    } catch (error) {
      console.error('Error saving pending drinks:', error);
    }
  }

  async loadPendingDrinks(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('pendingDrinks');
      if (saved) {
        this.pendingDrinks = JSON.parse(saved).map((d: any) => ({
          ...d,
          timestamp: new Date(d.timestamp),
          createdAt: new Date(d.createdAt),
          lastModified: new Date(d.lastModified)
        }));
      }
    } catch (error) {
      console.error('Error loading pending drinks:', error);
    }
  }

  async deleteUserDrinks(groupId: string, userId: string): Promise<void> {
    try {
      // Supprimer les boissons en attente de cet utilisateur
      this.pendingDrinks = this.pendingDrinks.filter(
        d => !(d.groupId === groupId && d.userId === userId)
      );
      await this.savePendingDrinks();

      // Obtenir toutes les boissons de cet utilisateur avec une requête plus simple
      const q = query(
        collection(db, 'groups', groupId, 'drinks'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const userDrinks: DrinkRecord[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        userDrinks.push({
          ...data,
          id: doc.id,
          timestamp: data.timestamp?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          lastModified: data.lastModified?.toDate() || new Date()
        } as DrinkRecord);
      });
      
      // Utiliser une transaction pour supprimer toutes les boissons et mettre à jour les stats
      await runTransaction(db, async (transaction) => {
        const groupRef = doc(db, 'groups', groupId);
        const groupDoc = await transaction.get(groupRef);
        
        if (!groupDoc.exists()) {
          throw new Error('Group not found');
        }

        const groupData = groupDoc.data();
        const userDrinksCount = userDrinks.length;

        // Supprimer toutes les boissons de cet utilisateur
        for (const drink of userDrinks) {
          const drinkRef = doc(db, 'groups', groupId, 'drinks', drink.id);
          transaction.delete(drinkRef);
        }

        // Mettre à jour les stats du groupe
        const newTotalDrinks = Math.max(0, (groupData.stats?.totalDrinks || 0) - userDrinksCount);
        
        // Réinitialiser les stats du membre
        transaction.update(groupRef, {
          'stats.totalDrinks': newTotalDrinks,
          [`members.${userId}.totalContributions`]: 0,
          [`members.${userId}.lastActive`]: serverTimestamp()
        });
      });

      console.log(`Successfully deleted ${userDrinks.length} drinks for user ${userId}`);
    } catch (error) {
      console.error('Error deleting user drinks:', error);
      throw error;
    }
  }
}

export default new DrinkService();