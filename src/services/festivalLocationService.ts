import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { FestivalZone, UserActivity } from '../types';
import { Platform } from 'react-native';
import zoneActivityService from './zoneActivityService';

const LOCATION_TASK_NAME = 'festival-location-tracking';
const LOCATION_UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutes (aligné avec le partage de position)
const GEOFENCE_TASK_NAME = 'festival-geofence';

// Constantes pour les modes de tracking
const STATIONARY_THRESHOLD = 10; // 10 mètres pour considérer comme stationnaire
const STATIONARY_TIMEOUT = 2 * 60 * 1000; // 2 minutes avant passage en mode économie
const ZONE_PROXIMITY_THRESHOLD = 100; // 100 mètres autour des zones = mode actif

// Modes de tracking
const TRACKING_MODES = {
  ACTIVE: {
    foreground: { timeInterval: 15000, distanceInterval: 10 }, // 15s ou 10m
    background: { timeInterval: 60000, distanceInterval: 20 } // 1min ou 20m
  },
  ECONOMY: {
    foreground: { timeInterval: 2 * 60 * 1000, distanceInterval: 10 }, // 2min ou 10m
    background: { timeInterval: 5 * 60 * 1000, distanceInterval: 20 } // 5min ou 20m
  }
};

class FestivalLocationService {
  private zones: FestivalZone[] = [];
  private locationSubscription: Location.LocationSubscription | null = null;
  private currentZone: FestivalZone | null = null;
  private locationCallbacks: ((location: Location.LocationObject) => void)[] = [];
  private zoneChangeCallbacks: ((zone: FestivalZone | null) => void)[] = [];
  
