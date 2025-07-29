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
import { MemberPosition } from './memberLocationService';
import { FestivalZone, ZONE_CONFIGS } from '../types';
import memberLocationService from './memberLocationService';
import festivalMapService from './festivalMapService';

const GROUP_STAY_THRESHOLD = 10 * 60 * 1000; // 10 minutes pour considérer un groupe
const MIN_GROUP_SIZE = 3; // Minimum 3 personnes pour une activité de groupe
const GROUP_ACTIVITY_COOLDOWN = 60 * 60 * 1000; // 1 heure de cooldown par zone

export interface GroupZoneActivity {
  id: string;
  zoneId: string;
  zoneName: string;
  zoneType: string;
  zoneEmoji: string;
  memberIds: string[];
  memberNames: string[];
  memberAvatars: string[];
  timestamp: Date;
  groupId: string;
  message: string;
}

class GroupZoneActivityService {
  private groupId: string | null = null;
  private memberPositions: MemberPosition[] = [];
  private zones: FestivalZone[] = [];
  private groupZoneTimers: Map<string, { members: string[]; startTime: Date }> = new Map();
  private recentGroupActivities: Set<string> = new Set(); // Pour le cooldown
  private activityCallbacks: ((activities: GroupZoneActivity[]) => void)[] = [];
  private unsubscribeActivities: (() => void) | null = null;
  private unsubscribePositions: (() => void) | null = null;
  private unsubscribeZones: (() => void) | null = null;

  async initialize(groupId: string): Promise<void> {
    this.groupId = groupId;
    
    // S'abonner aux positions des membres
    this.unsubscribePositions = memberLocationService.onPositionsUpdate((positions) => {
      this.memberPositions = positions;
      this.checkForGroupFormations();
    });

    // S'abonner aux zones du festival
    this.unsubscribeZones = festivalMapService.onZonesUpdate((zones) => {
      this.zones = zones;
    });

    // S'abonner aux activités de groupe
    this.subscribeToGroupActivities();
  }

  private checkForGroupFormations(): void {
    if (!this.groupId || this.memberPositions.length < MIN_GROUP_SIZE) return;

    // Grouper les membres par zone
    const membersByZone = new Map<string, MemberPosition[]>();
    
    this.memberPositions.forEach(member => {
      if (member.currentZone && member.isOnline) {
        const zoneId = member.currentZone.id;
        if (!membersByZone.has(zoneId)) {
          membersByZone.set(zoneId, []);
        }
        membersByZone.get(zoneId)!.push(member);
      }
    });

    // Vérifier chaque zone pour des groupes potentiels
    membersByZone.forEach((members, zoneId) => {
      if (members.length >= MIN_GROUP_SIZE) {
        this.handlePotentialGroup(zoneId, members);
      } else {
        // Nettoyer les timers pour cette zone si pas assez de monde
        this.groupZoneTimers.delete(zoneId);
      }
    });
  }

  private handlePotentialGroup(zoneId: string, members: MemberPosition[]): void {
    const memberIds = members.map(m => m.userId).sort();
    const memberKey = `${zoneId}_${memberIds.join('_')}`;
    
    // Vérifier le cooldown
    if (this.recentGroupActivities.has(memberKey)) {
      return;
    }

    const now = new Date();
    
    if (!this.groupZoneTimers.has(zoneId)) {
      // Nouveau groupe potentiel
      this.groupZoneTimers.set(zoneId, {
        members: memberIds,
        startTime: now
      });
      
      // Programmer la vérification après le délai
      setTimeout(() => {
        this.checkAndCreateGroupActivity(zoneId, memberIds);
      }, GROUP_STAY_THRESHOLD);
    } else {
      // Groupe existant, vérifier si les membres ont changé
      const existing = this.groupZoneTimers.get(zoneId)!;
      const existingMemberIds = existing.members.sort();
      
      if (JSON.stringify(memberIds) !== JSON.stringify(existingMemberIds)) {
        // Les membres ont changé, redémarrer le timer
        this.groupZoneTimers.set(zoneId, {
          members: memberIds,
          startTime: now
        });
        
        setTimeout(() => {
          this.checkAndCreateGroupActivity(zoneId, memberIds);
        }, GROUP_STAY_THRESHOLD);
      }
    }
  }

  private async checkAndCreateGroupActivity(zoneId: string, memberIds: string[]): Promise<void> {
    // Vérifier que le groupe est toujours présent
    const timer = this.groupZoneTimers.get(zoneId);
    if (!timer || JSON.stringify(timer.members.sort()) !== JSON.stringify(memberIds.sort())) {
      return;
    }

    // Vérifier que le temps requis s'est écoulé
    const timeSpent = new Date().getTime() - timer.startTime.getTime();
    if (timeSpent < GROUP_STAY_THRESHOLD) {
      return;
    }

    // Trouver la zone
    const zone = this.zones.find(z => z.id === zoneId);
    if (!zone) return;

    // Vérifier que c'est une zone appropriée pour les activités de groupe
    if (!this.isZoneAppropriateForGroupActivity(zone.type)) {
      return;
    }

    // Obtenir les informations des membres
    const members = this.memberPositions.filter(m => memberIds.includes(m.userId));
    if (members.length < MIN_GROUP_SIZE) return;

    await this.createGroupZoneActivity(zone, members);
    
    // Nettoyer le timer
    this.groupZoneTimers.delete(zoneId);
    
    // Ajouter au cooldown
    const memberKey = `${zoneId}_${memberIds.sort().join('_')}`;
    this.recentGroupActivities.add(memberKey);
    
    // Supprimer du cooldown après la période définie
    setTimeout(() => {
      this.recentGroupActivities.delete(memberKey);
    }, GROUP_ACTIVITY_COOLDOWN);
  }

