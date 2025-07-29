import { GroupActivity } from '../types';
import { ZoneActivity } from './zoneActivityService';
import { GroupZoneActivity } from './groupZoneActivityService';
import groupService from './groupService';
import zoneActivityService from './zoneActivityService';
import groupZoneActivityService from './groupZoneActivityService';

export interface CombinedActivity {
  id: string;
  type: 'drink' | 'zone' | 'group_zone' | 'system';
  timestamp: Date;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  message: string;
  icon: string;
  color: string;
  metadata?: any;
}

class ActivityStreamService {
  private groupId: string | null = null;
  private combinedActivityCallbacks: ((activities: CombinedActivity[]) => void)[] = [];
  private drinkActivities: GroupActivity[] = [];
  private zoneActivities: ZoneActivity[] = [];
  private groupZoneActivities: GroupZoneActivity[] = [];
  private unsubscribeGroupActivities: (() => void) | null = null;
  private unsubscribeZoneActivities: (() => void) | null = null;
  private unsubscribeGroupZoneActivities: (() => void) | null = null;

  async initialize(groupId: string): Promise<void> {
    this.groupId = groupId;
    
    // Nettoyer les anciens listeners
    this.cleanup();
    
    // S'abonner aux activités de groupe (boissons, membres, etc.)
    this.unsubscribeGroupActivities = groupService.onGroupActivitiesUpdate(groupId, (activities) => {
      this.drinkActivities = activities;
      this.updateCombinedActivities();
    });

    // S'abonner aux activités de zone individuelles
    this.unsubscribeZoneActivities = zoneActivityService.onActivitiesUpdate((activities) => {
      this.zoneActivities = activities;
      this.updateCombinedActivities();
    });

    // S'abonner aux activités de zone de groupe
    this.unsubscribeGroupZoneActivities = groupZoneActivityService.onActivitiesUpdate((activities) => {
      this.groupZoneActivities = activities;
      this.updateCombinedActivities();
    });

    // Initialiser le service de détection de groupes
    await groupZoneActivityService.initialize(groupId);
  }

  private updateCombinedActivities(): void {
    const combined: CombinedActivity[] = [];

    // Convertir les activités de boisson
    this.drinkActivities.forEach(activity => {
      combined.push(this.convertDrinkActivity(activity));
    });

    // Convertir les activités de zone individuelles (avec équilibrage)
    this.zoneActivities.forEach(activity => {
      combined.push(this.convertZoneActivity(activity));
    });

    // Convertir les activités de zone de groupe (priorité plus élevée)
    this.groupZoneActivities.forEach(activity => {
      combined.push(this.convertGroupZoneActivity(activity));
    });

    // Trier par timestamp décroissant
    combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Appliquer l'équilibrage intelligent
    const balancedActivities = this.applyActivityBalancing(combined);

    // Limiter aux 50 plus récentes
    const recentActivities = balancedActivities.slice(0, 50);

    // Notifier les callbacks
    this.combinedActivityCallbacks.forEach(callback => callback(recentActivities));
  }

  private convertDrinkActivity(activity: GroupActivity): CombinedActivity {
    let icon = '🍺';
    let color = '#FF9800';
    let message = activity.message;
    
    switch (activity.type) {
      case 'drink_added':
        icon = '🍺';
        color = '#FF9800';
        // Générer un message fun détaillé si on a les metadata
        if (activity.metadata && activity.metadata.drinkType && activity.metadata.todayCount) {
          message = this.generateDetailedDrinkMessage(
            activity.userName,
            activity.metadata.drinkType,
            activity.metadata.customName,
            activity.metadata.todayCount,
            activity.id
          );
        }
        break;
      case 'alert_triggered':
        icon = '⚠️';
        color = '#F44336';
        break;
      case 'milestone_reached':
        icon = '🎉';
        color = '#4CAF50';
        break;
      case 'member_joined':
        icon = '👋';
        color = '#2196F3';
        break;
      case 'member_left':
        icon = '👋';
        color = '#757575';
        break;
    }

    return {
      id: activity.id,
      type: 'drink',
      timestamp: activity.timestamp,
      user: {
        id: activity.userId,
        name: activity.userName,
        avatar: activity.userAvatar
      },
      message,
      icon,
      color,
      metadata: activity.metadata
    };
  }

