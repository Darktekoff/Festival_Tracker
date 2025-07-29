import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';
import { LocationData, LocationPermissionStatus, LocationOptions, LocationErrorInfo, LocationError } from '../types/location';

class LocationService {
  private permissionStatus: LocationPermissionStatus = 'undetermined';

  /**
   * Demande les permissions de géolocalisation
   */
  async requestPermissions(): Promise<LocationPermissionStatus> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      switch (status) {
        case Location.PermissionStatus.GRANTED:
          this.permissionStatus = 'granted';
          break;
        case Location.PermissionStatus.DENIED:
          this.permissionStatus = 'denied';
          break;
        default:
          this.permissionStatus = 'undetermined';
      }
      
      return this.permissionStatus;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      this.permissionStatus = 'denied';
      return this.permissionStatus;
    }
  }

  /**
   * Vérifie le statut actuel des permissions
   */
  async checkPermissions(): Promise<LocationPermissionStatus> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      
      switch (status) {
        case Location.PermissionStatus.GRANTED:
          this.permissionStatus = 'granted';
          break;
        case Location.PermissionStatus.DENIED:
          this.permissionStatus = 'denied';
          break;
        default:
          this.permissionStatus = 'undetermined';
      }
      
      return this.permissionStatus;
    } catch (error) {
      console.error('Error checking location permissions:', error);
      this.permissionStatus = 'denied';
      return this.permissionStatus;
    }
  }

  /**
   * Obtient la position actuelle de l'utilisateur
   */
  async getCurrentPosition(options: LocationOptions = {}): Promise<LocationData> {
    const {
      accuracy = 'balanced',
      timeout = 15000,
      maximumAge = 30000,
      enableHighAccuracy = true
    } = options;

    // Vérifier les permissions d'abord
    const permissionStatus = await this.checkPermissions();
    if (permissionStatus !== 'granted') {
      throw this.createLocationError('permission_denied', 'Les permissions de géolocalisation sont requises');
    }

    try {
      // Mapper notre enum vers les constantes d'Expo
      let locationAccuracy;
      switch (accuracy) {
        case 'low':
          locationAccuracy = Location.Accuracy.Low;
          break;
        case 'balanced':
          locationAccuracy = Location.Accuracy.Balanced;
          break;
        case 'high':
          locationAccuracy = Location.Accuracy.High;
          break;
        case 'highest':
          locationAccuracy = Location.Accuracy.Highest;
          break;
        default:
          locationAccuracy = Location.Accuracy.Balanced;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: locationAccuracy,
        timeInterval: maximumAge,
      });

      return {
        coordinates: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy || undefined,
          altitude: position.coords.altitude || undefined,
          altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
        },
        timestamp: new Date(position.timestamp)
      };
    } catch (error: any) {
      console.error('Error getting current position:', error);
      
      if (error.code === 'E_LOCATION_TIMEOUT') {
        throw this.createLocationError('timeout', 'Timeout lors de la récupération de la position');
      } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
        throw this.createLocationError('location_unavailable', 'Service de localisation indisponible');
      } else {
        throw this.createLocationError('unknown_error', 'Erreur inconnue lors de la géolocalisation');
      }
    }
  }

  /**
   * Obtient l'adresse à partir des coordonnées (géocodage inverse)
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (addresses.length > 0) {
        const address = addresses[0];
        const parts = [];
        
        if (address.streetNumber) parts.push(address.streetNumber);
        if (address.street) parts.push(address.street);
        if (address.city) parts.push(address.city);
        if (address.postalCode) parts.push(address.postalCode);
        
        return parts.join(', ') || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  /**
   * Ouvre l'application de cartes avec les coordonnées données
   */
  async openInMaps(latitude: number, longitude: number, label?: string): Promise<void> {
    try {
      const scheme = Platform.select({ 
        ios: 'maps:', 
        android: 'geo:' 
      });
      
      let url: string;
      
      if (Platform.OS === 'ios') {
        url = `${scheme}${latitude},${longitude}${label ? `?q=${encodeURIComponent(label)}` : ''}`;
      } else {
        url = `${scheme}${latitude},${longitude}${label ? `?q=${encodeURIComponent(label)}` : ''}`;
      }
      
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback vers Google Maps web
        const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}${label ? `&query_id=${encodeURIComponent(label)}` : ''}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('Error opening maps:', error);
      throw this.createLocationError('unknown_error', 'Impossible d\'ouvrir l\'application de cartes');
    }
  }

  /**
   * Ouvre les paramètres de l'application pour les permissions
   */
  async openAppSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Error opening app settings:', error);
    }
  }

  /**
   * Calcule la distance entre deux points (en mètres)
   */
  calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Formate une distance en texte lisible
   */
  formatDistance(distanceInMeters: number): string {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)} m`;
    } else {
      return `${(distanceInMeters / 1000).toFixed(1)} km`;
    }
  }

  /**
   * Crée une erreur de géolocalisation standardisée
   */
  private createLocationError(type: LocationError, message: string, details?: string): LocationErrorInfo {
    return {
      type,
      message,
      details
    };
  }

  /**
   * Obtient le statut actuel des permissions
   */
  getPermissionStatus(): LocationPermissionStatus {
    return this.permissionStatus;
  }

  /**
   * Vérifie si la géolocalisation est disponible sur l'appareil
   */
  async isLocationServicesEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }
}

export default new LocationService();