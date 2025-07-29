import { db } from '../config/firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { 
  LocationRequest, 
  LocationResponse, 
  LocationShare, 
  LocationRequestStatus,
  LocationData 
} from '../types/location';
import locationService from './locationService';
import { eventBus } from '../utils/eventBus';
import notificationService from './notificationService';

class LocationRequestService {
  private readonly REQUESTS_COLLECTION = 'locationRequests';
  private readonly SHARES_COLLECTION = 'locationShares';
  private readonly REQUEST_EXPIRY_MINUTES = 5; // Expiration des demandes

  /**
   * Envoie une demande de localisation à un autre utilisateur
   */
  async sendLocationRequest(
    fromUserId: string,
    fromUserName: string,
    toUserId: string,
    toUserName: string,
    groupId: string,
    message?: string
  ): Promise<string> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.REQUEST_EXPIRY_MINUTES * 60 * 1000);

      const requestData = {
        fromUserId,
        fromUserName,
        toUserId,
        toUserName,
        groupId,
        message: message || `${fromUserName} aimerait savoir où tu te trouves pour te rejoindre !`,
        status: 'pending' as LocationRequestStatus,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt)
      };

      const docRef = await addDoc(collection(db, this.REQUESTS_COLLECTION), requestData);

      // Émettre l'événement via EventBus
      eventBus.emit('LOCATION_REQUEST_SENT', {
        id: docRef.id,
        ...requestData,
        createdAt: now,
        expiresAt
      });

      // Envoyer une notification push au destinataire
      await notificationService.sendLocationRequestNotification(
        fromUserName,
        docRef.id,
        fromUserId
      );

      return docRef.id;
    } catch (error) {
      console.error('Error sending location request:', error);
      throw new Error('Impossible d\'envoyer la demande de localisation');
    }
  }

  /**
   * Répond à une demande de localisation
   */
  async respondToLocationRequest(
    requestId: string,
    status: 'accepted' | 'declined',
    message?: string
  ): Promise<void> {
    try {
      const requestRef = doc(db, this.REQUESTS_COLLECTION, requestId);
      const requestDoc = await getDoc(requestRef);

      if (!requestDoc.exists()) {
        throw new Error('Demande de localisation introuvable');
      }

      const requestData = requestDoc.data() as any;
      
      // Vérifier si la demande n'a pas expiré
      const now = new Date();
      const expiresAt = requestData.expiresAt.toDate();
      
      if (now > expiresAt) {
        await this.markRequestAsExpired(requestId);
        throw new Error('Cette demande de localisation a expiré');
      }

      let locationData: LocationData | undefined;

      // Si accepté, obtenir la position actuelle
      if (status === 'accepted') {
        try {
          locationData = await locationService.getCurrentPosition({
            accuracy: 'high',
            timeout: 10000
          });
        } catch (locationError) {
          console.error('Error getting location for response:', locationError);
          throw new Error('Impossible d\'obtenir votre position actuelle');
        }
      }

      // Mettre à jour la demande
      await setDoc(requestRef, {
        ...requestData,
        status,
        respondedAt: serverTimestamp()
      }, { merge: true });

      // Créer la réponse
      const response: Omit<LocationResponse, 'respondedAt'> & { respondedAt: any } = {
        requestId,
        status,
        location: locationData,
        message,
        respondedAt: serverTimestamp()
      };

      // Si accepté, créer un partage de localisation
      if (status === 'accepted' && locationData) {
        await this.createLocationShare(
          requestData.toUserId,
          requestData.toUserName,
          requestData.fromUserId,
          requestData.groupId,
          locationData
        );
      }

      // Émettre l'événement via EventBus
      eventBus.emit('LOCATION_REQUEST_RESPONDED', {
        ...response,
        respondedAt: now
      });

    } catch (error) {
      console.error('Error responding to location request:', error);
      throw error;
    }
  }

  /**
   * Crée un partage de localisation
   */
  private async createLocationShare(
    fromUserId: string,
    fromUserName: string,
    toUserId: string,
    groupId: string,
    location: LocationData
  ): Promise<string> {
    try {
      const shareData = {
        fromUserId,
        fromUserName,
        toUserId,
        groupId,
        location: {
          coordinates: location.coordinates,
          timestamp: Timestamp.fromDate(location.timestamp),
          address: location.address
        },
        sharedAt: serverTimestamp(),
        viewed: false
      };

      const docRef = await addDoc(collection(db, this.SHARES_COLLECTION), shareData);

      // Émettre l'événement via EventBus
      eventBus.emit('LOCATION_SHARED', {
        id: docRef.id,
        ...shareData,
        sharedAt: new Date(),
        location: {
          ...location,
          timestamp: location.timestamp
        }
      });

      // Envoyer une notification push au demandeur
      await notificationService.sendLocationSharedNotification(
        fromUserName,
        docRef.id
      );

      return docRef.id;
    } catch (error) {
      console.error('Error creating location share:', error);
      throw new Error('Impossible de partager la localisation');
    }
  }

  /**
   * Marque une demande comme expirée
   */
  private async markRequestAsExpired(requestId: string): Promise<void> {
    try {
      const requestRef = doc(db, this.REQUESTS_COLLECTION, requestId);
      await setDoc(requestRef, {
        status: 'expired' as LocationRequestStatus
      }, { merge: true });

      eventBus.emit('LOCATION_REQUEST_EXPIRED', { requestId });
    } catch (error) {
      console.error('Error marking request as expired:', error);
    }
  }

  /**
   * Annule une demande de localisation
   */
  async cancelLocationRequest(requestId: string): Promise<void> {
    try {
      const requestRef = doc(db, this.REQUESTS_COLLECTION, requestId);
      await setDoc(requestRef, {
        status: 'cancelled' as LocationRequestStatus
      }, { merge: true });

      eventBus.emit('LOCATION_REQUEST_CANCELLED', { requestId });
    } catch (error) {
      console.error('Error cancelling location request:', error);
      throw new Error('Impossible d\'annuler la demande');
    }
  }

  /**
   * Récupère les demandes de localisation reçues par un utilisateur
   */
  async getReceivedRequests(userId: string): Promise<LocationRequest[]> {
    try {
      const q = query(
        collection(db, this.REQUESTS_COLLECTION),
        where('toUserId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      const requests: LocationRequest[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          expiresAt: data.expiresAt.toDate(),
          respondedAt: data.respondedAt?.toDate()
        } as LocationRequest);
      });

      // Filtrer les demandes expirées et les marquer
      const now = new Date();
      const validRequests = [];

      for (const request of requests) {
        if (now > request.expiresAt) {
          await this.markRequestAsExpired(request.id);
        } else {
          validRequests.push(request);
        }
      }

      return validRequests;
    } catch (error) {
      console.error('Error getting received requests:', error);
      return [];
    }
  }

  /**
   * Récupère les demandes envoyées par un utilisateur
   */
  async getSentRequests(userId: string): Promise<LocationRequest[]> {
    try {
      const q = query(
        collection(db, this.REQUESTS_COLLECTION),
        where('fromUserId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      const requests: LocationRequest[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          expiresAt: data.expiresAt.toDate(),
          respondedAt: data.respondedAt?.toDate()
        } as LocationRequest);
      });

      return requests;
    } catch (error) {
      console.error('Error getting sent requests:', error);
      return [];
    }
  }

  /**
   * Récupère les localisations partagées reçues par un utilisateur
   */
  async getReceivedShares(userId: string): Promise<LocationShare[]> {
    try {
      const q = query(
        collection(db, this.SHARES_COLLECTION),
        where('toUserId', '==', userId),
        orderBy('sharedAt', 'desc'),
        limit(20)
      );

      const snapshot = await getDocs(q);
      const shares: LocationShare[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        shares.push({
          id: doc.id,
          ...data,
          location: {
            ...data.location,
            timestamp: data.location.timestamp.toDate()
          },
          sharedAt: data.sharedAt.toDate(),
          expiresAt: data.expiresAt?.toDate()
        } as LocationShare);
      });

      return shares;
    } catch (error) {
      console.error('Error getting received shares:', error);
      return [];
    }
  }

  /**
   * Marque une localisation partagée comme vue
   */
  async markShareAsViewed(shareId: string): Promise<void> {
    try {
      const shareRef = doc(db, this.SHARES_COLLECTION, shareId);
      await setDoc(shareRef, {
        viewed: true
      }, { merge: true });
    } catch (error) {
      console.error('Error marking share as viewed:', error);
    }
  }

  /**
   * Écoute les nouvelles demandes de localisation pour un utilisateur
   */
  subscribeToRequests(
    userId: string, 
    callback: (requests: LocationRequest[]) => void
  ): () => void {
    const q = query(
      collection(db, this.REQUESTS_COLLECTION),
      where('toUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const requests: LocationRequest[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          expiresAt: data.expiresAt.toDate(),
          respondedAt: data.respondedAt?.toDate()
        } as LocationRequest);
      });

      callback(requests);
    });
  }

  /**
   * Écoute les nouvelles localisations partagées pour un utilisateur
   */
  subscribeToShares(
    userId: string, 
    callback: (shares: LocationShare[]) => void
  ): () => void {
    const q = query(
      collection(db, this.SHARES_COLLECTION),
      where('toUserId', '==', userId),
      orderBy('sharedAt', 'desc'),
      limit(20)
    );

    return onSnapshot(q, (snapshot) => {
      const shares: LocationShare[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        shares.push({
          id: doc.id,
          ...data,
          location: {
            ...data.location,
            timestamp: data.location.timestamp.toDate()
          },
          sharedAt: data.sharedAt.toDate(),
          expiresAt: data.expiresAt?.toDate()
        } as LocationShare);
      });

      callback(shares);
    });
  }

  /**
   * Nettoie les demandes et partages expirés (à appeler périodiquement)
   */
  async cleanupExpiredData(): Promise<void> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Nettoyer les demandes expirées depuis plus d'une journée
      const expiredRequestsQuery = query(
        collection(db, this.REQUESTS_COLLECTION),
        where('expiresAt', '<', Timestamp.fromDate(oneDayAgo))
      );

      const expiredRequestsSnapshot = await getDocs(expiredRequestsQuery);
      const deletePromises: Promise<void>[] = [];

      expiredRequestsSnapshot.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref));
      });

      await Promise.all(deletePromises);

      console.log(`Cleaned up ${deletePromises.length} expired location requests`);
    } catch (error) {
      console.error('Error cleaning up expired data:', error);
    }
  }
}

export default new LocationRequestService();