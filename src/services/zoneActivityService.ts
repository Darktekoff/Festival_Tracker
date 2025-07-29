import { db, auth } from '../config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  serverTimestamp,
  where,
  deleteDoc
} from 'firebase/firestore';
import { FestivalZone, ZONE_CONFIGS } from '../types';

const ZONE_STAY_THRESHOLD = 5 * 60 * 1000; // 5 minutes pour considérer qu'on "est" dans une zone

export interface ZoneActivity {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  zoneId: string;
  zoneName: string;
  zoneEmoji: string;
  action: 'entered' | 'left';
  timestamp: Date;
  groupId: string;
}

class ZoneActivityService {
  private groupId: string | null = null;
  private currentZoneStayStart: Date | null = null;
  private currentZone: FestivalZone | null = null;
  private activityCallbacks: ((activities: ZoneActivity[]) => void)[] = [];
  private unsubscribeActivities: (() => void) | null = null;

  async initialize(groupId: string): Promise<void> {
    this.groupId = groupId;
    this.subscribeToActivities();
  }

  // Méthode appelée quand l'utilisateur change de zone
  async onZoneChange(newZone: FestivalZone | null, userName: string, userAvatar: string): Promise<void> {
    if (!this.groupId) return;

    const now = new Date();
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    // Si on quitte une zone où on était depuis > 5min, créer une activité "left"
    if (this.currentZone && this.currentZoneStayStart) {
      const stayDuration = now.getTime() - this.currentZoneStayStart.getTime();
      
      if (stayDuration >= ZONE_STAY_THRESHOLD) {
        await this.createZoneActivity(
          userId, 
          userName, 
          userAvatar, 
          this.currentZone, 
          'left'
        );
      }
    }

    // Mettre à jour la zone actuelle
    this.currentZone = newZone;
    this.currentZoneStayStart = newZone ? now : null;

    // Si on entre dans une nouvelle zone, démarrer le timer
    if (newZone) {
      // Attendre 5 minutes puis créer l'activité "entered"
      setTimeout(async () => {
        // Vérifier qu'on est toujours dans la même zone
        if (this.currentZone?.id === newZone.id && this.currentZoneStayStart) {
          const stayDuration = new Date().getTime() - this.currentZoneStayStart.getTime();
          
          if (stayDuration >= ZONE_STAY_THRESHOLD) {
            await this.createZoneActivity(
              userId, 
              userName, 
              userAvatar, 
              newZone, 
              'entered'
            );
          }
        }
      }, ZONE_STAY_THRESHOLD);
    }
  }

  private async createZoneActivity(
    userId: string, 
    userName: string, 
    userAvatar: string, 
    zone: FestivalZone, 
    action: 'entered' | 'left'
  ): Promise<void> {
    if (!this.groupId) return;

    try {
      const activityId = `${userId}_${zone.id}_${action}_${Date.now()}`;
      
      const zoneConfig = ZONE_CONFIGS[zone.type];
      
      const activity: Omit<ZoneActivity, 'id' | 'timestamp'> = {
        userId,
        userName,
        userAvatar,
        zoneId: zone.id,
        zoneName: zone.name,
        zoneEmoji: zoneConfig.emoji,
        action,
        groupId: this.groupId
      };

      const activityRef = doc(db, 'groups', this.groupId, 'zoneActivities', activityId);
      await setDoc(activityRef, {
        ...activity,
        timestamp: serverTimestamp()
      });

      console.log(`Zone activity created: ${userName} ${action} ${zone.name}`);
    } catch (error) {
      console.error('Error creating zone activity:', error);
    }
  }

  private subscribeToActivities(): void {
    if (!this.groupId) return;

    const activitiesRef = collection(db, 'groups', this.groupId, 'zoneActivities');
    const q = query(
      activitiesRef,
      orderBy('timestamp', 'desc'),
      limit(50) // Limiter aux 50 dernières activités
    );

    this.unsubscribeActivities = onSnapshot(q, (snapshot) => {
      const activities: ZoneActivity[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          userAvatar: data.userAvatar,
          zoneId: data.zoneId,
          zoneName: data.zoneName,
          zoneEmoji: data.zoneEmoji,
          action: data.action,
          timestamp: data.timestamp?.toDate() || new Date(),
          groupId: data.groupId
        });
      });

      this.notifyActivityUpdate(activities);
    }, (error) => {
      console.error('Error subscribing to zone activities:', error);
    });
  }

  private notifyActivityUpdate(activities: ZoneActivity[]): void {
    this.activityCallbacks.forEach(callback => callback(activities));
  }

  onActivitiesUpdate(callback: (activities: ZoneActivity[]) => void): () => void {
    this.activityCallbacks.push(callback);
    
    return () => {
      const index = this.activityCallbacks.indexOf(callback);
      if (index > -1) {
        this.activityCallbacks.splice(index, 1);
      }
    };
  }

  // Nettoyer les anciennes activités (plus de 24h)
  async cleanupOldActivities(): Promise<void> {
    if (!this.groupId) return;

    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activitiesRef = collection(db, 'groups', this.groupId, 'zoneActivities');
      const q = query(
        activitiesRef,
        where('timestamp', '<', oneDayAgo)
      );

      const snapshot = await q.get();
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      
      await Promise.all(deletePromises);
      console.log(`Cleaned up ${snapshot.docs.length} old zone activities`);
    } catch (error) {
      console.error('Error cleaning up old activities:', error);
    }
  }

  async cleanup(): Promise<void> {
    if (this.unsubscribeActivities) {
      this.unsubscribeActivities();
      this.unsubscribeActivities = null;
    }

    this.activityCallbacks = [];
    this.currentZone = null;
    this.currentZoneStayStart = null;
    this.groupId = null;
  }

  // Utilitaires pour le formatage
  formatActivityText(activity: ZoneActivity): string {
    const action = activity.action === 'entered' ? 'est à' : 'a quitté';
    return `${activity.userName} ${action} ${activity.zoneName}`;
  }

  getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - timestamp.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'à l\'instant';
    if (diffMinutes === 1) return 'il y a 1 min';
    if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return 'il y a 1h';
    if (diffHours < 24) return `il y a ${diffHours}h`;
    
    return 'il y a plus d\'un jour';
  }
}

export default new ZoneActivityService();