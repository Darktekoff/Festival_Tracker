import { useState, useEffect, useCallback } from 'react';
import locationService from '../services/locationService';
import { 
  LocationData, 
  LocationPermissionStatus, 
  LocationOptions, 
  LocationErrorInfo,
  LocationServiceState 
} from '../types/location';

export function useLocation() {
  const [state, setState] = useState<LocationServiceState>({
    permissionStatus: 'undetermined',
    isLoading: false,
    error: undefined,
    lastKnownLocation: undefined
  });

  // Vérifier les permissions au montage
  useEffect(() => {
    checkPermissions();
  }, []);

  /**
   * Vérifie les permissions de géolocalisation
   */
  const checkPermissions = useCallback(async () => {
    try {
      const status = await locationService.checkPermissions();
      setState(prev => ({
        ...prev,
        permissionStatus: status,
        error: undefined
      }));
      return status;
    } catch (error) {
      console.error('Error checking permissions:', error);
      setState(prev => ({
        ...prev,
        permissionStatus: 'denied',
        error: {
          type: 'unknown_error',
          message: 'Erreur lors de la vérification des permissions'
        }
      }));
      return 'denied';
    }
  }, []);

  /**
   * Demande les permissions de géolocalisation
   */
  const requestPermissions = useCallback(async (): Promise<LocationPermissionStatus> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));
      
      const status = await locationService.requestPermissions();
      
      setState(prev => ({
        ...prev,
        permissionStatus: status,
        isLoading: false,
        error: undefined
      }));
      
      return status;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      
      const errorInfo: LocationErrorInfo = {
        type: 'permission_denied',
        message: 'Impossible d\'obtenir les permissions de géolocalisation'
      };
      
      setState(prev => ({
        ...prev,
        permissionStatus: 'denied',
        isLoading: false,
        error: errorInfo
      }));
      
      return 'denied';
    }
  }, []);

  /**
   * Obtient la position actuelle
   */
  const getCurrentPosition = useCallback(async (options?: LocationOptions): Promise<LocationData | null> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));

      // Vérifier les permissions d'abord
      if (state.permissionStatus !== 'granted') {
        const newStatus = await requestPermissions();
        if (newStatus !== 'granted') {
          throw {
            type: 'permission_denied',
            message: 'Les permissions de géolocalisation sont requises'
          };
        }
      }

      const location = await locationService.getCurrentPosition(options);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        lastKnownLocation: location,
        error: undefined
      }));

      return location;
    } catch (error: any) {
      console.error('Error getting current position:', error);
      
      const errorInfo: LocationErrorInfo = error.type ? error : {
        type: 'unknown_error',
        message: 'Erreur lors de la récupération de la position',
        details: error.message
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorInfo
      }));

      return null;
    }
  }, [state.permissionStatus, requestPermissions]);

  /**
   * Obtient l'adresse à partir des coordonnées
   */
  const reverseGeocode = useCallback(async (latitude: number, longitude: number): Promise<string | null> => {
    try {
      return await locationService.reverseGeocode(latitude, longitude);
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }, []);

  /**
   * Ouvre l'application de cartes
   */
  const openInMaps = useCallback(async (latitude: number, longitude: number, label?: string): Promise<void> => {
    try {
      await locationService.openInMaps(latitude, longitude, label);
    } catch (error: any) {
      console.error('Error opening maps:', error);
      
      setState(prev => ({
        ...prev,
        error: {
          type: 'unknown_error',
          message: 'Impossible d\'ouvrir l\'application de cartes'
        }
      }));
    }
  }, []);

  /**
   * Ouvre les paramètres de l'application
   */
  const openAppSettings = useCallback(async (): Promise<void> => {
    try {
      await locationService.openAppSettings();
    } catch (error) {
      console.error('Error opening app settings:', error);
    }
  }, []);

  /**
   * Calcule la distance entre deux points
   */
  const calculateDistance = useCallback((
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number => {
    return locationService.calculateDistance(lat1, lon1, lat2, lon2);
  }, []);

  /**
   * Formate une distance
   */
  const formatDistance = useCallback((distanceInMeters: number): string => {
    return locationService.formatDistance(distanceInMeters);
  }, []);

  /**
   * Vérifie si les services de localisation sont activés
   */
  const checkLocationServices = useCallback(async (): Promise<boolean> => {
    try {
      const enabled = await locationService.isLocationServicesEnabled();
      
      if (!enabled) {
        setState(prev => ({
          ...prev,
          error: {
            type: 'location_unavailable',
            message: 'Les services de localisation sont désactivés'
          }
        }));
      }
      
      return enabled;
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }, []);

  /**
   * Réinitialise l'état d'erreur
   */
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: undefined
    }));
  }, []);

  /**
   * Réinitialise complètement l'état
   */
  const reset = useCallback(() => {
    setState({
      permissionStatus: 'undetermined',
      isLoading: false,
      error: undefined,
      lastKnownLocation: undefined
    });
  }, []);

  return {
    // État
    permissionStatus: state.permissionStatus,
    isLoading: state.isLoading,
    error: state.error,
    lastKnownLocation: state.lastKnownLocation,
    
    // Actions
    checkPermissions,
    requestPermissions,
    getCurrentPosition,
    reverseGeocode,
    openInMaps,
    openAppSettings,
    calculateDistance,
    formatDistance,
    checkLocationServices,
    clearError,
    reset,
    
    // États dérivés
    hasPermission: state.permissionStatus === 'granted',
    needsPermission: state.permissionStatus === 'undetermined' || state.permissionStatus === 'denied',
    hasError: !!state.error,
    hasLocation: !!state.lastKnownLocation
  };
}