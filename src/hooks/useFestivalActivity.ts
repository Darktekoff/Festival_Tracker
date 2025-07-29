import { useState, useEffect } from 'react';
import { UserActivity, FestivalZone, FestivalStats } from '../types';
import activityService from '../services/activityService';
import festivalMapService from '../services/festivalMapService';
import { useAuthContext } from '../context/AuthContext';
import { useGroupContext } from '../context/GroupContext';

interface UseFestivalActivityReturn {
  currentActivity: UserActivity | null;
  isTracking: boolean;
  zones: FestivalZone[];
  zoneTimeTracking: Record<string, { totalTime: number; lastEntered: Date | null; visits: number }>;
  todayActivities: UserActivity[];
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  clearAllData: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useFestivalActivity(): UseFestivalActivityReturn {
  const { user } = useAuthContext();
  const { group } = useGroupContext();
  
  const [currentActivity, setCurrentActivity] = useState<UserActivity | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [zones, setZones] = useState<FestivalZone[]>([]);
  const [zoneTimeTracking, setZoneTimeTracking] = useState<Record<string, { totalTime: number; lastEntered: Date | null; visits: number }>>({});
  const [todayActivities, setTodayActivities] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeActivity();
    return () => {
      if (isTracking) {
        activityService.stopTracking();
      }
    };
  }, [group?.id]);

  const initializeActivity = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!group?.id) {
        setIsLoading(false);
        return;
      }

      // Configurer le service de mapping
      festivalMapService.setGroupId(group.id);
      
      // Charger les zones
      const loadedZones = await festivalMapService.getZones();
      setZones(loadedZones);

      // Écouter les changements de zones
      const unsubscribeZones = festivalMapService.onZonesUpdate((updatedZones) => {
        setZones(updatedZones);
      });

      // Vérifier si le tracking est actif
      const trackingActive = activityService.isCurrentlyTracking();
      setIsTracking(trackingActive);

      if (trackingActive) {
        // S'abonner aux mises à jour d'activité
        const unsubscribeActivity = activityService.onActivityUpdate((activity) => {
          setCurrentActivity(activity);
        });

        // Obtenir l'activité actuelle
        const current = activityService.getCurrentActivity();
        setCurrentActivity(current);

        // Obtenir le tracking des zones
        updateZoneTracking();

        return () => {
          unsubscribeZones();
          unsubscribeActivity();
        };
      } else {
        // Charger les activités du jour même si le tracking n'est pas actif
        const activities = await activityService.getActivitiesForToday();
        setTodayActivities(activities);
      }

      return unsubscribeZones;
    } catch (err) {
      console.error('Error initializing festival activity:', err);
      setError('Erreur lors de l\'initialisation du suivi d\'activité');
    } finally {
      setIsLoading(false);
    }
  };

  const updateZoneTracking = () => {
    const tracking = activityService.getZoneTimeTracking();
    setZoneTimeTracking(tracking);
  };

  const startTracking = async () => {
    try {
      setError(null);
      
      if (zones.length === 0) {
        throw new Error('Aucune zone mappée. Mappez d\'abord quelques zones dans les paramètres.');
      }

      await activityService.startTracking(zones);

      // S'abonner aux mises à jour
      const unsubscribe = activityService.onActivityUpdate((activity) => {
        setCurrentActivity(activity);
        updateZoneTracking();
      });

      setIsTracking(true);
      
      // Obtenir l'activité initiale
      const current = activityService.getCurrentActivity();
      setCurrentActivity(current);
      updateZoneTracking();

      return unsubscribe;
    } catch (err) {
      console.error('Error starting activity tracking:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du démarrage du suivi');
      throw err;
    }
  };

  const stopTracking = async () => {
    try {
      setError(null);
      await activityService.stopTracking();
      setIsTracking(false);
      setCurrentActivity(null);
      
      // Charger les activités de la journée
      const activities = await activityService.getActivitiesForToday();
      setTodayActivities(activities);
    } catch (err) {
      console.error('Error stopping activity tracking:', err);
      setError('Erreur lors de l\'arrêt du suivi');
      throw err;
    }
  };

  const clearAllData = async () => {
    try {
      setError(null);
      await activityService.clearAllData();
      setCurrentActivity(null);
      setZoneTimeTracking({});
      setTodayActivities([]);
    } catch (err) {
      console.error('Error clearing activity data:', err);
      setError('Erreur lors de la suppression des données');
      throw err;
    }
  };

  return {
    currentActivity,
    isTracking,
    zones,
    zoneTimeTracking,
    todayActivities,
    startTracking,
    stopTracking,
    clearAllData,
    isLoading,
    error
  };
}