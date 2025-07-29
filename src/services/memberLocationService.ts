import { db, auth } from '../config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import festivalLocationService from './festivalLocationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SHARING_STORAGE_KEY = '@location_sharing_enabled';
const POSITION_UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutes
const POSITION_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes

export interface MemberPosition {
  userId: string;
  userName: string;
  userAvatar: string;
  position: {
    latitude: number;
    longitude: number;
  };
  currentZone?: {
    id: string;
    name: string;
  };
  lastUpdated: Date;
  isOnline: boolean;
}

class MemberLocationService {
  private groupId: string | null = null;
  private isSharing: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private unsubscribePositions: (() => void) | null = null;
  private memberPositions: MemberPosition[] = [];
  private positionCallbacks: ((positions: MemberPosition[]) => void)[] = [];

  async initialize(groupId: string): Promise<void> {
    this.groupId = groupId;
    
    // Charger la préférence de partage
    const sharingEnabled = await this.getSharingPreference();
    
    if (sharingEnabled) {
      await this.startSharing();
    }

    // Écouter les positions des autres membres
    this.subscribeToMemberPositions();
  }

  async getSharingPreference(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(SHARING_STORAGE_KEY);
      return stored === 'true';
    } catch (error) {
      console.error('Error getting sharing preference:', error);
      return false;
    }
  }

  async setSharingPreference(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(SHARING_STORAGE_KEY, enabled.toString());
      this.isSharing = enabled;

      if (enabled) {
        await this.startSharing();
      } else {
        await this.stopSharing();
      }
    } catch (error) {
      console.error('Error setting sharing preference:', error);
      throw error;
    }
  }

  private async startSharing(): Promise<void> {
    if (!this.groupId || this.updateInterval) return;

    this.isSharing = true;

    // Première mise à jour immédiate
    await this.updatePosition();

    // Mise à jour périodique
    this.updateInterval = setInterval(async () => {
      await this.updatePosition();
    }, POSITION_UPDATE_INTERVAL);

    console.log('Member location sharing started');
  }

  private async stopSharing(): Promise<void> {
    this.isSharing = false;

    // Arrêter les mises à jour
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Supprimer notre position de Firebase
    await this.removePosition();

    console.log('Member location sharing stopped');
  }

  private async updatePosition(): Promise<void> {
    try {
      if (!this.groupId || !this.isSharing) return;

      const userId = auth.currentUser?.uid;
      const user = auth.currentUser;
      
      if (!userId || !user) return;

      // Obtenir la position actuelle
      const location = await festivalLocationService.getCurrentLocation();
      if (!location) return;

      // Obtenir la zone actuelle
      const currentZone = festivalLocationService.getCurrentZone();

      // Obtenir les infos utilisateur depuis Firebase
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.exists() ? userDoc.data() : null;
      
      const userName = userData?.name || user.displayName || 'Utilisateur';
      const userAvatar = userData?.avatar || '🙂';

      const memberPosition: any = {
        userId,
        userName,
        userAvatar,
        position: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        },
        isOnline: true,
        lastUpdated: serverTimestamp()
      };

      // Ajouter currentZone seulement s'il existe (Firebase n'accepte pas undefined)
      if (currentZone) {
        memberPosition.currentZone = {
          id: currentZone.id,
          name: currentZone.name
        };
      }

      // Sauvegarder dans Firebase
      const positionRef = doc(db, 'groups', this.groupId, 'memberPositions', userId);
      await setDoc(positionRef, memberPosition);

    } catch (error) {
      console.error('Error updating position:', error);
    }
  }

  private async removePosition(): Promise<void> {
    try {
      if (!this.groupId) return;

      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const positionRef = doc(db, 'groups', this.groupId, 'memberPositions', userId);
      await deleteDoc(positionRef);
    } catch (error) {
      console.error('Error removing position:', error);
    }
  }

  private subscribeToMemberPositions(): void {
    if (!this.groupId) return;

    const positionsRef = collection(db, 'groups', this.groupId, 'memberPositions');
    
    this.unsubscribePositions = onSnapshot(positionsRef, (snapshot) => {
      const positions: MemberPosition[] = [];
      const currentUserId = auth.currentUser?.uid;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Ne pas inclure notre propre position
        if (data.userId !== currentUserId) {
          // Vérifier si la position n'est pas expirée
          const lastUpdated = data.lastUpdated?.toDate() || new Date(0);
          const now = new Date();
          const timeDiff = now.getTime() - lastUpdated.getTime();
          
          if (timeDiff < POSITION_EXPIRY_TIME) {
            positions.push({
              userId: data.userId,
              userName: data.userName,
              userAvatar: data.userAvatar,
              position: data.position,
              currentZone: data.currentZone,
              lastUpdated,
              isOnline: timeDiff < POSITION_UPDATE_INTERVAL * 2 // Considéré en ligne si moins de 4 min
            });
          }
        }
      });

      this.memberPositions = positions;
      this.notifyPositionUpdate(positions);
    }, (error) => {
      console.error('Error subscribing to member positions:', error);
    });
  }

  private notifyPositionUpdate(positions: MemberPosition[]): void {
    this.positionCallbacks.forEach(callback => callback(positions));
  }

  onPositionsUpdate(callback: (positions: MemberPosition[]) => void): () => void {
    this.positionCallbacks.push(callback);
    
    // Appeler immédiatement avec les positions actuelles
    if (this.memberPositions.length > 0) {
      callback(this.memberPositions);
    }

    return () => {
      const index = this.positionCallbacks.indexOf(callback);
      if (index > -1) {
        this.positionCallbacks.splice(index, 1);
      }
    };
  }

  getMemberPositions(): MemberPosition[] {
    return [...this.memberPositions];
  }

  isCurrentlySharing(): boolean {
    return this.isSharing;
  }

  async cleanup(): Promise<void> {
    await this.stopSharing();
    
    if (this.unsubscribePositions) {
      this.unsubscribePositions();
      this.unsubscribePositions = null;
    }

    this.memberPositions = [];
    this.positionCallbacks = [];
    this.groupId = null;
  }

  // Méthode utilitaire pour formater le temps
  getTimeAgo(lastUpdated: Date): string {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastUpdated.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'à l\'instant';
    if (diffMinutes === 1) return 'il y a 1 min';
    if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return 'il y a 1h';
    return `il y a ${diffHours}h`;
  }
}

export default new MemberLocationService();