  // Variables pour le tracking adaptatif
  private lastLocation: Location.LocationObjectCoords | null = null;
  private isUserStationary: boolean = false;
  private stationaryTimeout: NodeJS.Timeout | null = null;
  private currentTrackingMode: 'ACTIVE' | 'ECONOMY' = 'ACTIVE';
  private isNearZone: boolean = false;
  private userInfo: { name: string; avatar: string } | null = null;

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        return false;
      }

      // Pour Android, demander aussi la permission en arrière-plan
      if (Platform.OS === 'android') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        return backgroundStatus === 'granted';
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  async startTracking(zones: FestivalZone[], enableBackgroundTracking: boolean = false, userInfo?: { name: string; avatar: string }): Promise<void> {
    try {
      this.zones = zones;
      this.userInfo = userInfo || null;

      // Vérifier les permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permissions not granted');
      }

      // Commencer en mode ACTIF par défaut
      await this.startForegroundTracking();

      // Démarrer le tracking en arrière-plan seulement si demandé
      if (enableBackgroundTracking) {
        await this.startBackgroundTracking();
        console.log('Adaptive location tracking enabled (foreground + background)');
      } else {
        console.log('Adaptive location tracking enabled (foreground only)');
      }
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  private async startForegroundTracking(): Promise<void> {
    // Arrêter le tracking existant s'il y en a un
    if (this.locationSubscription) {
      this.locationSubscription.remove();
    }

    const mode = TRACKING_MODES[this.currentTrackingMode];
    
    this.locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: mode.foreground.timeInterval,
        distanceInterval: mode.foreground.distanceInterval,
      },
      (location) => {
        this.handleLocationUpdate(location);
      }
    );

    console.log(`Foreground tracking started in ${this.currentTrackingMode} mode`);
  }

  private async switchTrackingMode(newMode: 'ACTIVE' | 'ECONOMY'): Promise<void> {
    if (this.currentTrackingMode === newMode) return;

    this.currentTrackingMode = newMode;
    console.log(`Switching to ${newMode} tracking mode`);

    // Redémarrer le foreground tracking avec les nouveaux paramètres
    await this.startForegroundTracking();
  }

  async stopTracking(): Promise<void> {
    try {
      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      if (this.stationaryTimeout) {
        clearTimeout(this.stationaryTimeout);
        this.stationaryTimeout = null;
      }

      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      await TaskManager.unregisterAllTasksAsync();
      
      // Reset des variables
      this.lastLocation = null;
      this.isUserStationary = false;
      this.currentTrackingMode = 'ACTIVE';
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  }

  private async startBackgroundTracking(): Promise<void> {
    try {
      const mode = TRACKING_MODES[this.currentTrackingMode];
      
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Lowest, // Précision minimale en arrière-plan
        timeInterval: mode.background.timeInterval,
        distanceInterval: mode.background.distanceInterval,
        deferredUpdatesInterval: mode.background.timeInterval, // Différer les mises à jour
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Festival Tracker',
          notificationBody: `Suivi position (${this.currentTrackingMode.toLowerCase()})`,
          notificationColor: '#FF6B6B',
        },
      });
    } catch (error) {
      console.error('Error starting background tracking:', error);
    }
  }

  private handleLocationUpdate(location: Location.LocationObject): void {
    // Analyser le mouvement pour adapter le mode de tracking
    this.analyzeMovementAndAdaptMode(location.coords);

    // Notifier les callbacks
    this.locationCallbacks.forEach(callback => callback(location));

    // Vérifier dans quelle zone on se trouve
    const newZone = this.findCurrentZone(location.coords);
    
    if (newZone?.id !== this.currentZone?.id) {
      const previousZone = this.currentZone;
      this.currentZone = newZone;
      
      // Notifier les callbacks de changement de zone
      this.zoneChangeCallbacks.forEach(callback => callback(newZone));
      
      // Notifier le service d'activité de zone si on a les infos utilisateur
      if (this.userInfo) {
        zoneActivityService.onZoneChange(newZone, this.userInfo.name, this.userInfo.avatar);
      }
    }
  }

  private analyzeMovementAndAdaptMode(currentCoords: Location.LocationObjectCoords): void {
    if (!this.lastLocation) {
      this.lastLocation = currentCoords;
      return;
    }

    // Calculer la distance parcourue depuis la dernière position
    const distanceMoved = this.calculateDistance(
      this.lastLocation.latitude,
      this.lastLocation.longitude,
      currentCoords.latitude,
      currentCoords.longitude
    );

    // Vérifier si l'utilisateur est près d'une zone (forcer mode actif)
    this.isNearZone = this.isNearAnyZone(currentCoords);

    if (distanceMoved > STATIONARY_THRESHOLD || this.isNearZone) {
      // L'utilisateur bouge ou est près d'une zone → Mode ACTIF
      this.handleUserMovement();
    } else {
      // L'utilisateur semble stationnaire → Démarrer le timer
      this.handleUserStationary();
    }

    this.lastLocation = currentCoords;
  }

  private handleUserMovement(): void {
    // Annuler le timer de stationnaire s'il existe
    if (this.stationaryTimeout) {
      clearTimeout(this.stationaryTimeout);
      this.stationaryTimeout = null;
    }

    this.isUserStationary = false;

    // Passer en mode ACTIF si pas déjà fait
    if (this.currentTrackingMode !== 'ACTIVE') {
      this.switchTrackingMode('ACTIVE');
    }
  }

  private handleUserStationary(): void {
    if (this.isUserStationary || this.stationaryTimeout) {
      return; // Déjà en cours de traitement
    }

    // Démarrer le timer pour passer en mode économie
    this.stationaryTimeout = setTimeout(() => {
      this.isUserStationary = true;
      
      // Ne passer en mode économie que si pas près d'une zone
      if (!this.isNearZone) {
        this.switchTrackingMode('ECONOMY');
      }
    }, STATIONARY_TIMEOUT);
  }

  private isNearAnyZone(coords: Location.LocationObjectCoords): boolean {
    return this.zones.some(zone => {
      const distance = this.calculateDistance(
        coords.latitude,
        coords.longitude,
        zone.position.latitude,
        zone.position.longitude
      );
      return distance <= ZONE_PROXIMITY_THRESHOLD;
    });
  }

  private findCurrentZone(coords: Location.LocationObjectCoords): FestivalZone | null {
    for (const zone of this.zones) {
      const distance = this.calculateDistance(
        coords.latitude,
        coords.longitude,
        zone.position.latitude,
        zone.position.longitude
      );

      if (distance <= zone.radius) {
        return zone;
      }
    }
    return null;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance en mètres
  }

  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  onLocationUpdate(callback: (location: Location.LocationObject) => void): () => void {
    this.locationCallbacks.push(callback);
    return () => {
      const index = this.locationCallbacks.indexOf(callback);
      if (index > -1) {
        this.locationCallbacks.splice(index, 1);
      }
    };
  }

  onZoneChange(callback: (zone: FestivalZone | null) => void): () => void {
    this.zoneChangeCallbacks.push(callback);
    return () => {
      const index = this.zoneChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.zoneChangeCallbacks.splice(index, 1);
      }
    };
  }

  getCurrentZone(): FestivalZone | null {
    return this.currentZone;
  }

  updateZones(zones: FestivalZone[]): void {
    this.zones = zones;
  }

  async initializeZoneActivityTracking(groupId: string): Promise<void> {
    await zoneActivityService.initialize(groupId);
  }

  // Méthode pour forcer une mise à jour immédiate (ex: ouverture de la carte)
  async forceLocationUpdate(): Promise<Location.LocationObject | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 10000, // Accepter une position vieille de 10s max
        timeout: 5000, // Timeout de 5s
      });

      // Traiter cette position comme une mise à jour normale
      this.handleLocationUpdate(location);
      
      console.log('Forced location update completed');
      return location;
    } catch (error) {
      console.error('Error forcing location update:', error);
      return null;
    }
  }

  // Méthode pour activer temporairement le mode ACTIF (ex: première minute après ouverture)
  activateTemporaryActiveMode(durationMs: number = 60000): void {
    console.log(`Activating temporary ACTIVE mode for ${durationMs/1000}s`);
    
    // Forcer le mode ACTIF
    this.switchTrackingMode('ACTIVE');
    
    // Programmer le retour au mode automatique
    setTimeout(() => {
      console.log('Temporary ACTIVE mode expired, returning to adaptive mode');
      // Re-analyser la position actuelle pour déterminer le bon mode
      if (this.lastLocation) {
        this.analyzeMovementAndAdaptMode(this.lastLocation);
      }
    }, durationMs);
  }

  isInZone(zoneId: string): boolean {
    return this.currentZone?.id === zoneId;
  }

  getDistanceToZone(zoneId: string, currentCoords: Location.LocationObjectCoords): number | null {
    const zone = this.zones.find(z => z.id === zoneId);
    if (!zone) return null;

    return this.calculateDistance(
      currentCoords.latitude,
      currentCoords.longitude,
      zone.position.latitude,
      zone.position.longitude
    );
  }
}

// Définir la tâche en arrière-plan
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      const location = locations[0];
      // Ici on pourrait sauvegarder la position dans Firebase ou AsyncStorage
      console.log('Background location update:', location);
    }
  }
});

export default new FestivalLocationService();