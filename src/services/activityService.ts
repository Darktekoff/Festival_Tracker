import { UserActivity, FestivalZone } from '../types';
import festivalLocationService from './festivalLocationService';
import pedometerService from './pedometerService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';

const ACTIVITY_STORAGE_KEY = '@festival_activities';
const ZONE_TIME_TRACKING_KEY = '@festival_zone_times';

interface ZoneTimeTracking {
  [zoneId: string]: {
    totalTime: number; // en secondes
    lastEntered: Date | null;
    visits: number;
  };
}

class ActivityService {
  private isTracking: boolean = false;
  private currentActivity: UserActivity | null = null;
  private zoneTimeTracking: ZoneTimeTracking = {};
  private lastZoneId: string | null = null;
  private activityCallbacks: ((activity: UserActivity) => void)[] = [];
  private saveInterval: NodeJS.Timeout | null = null;

  async startTracking(zones: FestivalZone[]): Promise<void> {
    try {
      if (this.isTracking) {
        console.log('Activity tracking already started');
        return;
      }

      // Charger les données sauvegardées
      await this.loadSavedData();

      // Démarrer le tracking de localisation
      await festivalLocationService.startTracking(zones);

      // Démarrer le podomètre
      await pedometerService.startTracking();

      // S'abonner aux changements de zone
      festivalLocationService.onZoneChange((zone) => {
        this.handleZoneChange(zone);
      });

      // S'abonner aux mises à jour de pas
      pedometerService.onStepsUpdate((steps) => {
        this.updateActivity(steps);
      });

      // S'abonner aux mises à jour de position
      festivalLocationService.onLocationUpdate((location) => {
        this.updatePosition(location);
      });

      // Sauvegarder périodiquement
      this.saveInterval = setInterval(() => {
        this.saveActivity();
      }, 30000); // Toutes les 30 secondes

      this.isTracking = true;
      console.log('Activity tracking started');
    } catch (error) {
      console.error('Error starting activity tracking:', error);
      throw error;
    }
  }

  async stopTracking(): Promise<void> {
    try {
      if (!this.isTracking) {
        return;
      }

      // Arrêter les services
      await festivalLocationService.stopTracking();
      await pedometerService.stopTracking();

      // Arrêter la sauvegarde périodique
      if (this.saveInterval) {
        clearInterval(this.saveInterval);
        this.saveInterval = null;
      }

      // Sauvegarder une dernière fois
      await this.saveActivity();
      await this.saveZoneTimeTracking();

      this.isTracking = false;
      console.log('Activity tracking stopped');
    } catch (error) {
      console.error('Error stopping activity tracking:', error);
    }
  }

  private handleZoneChange(zone: FestivalZone | null): void {
    const now = new Date();

    // Mettre à jour le temps passé dans la zone précédente
    if (this.lastZoneId && this.zoneTimeTracking[this.lastZoneId]) {
      const tracking = this.zoneTimeTracking[this.lastZoneId];
      if (tracking.lastEntered) {
        const timeSpent = (now.getTime() - tracking.lastEntered.getTime()) / 1000;
        tracking.totalTime += timeSpent;
        tracking.lastEntered = null;
      }
    }

    // Entrer dans la nouvelle zone
    if (zone) {
      if (!this.zoneTimeTracking[zone.id]) {
        this.zoneTimeTracking[zone.id] = {
          totalTime: 0,
          lastEntered: now,
          visits: 1
        };
      } else {
        this.zoneTimeTracking[zone.id].lastEntered = now;
        this.zoneTimeTracking[zone.id].visits += 1;
      }

      // Indiquer au podomètre si on est dans une zone de type scène
      pedometerService.setDancingMode(zone.type === 'stage');
    } else {
      pedometerService.setDancingMode(false);
    }

    this.lastZoneId = zone?.id || null;
  }

  private updateActivity(steps: any): void {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const currentZone = festivalLocationService.getCurrentZone();

    this.currentActivity = {
      userId,
      timestamp: new Date(),
      currentZone: currentZone?.id,
      currentZoneName: currentZone?.name,
      steps: {
        walking: steps.walking,
        dancing: steps.dancing,
        total: steps.total
      },
      distance: pedometerService.calculateDistance(steps.walking) // Seuls les pas de marche comptent pour la distance
    };

    // Notifier les callbacks
    this.activityCallbacks.forEach(callback => callback(this.currentActivity!));
  }

