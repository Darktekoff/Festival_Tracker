import { useState, useEffect, useMemo } from 'react';
import { DrinkRecord } from '../types';
import { getSessionDrinks, getSessionDrinksWithActivity, detectSleepPeriod } from '../utils/calculations';
import activityService from '../services/activityService';
import pedometerService from '../services/pedometerService';

interface ActivityData {
  timestamp: Date;
  steps: {
    walking: number;
    dancing: number;
    total: number;
  };
}

interface UseActivityBasedSessionsReturn {
  sessionDrinks: DrinkRecord[];
  sessionDrinksWithActivity: DrinkRecord[];
  isActivityTrackingAvailable: boolean;
  currentSleepStatus: {
    isSleeping: boolean;
    inactivityDuration: number;
  };
  activityData: ActivityData[];
  useEnhancedDetection: boolean;
  toggleEnhancedDetection: () => void;
}

/**
 * Hook pour gérer les sessions basées sur l'activité physique
 * Combine la détection temporelle avec les données du podomètre
 */
export function useActivityBasedSessions(
  drinks: DrinkRecord[],
  userId: string | null
): UseActivityBasedSessionsReturn {
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [isActivityTrackingAvailable, setIsActivityTrackingAvailable] = useState(false);
  const [useEnhancedDetection, setUseEnhancedDetection] = useState(false);

  // Vérifier la disponibilité du tracking d'activité
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const isAvailable = await pedometerService.checkAvailability();
        setIsActivityTrackingAvailable(isAvailable);
        
        if (isAvailable && activityService.isCurrentlyTracking()) {
          // Charger les données d'activité existantes
          loadActivityData();
        }
      } catch (error) {
        console.error('Error checking activity availability:', error);
        setIsActivityTrackingAvailable(false);
      }
    };

    checkAvailability();
  }, []);

  // Charger les données d'activité récentes
  const loadActivityData = async () => {
    try {
      const activities = await activityService.getActivitiesForToday();
      
      // Convertir en format ActivityData
      const formattedData: ActivityData[] = activities.map(activity => ({
        timestamp: new Date(activity.timestamp),
        steps: activity.steps
      }));
      
      setActivityData(formattedData);
    } catch (error) {
      console.error('Error loading activity data:', error);
    }
  };

  // S'abonner aux mises à jour d'activité en temps réel
  useEffect(() => {
    if (!isActivityTrackingAvailable) return;

    const unsubscribeActivity = activityService.onActivityUpdate((activity) => {
      const newActivityData: ActivityData = {
        timestamp: new Date(activity.timestamp),
        steps: activity.steps
      };
      
      setActivityData(prevData => {
        // Ajouter la nouvelle donnée et garder seulement les 48 dernières heures
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const filteredData = prevData.filter(data => data.timestamp >= cutoff);
        return [...filteredData, newActivityData];
      });
    });

    const unsubscribeSteps = pedometerService.onStepsUpdate((steps) => {
      // Mise à jour directe des pas sans passer par activityService
      const newActivityData: ActivityData = {
        timestamp: new Date(),
        steps
      };
      
      setActivityData(prevData => {
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const filteredData = prevData.filter(data => data.timestamp >= cutoff);
        return [...filteredData, newActivityData];
      });
    });

    return () => {
      unsubscribeActivity();
      unsubscribeSteps();
    };
  }, [isActivityTrackingAvailable]);

  // Calculer les sessions avec la méthode de base
  const sessionDrinks = useMemo(() => {
    // Filtrer les triches ET les templates pour les sessions de base
    const normalDrinks = drinks.filter(d => d.drinkType !== 'Triche' && !d.isTemplate);
    return getSessionDrinks(normalDrinks, userId || undefined);
  }, [drinks, userId]);

  // Calculer les sessions avec détection d'activité améliorée (sans les triches ni templates)
  const sessionDrinksWithActivity = useMemo(() => {
    if (!isActivityTrackingAvailable || activityData.length === 0) {
      // Fallback : utiliser la méthode de base directement
      const normalDrinks = drinks.filter(d => d.drinkType !== 'Triche' && !d.isTemplate);
      return getSessionDrinks(normalDrinks, userId || undefined);
    }
    
    // Filtrer les triches ET les templates avant de passer à getSessionDrinksWithActivity
    const normalDrinks = drinks.filter(d => d.drinkType !== 'Triche' && !d.isTemplate);
    return getSessionDrinksWithActivity(normalDrinks, activityData, userId || undefined);
  }, [drinks, activityData, userId, isActivityTrackingAvailable]);


  // Analyser le statut de sommeil actuel
  const currentSleepStatus = useMemo(() => {
    if (activityData.length === 0) {
      return { isSleeping: false, inactivityDuration: 0 };
    }
    
    return detectSleepPeriod(activityData, 2); // 2h minimum pour détecter le sommeil
  }, [activityData]);

  const toggleEnhancedDetection = () => {
    setUseEnhancedDetection(prev => !prev);
  };

  return {
    sessionDrinks,
    sessionDrinksWithActivity,
    isActivityTrackingAvailable,
    currentSleepStatus,
    activityData,
    useEnhancedDetection,
    toggleEnhancedDetection
  };
}