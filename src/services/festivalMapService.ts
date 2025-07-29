import { db, auth } from '../config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { FestivalZone, ZoneType, ZONE_CONFIGS } from '../types';

class FestivalMapService {
  private groupId: string | null = null;
  private zonesCache: FestivalZone[] = [];
  private unsubscribe: (() => void) | null = null;
  private zonesCallbacks: ((zones: FestivalZone[]) => void)[] = [];

  setGroupId(groupId: string): void {
    this.groupId = groupId;
    this.subscribeToZones();
  }

  private subscribeToZones(): void {
    if (!this.groupId) return;

    // Se désabonner de l'ancien listener
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    // S'abonner aux changements des zones
    const zonesRef = collection(db, 'groups', this.groupId, 'festivalZones');
    this.unsubscribe = onSnapshot(zonesRef, (snapshot) => {
      const zones: FestivalZone[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        zones.push({
          id: doc.id,
          name: data.name,
          type: data.type as ZoneType,
          emoji: data.emoji,
          position: data.position,
          radius: data.radius,
          createdBy: data.createdBy,
          createdByName: data.createdByName,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate()
        });
      });

      this.zonesCache = zones;
      this.notifyZonesUpdate(zones);
    }, (error) => {
      console.error('Error subscribing to zones:', error);
    });
  }

  async createZone(
    name: string, 
    type: ZoneType, 
    position: { latitude: number; longitude: number }, 
    radius: number = 50
  ): Promise<FestivalZone | null> {
    try {
      if (!this.groupId) {
        throw new Error('No group ID set');
      }

      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Récupérer le nom de l'utilisateur
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userName = userDoc.exists() ? userDoc.data().name : 'Inconnu';

      const zoneId = `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const zoneConfig = ZONE_CONFIGS[type];

      const newZone: Omit<FestivalZone, 'id'> = {
        name,
        type,
        emoji: zoneConfig.emoji,
        position,
        radius,
        createdBy: userId,
        createdByName: userName,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const zoneRef = doc(db, 'groups', this.groupId, 'festivalZones', zoneId);
      await setDoc(zoneRef, {
        ...newZone,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        id: zoneId,
        ...newZone
      };
    } catch (error) {
      console.error('Error creating zone:', error);
      return null;
    }
  }

  async updateZone(
    zoneId: string, 
    updates: Partial<Pick<FestivalZone, 'name' | 'radius'>>
  ): Promise<boolean> {
    try {
      if (!this.groupId) {
        throw new Error('No group ID set');
      }

      const zoneRef = doc(db, 'groups', this.groupId, 'festivalZones', zoneId);
      await updateDoc(zoneRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error updating zone:', error);
      return false;
    }
  }

  async deleteZone(zoneId: string): Promise<boolean> {
    try {
      if (!this.groupId) {
        throw new Error('No group ID set');
      }

      const zoneRef = doc(db, 'groups', this.groupId, 'festivalZones', zoneId);
      await deleteDoc(zoneRef);

      return true;
    } catch (error) {
      console.error('Error deleting zone:', error);
      return false;
    }
  }

  async getZones(): Promise<FestivalZone[]> {
    try {
      if (!this.groupId) {
        throw new Error('No group ID set');
      }

      // Retourner le cache si disponible
      if (this.zonesCache.length > 0) {
        return this.zonesCache;
      }

      // Sinon, récupérer depuis Firebase
      const zonesRef = collection(db, 'groups', this.groupId, 'festivalZones');
      const snapshot = await getDocs(zonesRef);
      
      const zones: FestivalZone[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        zones.push({
          id: doc.id,
          name: data.name,
          type: data.type as ZoneType,
          emoji: data.emoji,
          position: data.position,
          radius: data.radius,
          createdBy: data.createdBy,
          createdByName: data.createdByName,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate()
        });
      });

      this.zonesCache = zones;
      return zones;
    } catch (error) {
      console.error('Error getting zones:', error);
      return [];
    }
  }

  getZoneById(zoneId: string): FestivalZone | null {
    return this.zonesCache.find(zone => zone.id === zoneId) || null;
  }

  getZonesByType(type: ZoneType): FestivalZone[] {
    return this.zonesCache.filter(zone => zone.type === type);
  }

  getZonesByCreator(userId: string): FestivalZone[] {
    return this.zonesCache.filter(zone => zone.createdBy === userId);
  }

  onZonesUpdate(callback: (zones: FestivalZone[]) => void): () => void {
    this.zonesCallbacks.push(callback);
    
    // Appeler immédiatement avec les zones actuelles
    if (this.zonesCache.length > 0) {
      callback(this.zonesCache);
    }

    return () => {
      const index = this.zonesCallbacks.indexOf(callback);
      if (index > -1) {
        this.zonesCallbacks.splice(index, 1);
      }
    };
  }

  private notifyZonesUpdate(zones: FestivalZone[]): void {
    this.zonesCallbacks.forEach(callback => callback(zones));
  }

  async clearAllZones(): Promise<boolean> {
    try {
      if (!this.groupId) {
        throw new Error('No group ID set');
      }

      const zonesRef = collection(db, 'groups', this.groupId, 'festivalZones');
      const snapshot = await getDocs(zonesRef);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      return true;
    } catch (error) {
      console.error('Error clearing all zones:', error);
      return false;
    }
  }

  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.zonesCache = [];
    this.zonesCallbacks = [];
  }
}

export default new FestivalMapService();