  private generateDetailedDrinkMessage(
    userName: string,
    drinkType: string,
    customName: string | undefined,
    todayCount: number,
    activityId: string
  ): string {
    const drinkName = customName || drinkType;
    const count = todayCount;
    
    // Messages variés selon le type de boisson (simplifié par rapport au DrinkItem)
    const messages = {
      beer: [
        `${userName} se tape une ${drinkName}! Il est à son ${count}${count === 1 ? 'er' : 'ème'} verre 🍺`,
        `${userName} descend une ${drinkName}! C'est son ${count}${count === 1 ? 'er' : 'ème'} aujourd'hui 🍻`,
        `${userName} se fait plaisir avec une ${drinkName}! Verre n°${count} ✨`
      ],
      wine: [
        `${userName} déguste un ${drinkName}! ${count}${count === 1 ? 'er' : 'ème'} verre au compteur 🍷`,
        `${userName} se régale d'un ${drinkName}! Il en est à ${count} 🍇`,
        `${userName} savoure un ${drinkName}! Verre n°${count} de la journée ✨`
      ],
      cocktail: [
        `${userName} se fait un ${drinkName}! Son ${count}${count === 1 ? 'er' : 'ème'} cocktail 🍹`,
        `${userName} mixe un ${drinkName}! Cocktail n°${count} ✨`,
        `${userName} se concocte un ${drinkName}! Il en est à ${count} 🎉`
      ],
      shot: [
        `${userName} descend un ${drinkName}! Shot n°${count} 🥃`,
        `${userName} se tape un ${drinkName}! ${count}${count === 1 ? 'er' : 'ème'} shot au compteur 🔥`,
        `${userName} cul sec un ${drinkName}! Il en est à ${count} 💥`
      ],
      soft: [
        `${userName} s'hydrate avec ${drinkName}! C'est sa ${count}${count === 1 ? 'ère' : 'ème'} 💧`,
        `${userName} fait une pause fraîcheur avec ${drinkName}! ${count}${count === 1 ? 'ère' : 'ème'} boisson sans alcool 🥤`,
        `${userName} se rafraîchit avec ${drinkName}! Verre n°${count} ✨`
      ],
      triche: [
        `${userName} utilise le pouvoir de la triche ⚡`,
        `Une triche de plus pour ${userName} 🎯`,
        `${userName} active le mode triche ✨`,
        `${userName} fait appel à la triche 🔥`
      ],
      other: [
        `${userName} se tape un ${drinkName}! Il est à son ${count}${count === 1 ? 'er' : 'ème'} verre 🍸`,
        `${userName} descend un ${drinkName}! C'est son ${count}${count === 1 ? 'er' : 'ème'} aujourd'hui 🎉`,
        `${userName} se fait plaisir avec un ${drinkName}! Verre n°${count} ✨`
      ]
    };

    // Déterminer la catégorie de boisson
    const drinkTypeLower = drinkType.toLowerCase();
    let category = 'other';
    
    if (drinkTypeLower.includes('bière') || drinkTypeLower.includes('pinte') || drinkTypeLower.includes('blonde') || drinkTypeLower.includes('brune')) {
      category = 'beer';
    } else if (drinkTypeLower.includes('vin') || drinkTypeLower.includes('rouge') || drinkTypeLower.includes('blanc') || drinkTypeLower.includes('rosé')) {
      category = 'wine';
    } else if (drinkTypeLower.includes('cocktail') || drinkTypeLower.includes('mojito') || drinkTypeLower.includes('piña')) {
      category = 'cocktail';
    } else if (drinkTypeLower.includes('shot') || drinkTypeLower.includes('vodka') || drinkTypeLower.includes('tequila') || drinkTypeLower.includes('rhum')) {
      category = 'shot';
    } else if (drinkTypeLower.includes('eau') || drinkTypeLower.includes('soda') || drinkTypeLower.includes('jus') || drinkTypeLower.includes('sans alcool')) {
      category = 'soft';
    } else if (drinkTypeLower.includes('triche')) {
      category = 'triche';
    }

    const categoryMessages = messages[category as keyof typeof messages];
    
    // Choisir un message basé sur l'ID de l'activité pour avoir de la consistance
    let messageIndex = 0;
    if (activityId) {
      const lastChar = activityId.slice(-1);
      const charCode = lastChar.charCodeAt(0);
      messageIndex = charCode % categoryMessages.length;
    }
    
    return categoryMessages[messageIndex];
  }

