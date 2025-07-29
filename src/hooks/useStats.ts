import { useMemo } from 'react';
import { DrinkRecord, DrinkStats, AlertLevel } from '../types';
import { 
  calculateDrinkStats, 
  getDailyConsumption, 
  getWeeklyTrend,
  getAlertLevel,
  calculateGroupStats,
  calculateCurrentBloodAlcohol,
  getSessionDrinks,
  calculateSessionGroupAverage
} from '../utils/calculations';
import { useActivityBasedSessions } from './useActivityBasedSessions';
import { startOfDay, endOfDay } from 'date-fns';

interface UseStatsReturn {
  userStats: DrinkStats;
  todayUnits: number;
  currentUnits: number;
  todayDrinks: number;
  sessionDrinks: number;
  sessionUnits: number;
  sessionGroupAverage: number;
  sessionStartTime: Date | null;
  weeklyTrend: number[];
  alertLevel: AlertLevel;
  groupStats: {
    totalDrinks: number;
    totalUnits: number;
    averagePerPerson: number;
    mostActiveDay: string;
  };
  // Nouvelles fonctionnalités liées à l'activité
  isActivityTrackingAvailable: boolean;
  currentSleepStatus: {
    isSleeping: boolean;
    inactivityDuration: number;
  };
  useEnhancedDetection: boolean;
  toggleEnhancedDetection: () => void;
  getHourlyDistribution: () => number[];
  getMostPopularDrinks: () => { name: string; count: number }[];
  getProgressToNextAlert: () => number;
}

export function useStats(
  drinks: DrinkRecord[],
  userId: string | null,
  groupMembers: any[] = []
): UseStatsReturn {
  // Utiliser le hook d'activité pour la détection améliorée
  const {
    sessionDrinksWithActivity,
    isActivityTrackingAvailable,
    currentSleepStatus,
    useEnhancedDetection,
    toggleEnhancedDetection
  } = useActivityBasedSessions(drinks, userId);

  // Filtrer les boissons de l'utilisateur (exclure les templates)
  const userDrinks = useMemo(() => {
    if (!userId) return [];
    return drinks.filter(d => d.userId === userId && !d.isTemplate);
  }, [drinks, userId]);

  // Calculer les stats utilisateur
  const userStats = useMemo(() => {
    return calculateDrinkStats(userDrinks);
  }, [userDrinks]);

  // Consommation du jour
  const todayDrinks = useMemo(() => {
    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);
    
    return userDrinks.filter(d => 
      d.timestamp >= start && d.timestamp <= end
    );
  }, [userDrinks]);

  const todayUnits = useMemo(() => {
    return todayDrinks.reduce((sum, d) => sum + d.alcoholUnits, 0);
  }, [todayDrinks]);

  // Unités actuelles (avec élimination de l'alcool)
  const currentUnits = useMemo(() => {
    return calculateCurrentBloodAlcohol(todayDrinks);
  }, [todayDrinks]);

  // Session-based calculations (utilise la détection améliorée si disponible)
  const sessionDrinksData = useMemo(() => {
    if (!userId) return [];
    
    // Utiliser la détection améliorée si activée et disponible
    if (useEnhancedDetection && isActivityTrackingAvailable) {
      return sessionDrinksWithActivity;
    }
    
    // Sinon utiliser la méthode de base
    return getSessionDrinks(drinks, userId);
  }, [drinks, userId, useEnhancedDetection, isActivityTrackingAvailable, sessionDrinksWithActivity]);

  const sessionDrinks = useMemo(() => {
    return sessionDrinksData.length;
  }, [sessionDrinksData]);

  const sessionUnits = useMemo(() => {
    return sessionDrinksData.reduce((sum, d) => sum + d.alcoholUnits, 0);
  }, [sessionDrinksData]);

  // Moyenne du groupe pour la session actuelle
  const sessionGroupData = useMemo(() => {
    return calculateSessionGroupAverage(drinks, groupMembers);
  }, [drinks, groupMembers]);

  const sessionGroupAverage = useMemo(() => {
    return sessionGroupData.sessionGroupAverage;
  }, [sessionGroupData]);

  const sessionStartTime = useMemo(() => {
    return sessionGroupData.sessionStartTime;
  }, [sessionGroupData]);

  // Tendance hebdomadaire
  const weeklyTrend = useMemo(() => {
    return getWeeklyTrend(userDrinks);
  }, [userDrinks]);

  // Niveau d'alerte basé sur les unités actuelles (avec élimination)
  const alertLevel = useMemo(() => {
    return getAlertLevel(currentUnits);
  }, [currentUnits]);

  // Stats du groupe (exclure les templates)
  const groupStats = useMemo(() => {
    const nonTemplateDrinks = drinks.filter(d => !d.isTemplate);
    return calculateGroupStats(nonTemplateDrinks, groupMembers);
  }, [drinks, groupMembers]);

  // Distribution horaire
  const getHourlyDistribution = (): number[] => {
    const distribution = new Array(24).fill(0);
    
    todayDrinks.forEach(drink => {
      const hour = new Date(drink.timestamp).getHours();
      distribution[hour]++;
    });
    
    return distribution;
  };

  // Boissons les plus populaires
  const getMostPopularDrinks = (): { name: string; count: number }[] => {
    const drinkCounts = new Map<string, number>();
    
    userDrinks.forEach(drink => {
      const key = drink.customName || drink.drinkType;
      drinkCounts.set(key, (drinkCounts.get(key) || 0) + 1);
    });
    
    return Array.from(drinkCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  // Progression vers la prochaine alerte
  const getProgressToNextAlert = (): number => {
    if (alertLevel === 'safe') {
      return (currentUnits / 3) * 100; // Vers modéré
    } else if (alertLevel === 'moderate') {
      return ((currentUnits - 3) / 3) * 100; // Vers élevé
    } else if (alertLevel === 'high') {
      return ((currentUnits - 6) / 4) * 100; // Vers critique
    }
    return 100; // Déjà critique
  };

  return {
    userStats,
    todayUnits,
    currentUnits,
    todayDrinks: todayDrinks.length,
    sessionDrinks,
    sessionUnits,
    sessionGroupAverage,
    sessionStartTime,
    weeklyTrend,
    alertLevel,
    groupStats,
    // Nouvelles fonctionnalités liées à l'activité
    isActivityTrackingAvailable,
    currentSleepStatus,
    useEnhancedDetection,
    toggleEnhancedDetection,
    getHourlyDistribution,
    getMostPopularDrinks,
    getProgressToNextAlert
  };
}