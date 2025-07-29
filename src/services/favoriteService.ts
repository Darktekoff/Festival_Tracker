import { db } from '../config/firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { UserFavorite, FavoriteInput } from '../types';

class FavoriteService {
  private readonly COLLECTION_NAME = 'favorites';

  // Récupérer tous les favoris d'un utilisateur pour un groupe
  async getUserFavorites(userId: string, groupId: string): Promise<UserFavorite[]> {
    try {
      // Requête simplifiée pour éviter les problèmes d'index
      const favoritesQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('groupId', '==', groupId)
      );

      const snapshot = await getDocs(favoritesQuery);
      
      const allFavorites = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as UserFavorite[];

      const favorites = allFavorites
        .filter(fav => fav.isActive)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return favorites;
    } catch (error) {
      console.error('Error fetching user favorites:', error);
      throw error;
    }
  }

  // Vérifier si un événement est dans les favoris
  async isFavorite(userId: string, eventId: string): Promise<boolean> {
    try {
      const favoriteId = `${userId}_${eventId}`;
      const favoriteRef = doc(db, this.COLLECTION_NAME, favoriteId);
      const favoriteDoc = await getDoc(favoriteRef);

      return favoriteDoc.exists() && favoriteDoc.data()?.isActive === true;
    } catch (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }
  }

  // Ajouter un événement aux favoris
  async addFavorite(userId: string, groupId: string, favoriteInput: FavoriteInput): Promise<string> {
    try {
      const favoriteId = `${userId}_${favoriteInput.eventId}`;
      const favoriteRef = doc(db, this.COLLECTION_NAME, favoriteId);

      const favoriteData: any = {
        userId,
        eventId: favoriteInput.eventId,
        groupId,
        reminderMinutes: favoriteInput.reminderMinutes,
        isActive: true,
        createdAt: serverTimestamp()
      };

      // Ne pas inclure notificationId s'il est undefined
      // Il sera ajouté plus tard via updateNotificationId

      await setDoc(favoriteRef, favoriteData);

      return favoriteId;
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  }

  // Retirer un événement des favoris
  async removeFavorite(userId: string, eventId: string): Promise<void> {
    try {
      const favoriteId = `${userId}_${eventId}`;
      const favoriteRef = doc(db, this.COLLECTION_NAME, favoriteId);
      
      await deleteDoc(favoriteRef);
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }
  }

  // Mettre à jour le délai de rappel d'un favori
  async updateReminderMinutes(userId: string, eventId: string, reminderMinutes: number): Promise<void> {
    try {
      const favoriteId = `${userId}_${eventId}`;
      const favoriteRef = doc(db, this.COLLECTION_NAME, favoriteId);
      
      const favoriteDoc = await getDoc(favoriteRef);
      if (favoriteDoc.exists()) {
        await setDoc(favoriteRef, {
          ...favoriteDoc.data(),
          reminderMinutes,
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error updating reminder minutes:', error);
      throw error;
    }
  }

  // Mettre à jour l'ID de notification
  async updateNotificationId(userId: string, eventId: string, notificationId: string): Promise<void> {
    try {
      const favoriteId = `${userId}_${eventId}`;
      const favoriteRef = doc(db, this.COLLECTION_NAME, favoriteId);
      
      const favoriteDoc = await getDoc(favoriteRef);
      if (favoriteDoc.exists()) {
        await setDoc(favoriteRef, {
          ...favoriteDoc.data(),
          notificationId,
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error updating notification ID:', error);
      throw error;
    }
  }

  // Récupérer un favori spécifique
  async getFavorite(userId: string, eventId: string): Promise<UserFavorite | null> {
    try {
      const favoriteId = `${userId}_${eventId}`;
      const favoriteRef = doc(db, this.COLLECTION_NAME, favoriteId);
      const favoriteDoc = await getDoc(favoriteRef);

      if (favoriteDoc.exists()) {
        return {
          ...favoriteDoc.data(),
          id: favoriteDoc.id,
          createdAt: favoriteDoc.data().createdAt?.toDate() || new Date()
        } as UserFavorite;
      }

      return null;
    } catch (error) {
      console.error('Error fetching favorite:', error);
      return null;
    }
  }

  // Récupérer tous les utilisateurs qui ont mis un événement en favori
  async getEventFavorites(groupId: string, eventId: string): Promise<UserFavorite[]> {
    try {
      const favoritesQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('groupId', '==', groupId),
        where('eventId', '==', eventId)
      );

      const snapshot = await getDocs(favoritesQuery);
      
      const favorites = snapshot.docs
        .map(doc => ({
          ...doc.data(),
          id: doc.id,
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }))
        .filter((fav: any) => fav.isActive) as UserFavorite[];

      return favorites;
    } catch (error) {
      console.error('Error fetching event favorites:', error);
      return [];
    }
  }

  // Compter le nombre de favoris pour un événement
  async getEventFavoritesCount(groupId: string, eventId: string): Promise<number> {
    try {
      const favorites = await this.getEventFavorites(groupId, eventId);
      return favorites.length;
    } catch (error) {
      console.error('Error counting event favorites:', error);
      return 0;
    }
  }
}

export default new FavoriteService();