  private convertGroupZoneActivity(activity: GroupZoneActivity): CombinedActivity {
    return {
      id: activity.id,
      type: 'group_zone',
      timestamp: activity.timestamp,
      user: {
        id: activity.memberIds[0], // Utiliser le premier membre comme "user principal"
        name: activity.memberNames[0],
        avatar: activity.memberAvatars[0]
      },
      message: activity.message,
      icon: activity.zoneEmoji,
      color: '#4CAF50', // Couleur verte pour les activités de groupe
      metadata: {
        zoneId: activity.zoneId,
        zoneName: activity.zoneName,
        zoneType: activity.zoneType,
        memberIds: activity.memberIds,
        memberNames: activity.memberNames,
        isGroupActivity: true
      }
    };
  }

  private applyActivityBalancing(activities: CombinedActivity[]): CombinedActivity[] {
    const balanced: CombinedActivity[] = [];
    const recentZoneActivities = new Map<string, Date>(); // zoneId -> dernière activité
    const ZONE_COOLDOWN = 30 * 60 * 1000; // 30 minutes entre activités de zone pour la même zone
    
    activities.forEach(activity => {
      // Toujours inclure les activités de boisson
      if (activity.type === 'drink') {
        balanced.push(activity);
        return;
      }

      // Pour les activités de zone de groupe, priorité plus élevée
      if (activity.type === 'group_zone') {
        const zoneId = activity.metadata?.zoneId;
        if (zoneId) {
          const lastActivity = recentZoneActivities.get(zoneId);
          const now = activity.timestamp.getTime();
          
          if (!lastActivity || (now - lastActivity.getTime()) >= ZONE_COOLDOWN) {
            balanced.push(activity);
            recentZoneActivities.set(zoneId, activity.timestamp);
          }
        }
        return;
      }

      // Pour les activités de zone individuelles, appliquer le cooldown plus strictement
      if (activity.type === 'zone') {
        const zoneId = activity.metadata?.zoneId;
        if (zoneId) {
          const lastActivity = recentZoneActivities.get(zoneId);
          const now = activity.timestamp.getTime();
          
          // Cooldown plus long pour les activités individuelles si une activité de groupe récente existe
          const cooldownTime = ZONE_COOLDOWN * 2; // 1 heure pour les individuelles
          
          if (!lastActivity || (now - lastActivity.getTime()) >= cooldownTime) {
            balanced.push(activity);
            recentZoneActivities.set(zoneId, activity.timestamp);
          }
        }
        return;
      }

      // Autres types d'activités (system, etc.)
      balanced.push(activity);
    });

    return balanced;
  }

  private convertZoneActivity(activity: ZoneActivity): CombinedActivity {
    const action = activity.action === 'entered' ? 'est à' : 'a quitté';
    const message = `${activity.userName} ${action} ${activity.zoneName}`;
    
    return {
      id: activity.id,
      type: 'zone',
      timestamp: activity.timestamp,
      user: {
        id: activity.userId,
        name: activity.userName,
        avatar: activity.userAvatar
      },
      message,
      icon: activity.zoneEmoji,
      color: activity.action === 'entered' ? '#4CAF50' : '#757575',
      metadata: {
        zoneId: activity.zoneId,
        zoneName: activity.zoneName,
        action: activity.action
      }
    };
  }

  onActivitiesUpdate(callback: (activities: CombinedActivity[]) => void): () => void {
    this.combinedActivityCallbacks.push(callback);
    
    return () => {
      const index = this.combinedActivityCallbacks.indexOf(callback);
      if (index > -1) {
        this.combinedActivityCallbacks.splice(index, 1);
      }
    };
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

  cleanup(): void {
    // Nettoyer les listeners
    if (this.unsubscribeGroupActivities) {
      this.unsubscribeGroupActivities();
      this.unsubscribeGroupActivities = null;
    }
    
    if (this.unsubscribeZoneActivities) {
      this.unsubscribeZoneActivities();
      this.unsubscribeZoneActivities = null;
    }

    if (this.unsubscribeGroupZoneActivities) {
      this.unsubscribeGroupZoneActivities();
      this.unsubscribeGroupZoneActivities = null;
    }
    
    // Nettoyer le service de détection de groupes
    groupZoneActivityService.cleanup();
    
    this.combinedActivityCallbacks = [];
    this.drinkActivities = [];
    this.zoneActivities = [];
    this.groupZoneActivities = [];
    this.groupId = null;
  }
}

export default new ActivityStreamService();