  private isZoneAppropriateForGroupActivity(zoneType: string): boolean {
    // Autoriser les activités de groupe pour certaines zones seulement
    const allowedZones = ['stage', 'bar', 'food', 'camping', 'hq'];
    return allowedZones.includes(zoneType);
  }

  private async createGroupZoneActivity(zone: FestivalZone, members: MemberPosition[]): Promise<void> {
    if (!this.groupId) return;

    try {
      const memberNames = members.map(m => m.userName);
      const memberAvatars = members.map(m => m.userAvatar);
      const message = this.generateGroupMessage(zone, memberNames);
      
      const activityId = `group_${zone.id}_${Date.now()}`;
      const zoneConfig = ZONE_CONFIGS[zone.type];
      
      const activity: Omit<GroupZoneActivity, 'id' | 'timestamp'> = {
        zoneId: zone.id,
        zoneName: zone.name,
        zoneType: zone.type,
        zoneEmoji: zoneConfig.emoji,
        memberIds: members.map(m => m.userId),
        memberNames,
        memberAvatars,
        groupId: this.groupId,
        message
      };

      const activityRef = doc(db, 'groups', this.groupId, 'groupZoneActivities', activityId);
      await setDoc(activityRef, {
        ...activity,
        timestamp: serverTimestamp()
      });

      console.log(`Group zone activity created: ${message}`);
    } catch (error) {
      console.error('Error creating group zone activity:', error);
    }
  }

  private generateGroupMessage(zone: FestivalZone, memberNames: string[]): string {
    const names = this.formatMemberNames(memberNames);
    
    // Messages contextuels selon le type de zone
    switch (zone.type) {
      case 'hq':
        return `Réunion au QG ! ${names} sont de retour à ${zone.name} 🏠`;
      case 'camping':
        return `Retour au camping pour ${names} ! Ils sont à ${zone.name} ⛺`;
      case 'stage':
        return `L'ambiance est folle à ${zone.name} ! ${names} y sont 🎸`;
      case 'bar':
        return `Ça trinque à ${zone.name} avec ${names} ! 🍺`;
      case 'food':
        return `Pause gourmande à ${zone.name} pour ${names} ! 🍔`;
      default:
        return `${names} se retrouvent à ${zone.name} !`;
    }
  }

  private formatMemberNames(names: string[]): string {
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} et ${names[1]}`;
    if (names.length === 3) return `${names[0]}, ${names[1]} et ${names[2]}`;
    
    // Plus de 3 personnes
    const firstThree = names.slice(0, 3);
    const remaining = names.length - 3;
    return `${firstThree.join(', ')} et ${remaining} autre${remaining > 1 ? 's' : ''}`;
  }

  private subscribeToGroupActivities(): void {
    if (!this.groupId) return;

    const activitiesRef = collection(db, 'groups', this.groupId, 'groupZoneActivities');
    const q = query(
      activitiesRef,
      orderBy('timestamp', 'desc'),
      limit(20) // Limiter aux 20 dernières activités de groupe
    );

    this.unsubscribeActivities = onSnapshot(q, (snapshot) => {
      const activities: GroupZoneActivity[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          zoneId: data.zoneId,
          zoneName: data.zoneName,
          zoneType: data.zoneType,
          zoneEmoji: data.zoneEmoji,
          memberIds: data.memberIds,
          memberNames: data.memberNames,
          memberAvatars: data.memberAvatars,
          timestamp: data.timestamp?.toDate() || new Date(),
          groupId: data.groupId,
          message: data.message
        });
      });

      this.notifyActivityUpdate(activities);
    }, (error) => {
      console.error('Error subscribing to group zone activities:', error);
    });
  }

  private notifyActivityUpdate(activities: GroupZoneActivity[]): void {
    this.activityCallbacks.forEach(callback => callback(activities));
  }

  onActivitiesUpdate(callback: (activities: GroupZoneActivity[]) => void): () => void {
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
      const activitiesRef = collection(db, 'groups', this.groupId, 'groupZoneActivities');
      const q = query(
        activitiesRef,
        where('timestamp', '<', oneDayAgo)
      );

      const snapshot = await q.get();
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      
      await Promise.all(deletePromises);
      console.log(`Cleaned up ${snapshot.docs.length} old group zone activities`);
    } catch (error) {
      console.error('Error cleaning up old group activities:', error);
    }
  }

  async cleanup(): Promise<void> {
    if (this.unsubscribeActivities) {
      this.unsubscribeActivities();
      this.unsubscribeActivities = null;
    }

    if (this.unsubscribePositions) {
      this.unsubscribePositions();
      this.unsubscribePositions = null;
    }

    if (this.unsubscribeZones) {
      this.unsubscribeZones();
      this.unsubscribeZones = null;
    }

    this.activityCallbacks = [];
    this.groupZoneTimers.clear();
    this.recentGroupActivities.clear();
    this.memberPositions = [];
    this.zones = [];
    this.groupId = null;
  }
}

export default new GroupZoneActivityService();