  private updatePosition(location: any): void {
    if (this.currentActivity) {
      this.currentActivity.position = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
    }
  }

  private async loadSavedData(): Promise<void> {
    try {
      // Charger les activités
      const savedActivities = await AsyncStorage.getItem(ACTIVITY_STORAGE_KEY);
      if (savedActivities) {
        const activities = JSON.parse(savedActivities);
        // Traiter les activités si nécessaire
      }

      // Charger le tracking des zones
      const savedZoneTimes = await AsyncStorage.getItem(ZONE_TIME_TRACKING_KEY);
      if (savedZoneTimes) {
        const parsed = JSON.parse(savedZoneTimes);
        // Convertir les dates
        Object.keys(parsed).forEach(zoneId => {
          if (parsed[zoneId].lastEntered) {
            parsed[zoneId].lastEntered = new Date(parsed[zoneId].lastEntered);
          }
        });
        this.zoneTimeTracking = parsed;
      }
    } catch (error) {
      console.error('Error loading saved activity data:', error);
    }
  }

  private async saveActivity(): Promise<void> {
    try {
      if (!this.currentActivity) return;

      // Récupérer les activités existantes
      const existingData = await AsyncStorage.getItem(ACTIVITY_STORAGE_KEY);
      const activities = existingData ? JSON.parse(existingData) : [];

      // Ajouter l'activité actuelle
      activities.push(this.currentActivity);

      // Limiter à 1000 dernières activités pour économiser l'espace
      if (activities.length > 1000) {
        activities.splice(0, activities.length - 1000);
      }

      await AsyncStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activities));
    } catch (error) {
      console.error('Error saving activity:', error);
    }
  }

  private async saveZoneTimeTracking(): Promise<void> {
    try {
      await AsyncStorage.setItem(ZONE_TIME_TRACKING_KEY, JSON.stringify(this.zoneTimeTracking));
    } catch (error) {
      console.error('Error saving zone time tracking:', error);
    }
  }

  getCurrentActivity(): UserActivity | null {
    return this.currentActivity;
  }

  getZoneTimeTracking(): ZoneTimeTracking {
    // Mettre à jour le temps de la zone actuelle
    if (this.lastZoneId && this.zoneTimeTracking[this.lastZoneId]?.lastEntered) {
      const now = new Date();
      const tracking = this.zoneTimeTracking[this.lastZoneId];
      const currentSessionTime = (now.getTime() - tracking.lastEntered.getTime()) / 1000;
      
      return {
        ...this.zoneTimeTracking,
        [this.lastZoneId]: {
          ...tracking,
          totalTime: tracking.totalTime + currentSessionTime
        }
      };
    }

    return { ...this.zoneTimeTracking };
  }

  onActivityUpdate(callback: (activity: UserActivity) => void): () => void {
    this.activityCallbacks.push(callback);
    return () => {
      const index = this.activityCallbacks.indexOf(callback);
      if (index > -1) {
        this.activityCallbacks.splice(index, 1);
      }
    };
  }

  async getActivitiesForToday(): Promise<UserActivity[]> {
    try {
      const savedData = await AsyncStorage.getItem(ACTIVITY_STORAGE_KEY);
      if (!savedData) return [];

      const activities: UserActivity[] = JSON.parse(savedData);
      const today = new Date().toDateString();

      return activities.filter(activity => {
        const activityDate = new Date(activity.timestamp).toDateString();
        return activityDate === today;
      });
    } catch (error) {
      console.error('Error getting today activities:', error);
      return [];
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ACTIVITY_STORAGE_KEY);
      await AsyncStorage.removeItem(ZONE_TIME_TRACKING_KEY);
      await pedometerService.resetSteps();
      this.zoneTimeTracking = {};
      this.currentActivity = null;
    } catch (error) {
      console.error('Error clearing activity data:', error);
    }
  }

  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }
}

export default new ActivityService();