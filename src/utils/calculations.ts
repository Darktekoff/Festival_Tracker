import { DrinkRecord, DrinkStats, GroupMember, AlertLevel, DrinkCategory } from '../types';
import { ALERT_THRESHOLDS } from './constants';
import { startOfDay, differenceInDays, format } from 'date-fns';

export function calculateAlcoholUnits(volume: number, alcoholDegree: number): number {
  // Gérer les valeurs invalides
  if (volume == null || alcoholDegree == null || 
      !isFinite(volume) || !isFinite(alcoholDegree) ||
      volume < 0 || alcoholDegree < 0) {
    return 0;
  }
  
  // Formule correcte: (volume en cl × degré d'alcool × densité alcool) / 1000
  // volume en cl, degré en %, densité de l'alcool = 0.8 g/ml
  // 1 unité standard = 10g d'alcool pur
  // Calcul: (volume_cl × 10ml/cl × degré/100 × 0.8g/ml) / 10g/unité
  // Simplifié: (volume × degré × 0.8) / 100
  const result = (volume * alcoholDegree * 0.8) / 100;
  return Number(result.toFixed(2));
}

/**
 * Analyse la vitesse de consommation pour ajuster l'absorption
 */
export function analyzeConsumptionSpeed(drinks: DrinkRecord[]): {
  averageTimeBetweenDrinks: number; // minutes
  speedFactor: number; // multiplicateur pour l'alcoolémie
  pattern: 'slow' | 'moderate' | 'fast' | 'binge';
} {
  if (drinks.length < 2) {
    return { averageTimeBetweenDrinks: 60, speedFactor: 1.0, pattern: 'moderate' };
  }

  // Trier par timestamp
  const sortedDrinks = [...drinks].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Calculer les intervalles entre les verres
  const intervals: number[] = [];
  for (let i = 1; i < sortedDrinks.length; i++) {
    const prevTime = new Date(sortedDrinks[i - 1].timestamp).getTime();
    const currentTime = new Date(sortedDrinks[i].timestamp).getTime();
    const intervalMinutes = (currentTime - prevTime) / (1000 * 60);
    intervals.push(intervalMinutes);
  }

  const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  
  // Déterminer le facteur de vitesse et le pattern
  let speedFactor = 1.0;
  let pattern: 'slow' | 'moderate' | 'fast' | 'binge' = 'moderate';

  if (averageInterval < 15) {
    // Moins de 15min entre verres = binge drinking
    speedFactor = 1.4; // +40% d'alcoolémie peak
    pattern = 'binge';
  } else if (averageInterval < 30) {
    // 15-30min = consommation rapide  
    speedFactor = 1.2; // +20% d'alcoolémie peak
    pattern = 'fast';
  } else if (averageInterval < 60) {
    // 30-60min = modéré
    speedFactor = 1.0;
    pattern = 'moderate';
  } else {
    // Plus de 60min = lent (permet plus d'élimination)
    speedFactor = 0.85; // -15% d'alcoolémie peak
    pattern = 'slow';
  }

  return {
    averageTimeBetweenDrinks: Math.round(averageInterval),
    speedFactor,
    pattern
  };
}

export function calculateCurrentBloodAlcohol(drinks: DrinkRecord[]): number {
  // Le corps élimine environ 0.15 unité d'alcool par heure (référence standard)
  const ELIMINATION_RATE = 0.15;
  const now = new Date();
  
  let totalUnits = 0;
  
  drinks.forEach(drink => {
    const drinkTime = new Date(drink.timestamp);
    const hoursElapsed = (now.getTime() - drinkTime.getTime()) / (1000 * 60 * 60);
    
    // Calculer les unités restantes après élimination
    const remainingUnits = Math.max(0, drink.alcoholUnits - (hoursElapsed * ELIMINATION_RATE));
    totalUnits += remainingUnits;
  });
  
  return Number(totalUnits.toFixed(2));
}

export function estimateBloodAlcoholContent(
  currentUnits: number, 
  weight: number = 70, 
  isMale: boolean = true,
  speedFactor: number = 1.0
): {
  bloodAlcohol: number; // g/L de sang
  breathAlcohol: number; // mg/L d'air expiré
} {
  // Coefficient de diffusion (Widmark) : 0.7 pour les hommes, 0.6 pour les femmes
  const widmarkFactor = isMale ? 0.7 : 0.6;
  
  // 1 unité = 10g d'alcool pur
  const alcoholGrams = currentUnits * 10;
  
  // Formule de Widmark avec ajustement vitesse de consommation
  const bloodAlcohol = (alcoholGrams / (weight * widmarkFactor)) * speedFactor;
  
  // Conversion sang vers air expiré : ratio moyen de 2100:1
  // 1 g/L dans le sang ≈ 0.5 mg/L dans l'air expiré
  const breathAlcohol = bloodAlcohol * 0.5;
  
  return {
    bloodAlcohol: Number(bloodAlcohol.toFixed(2)),
    breathAlcohol: Number(breathAlcohol.toFixed(2))
  };
}

export function getAlertLevel(units: number, thresholds = ALERT_THRESHOLDS): AlertLevel {
  if (units >= thresholds.CRITICAL) return 'critical';
  if (units >= thresholds.HIGH) return 'high';
  if (units >= thresholds.MODERATE) return 'moderate';
  return 'safe';
}

export function calculateGroupStats(drinks: DrinkRecord[], members: GroupMember[]): {
  totalDrinks: number;
  totalUnits: number;
  averagePerPerson: number;
  mostActiveDay: string;
  memberStats: Map<string, { drinks: number; units: number }>;
} {
  const totalDrinks = drinks.length;
  const totalUnits = drinks.reduce((sum, drink) => sum + drink.alcoholUnits, 0);
  const averagePerPerson = members.length > 0 ? totalUnits / members.length : 0;
  
  // Calculer le jour le plus actif
  const dayCount = new Map<string, number>();
  drinks.forEach(drink => {
    const day = format(drink.timestamp, 'yyyy-MM-dd');
    dayCount.set(day, (dayCount.get(day) || 0) + 1);
  });
  
  let mostActiveDay = '';
  let maxDrinks = 0;
  dayCount.forEach((count, day) => {
    if (count > maxDrinks) {
      maxDrinks = count;
      mostActiveDay = day;
    }
  });
  
  // Stats par membre
  const memberStats = new Map<string, { drinks: number; units: number }>();
  drinks.forEach(drink => {
    const current = memberStats.get(drink.userId) || { drinks: 0, units: 0 };
    memberStats.set(drink.userId, {
      drinks: current.drinks + 1,
      units: current.units + drink.alcoholUnits
    });
  });
  
  return {
    totalDrinks,
    totalUnits: Number(totalUnits.toFixed(2)),
    averagePerPerson: Number(averagePerPerson.toFixed(2)),
    mostActiveDay,
    memberStats
  };
}

export function getDailyConsumption(drinks: DrinkRecord[], date: Date): number {
  const dayStart = startOfDay(date);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  
  return drinks
    .filter(drink => drink.timestamp >= dayStart && drink.timestamp < dayEnd)
    .reduce((sum, drink) => sum + drink.alcoholUnits, 0);
}

export function getWeeklyTrend(drinks: DrinkRecord[]): number[] {
  const today = new Date();
  const trend: number[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    trend.push(getDailyConsumption(drinks, date));
  }
  
  return trend;
}

export function calculateDrinkStats(drinks: DrinkRecord[]): DrinkStats {
  const totalDrinks = drinks.length;
  const totalUnits = drinks.reduce((sum, drink) => sum + drink.alcoholUnits, 0);
  
  // Stats par catégorie
  const byCategory: { [key in DrinkCategory]: number } = {
    beer: 0,
    wine: 0,
    cocktail: 0,
    shot: 0,
    champagne: 0,
    soft: 0,
    other: 0
  };
  
  const typeCount = new Map<string, number>();
  
  drinks.forEach(drink => {
    byCategory[drink.category]++;
    const key = `${drink.category}:${drink.drinkType}`;
    typeCount.set(key, (typeCount.get(key) || 0) + 1);
  });
  
  // Type favori
  let favoriteType = '';
  let maxCount = 0;
  typeCount.forEach((count, type) => {
    if (count > maxCount) {
      maxCount = count;
      favoriteType = type;
    }
  });
  
  // Distribution horaire
  const hourlyDistribution = new Array(24).fill(0);
  drinks.forEach(drink => {
    const hour = new Date(drink.timestamp).getHours();
    hourlyDistribution[hour]++;
  });
  
  // Moyenne journalière
  let dailyAverage = 0;
  if (drinks.length > 0) {
    const firstDrink = drinks.reduce((min, drink) => 
      drink.timestamp < min.timestamp ? drink : min
    );
    const daysSince = differenceInDays(new Date(), firstDrink.timestamp) + 1;
    dailyAverage = totalUnits / daysSince;
  }
  
  return {
    totalDrinks,
    totalUnits: Number(totalUnits.toFixed(2)),
    byCategory,
    favoriteType,
    hourlyDistribution,
    dailyAverage: Number(dailyAverage.toFixed(2))
  };
}

export function formatUnits(units: number): string {
  return units.toFixed(1);
}

// === NOUVELLES FONCTIONS AVANCÉES ===

/**
 * Calcule l'IMC et les données corporelles avancées
 */
export function calculateAdvancedBMI(height: number, weight: number, age: number, gender: 'male' | 'female') {
  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);
  
  // Classification IMC
  let bmiCategory: 'underweight' | 'normal' | 'overweight' | 'obese';
  if (bmi < 18.5) bmiCategory = 'underweight';
  else if (bmi < 25) bmiCategory = 'normal';
  else if (bmi < 30) bmiCategory = 'overweight';
  else bmiCategory = 'obese';
  
  // Estimation du pourcentage de masse grasse (formule de Deurenberg)
  const bodyFatPercentage = (1.20 * bmi) + (0.23 * age) - (10.8 * (gender === 'male' ? 1 : 0)) - 5.4;
  
  // Masse grasse et masse maigre
  const fatMass = (weight * Math.max(0, bodyFatPercentage)) / 100;
  const leanBodyMass = weight - fatMass;
  
  return {
    bmi: Number(bmi.toFixed(1)),
    bmiCategory,
    bodyFatPercentage: Number(Math.max(0, bodyFatPercentage).toFixed(1)),
    fatMass: Number(fatMass.toFixed(1)),
    leanBodyMass: Number(leanBodyMass.toFixed(1))
  };
}

/**
 * Calcule le coefficient de Widmark personnalisé basé sur la composition corporelle
 */
export function getPersonalizedWidmarkFactor(
  age: number, 
  gender: 'male' | 'female', 
  bmi: number, 
  bodyFatPercentage: number
): number {
  // Coefficient de base selon le sexe
  let baseCoeff = gender === 'male' ? 0.68 : 0.55;
  
  // Ajustement selon l'âge (diminution progressive après 30 ans)
  if (age > 30) {
    const ageReduction = (age - 30) * 0.002; // -0.2% par année après 30 ans
    baseCoeff -= ageReduction;
  }
  
  // Ajustement selon l'IMC et la composition corporelle
  // Plus la masse grasse est élevée, plus le coefficient diminue (moins d'eau corporelle)
  const fatAdjustment = (bodyFatPercentage - (gender === 'male' ? 15 : 25)) * 0.003;
  baseCoeff -= Math.max(0, fatAdjustment);
  
  // Ajustement selon l'IMC pour les cas extrêmes
  if (bmi < 18.5) {
    baseCoeff += 0.02; // Sous-poids = plus d'eau relative
  } else if (bmi > 30) {
    baseCoeff -= 0.03; // Obésité = moins d'eau relative
  }
  
  // Limites de sécurité
  return Math.max(0.4, Math.min(0.8, baseCoeff));
}

/**
 * Calcule la vitesse d'élimination personnalisée
 */
export function calculatePersonalizedElimination(
  age: number,
  gender: 'male' | 'female',
  weight: number,
  bmi: number,
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' = 'moderate'
): number {
  // Taux de base standard : 0.15 unités/heure pour la plupart des adultes
  let baseRate = 0.15;
  
  // Ajustement léger selon le sexe (les femmes éliminent généralement un peu moins vite)
  if (gender === 'female') {
    baseRate *= 0.9; // -10% pour les femmes
  }
  
  // Ajustement selon l'âge (métabolisme ralentit légèrement avec l'âge)
  if (age > 50) {
    baseRate *= 0.95; // -5% après 50 ans
  } else if (age < 25) {
    baseRate *= 1.05; // +5% avant 25 ans
  }
  
  // Ajustement selon le poids (personnes plus lourdes éliminent légèrement plus vite)
  const weightFactor = Math.sqrt(weight / 70); // Normalisation sur 70kg
  baseRate *= Math.min(1.2, Math.max(0.8, weightFactor)); // Limiter les variations
  
  // Ajustement selon l'activité physique (impact modéré)
  const activityMultiplier = {
    sedentary: 0.95,
    light: 1.0,
    moderate: 1.05,
    active: 1.1
  };
  baseRate *= activityMultiplier[activityLevel];
  
  // Limites de sécurité : entre 0.1 et 0.2 unités/heure
  return Math.max(0.1, Math.min(0.2, baseRate));
}

/**
 * Estimation avancée de l'alcoolémie avec profil personnalisé
 */
export function estimateAdvancedBloodAlcoholContent(
  currentUnits: number,
  profile: {
    age: number;
    gender: 'male' | 'female';
    height: number;
    weight: number;
    activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active';
  }
): {
  bloodAlcohol: number; // g/L de sang
  breathAlcohol: number; // mg/L d'air expiré
  eliminationRate: number; // unités/heure
  timeToSober: number; // heures pour revenir à 0
  widmarkFactor: number; // coefficient utilisé
  metabolismInfo: {
    bmi: number;
    bodyFatPercentage: number;
    leanBodyMass: number;
  };
} {
  try {
    // Vérifier que le profil est complet
    if (!profile || typeof profile.age !== 'number' || typeof profile.height !== 'number' || 
        typeof profile.weight !== 'number' || !profile.gender) {
      console.error('estimateAdvancedBloodAlcoholContent: Profile incomplet', profile);
      throw new Error('Profile incomplet pour les calculs avancés');
    }

    // Calculs de composition corporelle
    const bodyData = calculateAdvancedBMI(profile.height, profile.weight, profile.age, profile.gender);
  
  // Coefficient de Widmark personnalisé
  const widmarkFactor = getPersonalizedWidmarkFactor(
    profile.age,
    profile.gender,
    bodyData.bmi,
    bodyData.bodyFatPercentage
  );
  
  // Calcul de l'alcoolémie
  const alcoholGrams = currentUnits * 10;
  const bloodAlcohol = alcoholGrams / (profile.weight * widmarkFactor);
  
  // Conversion sang vers air expiré
  const breathAlcohol = bloodAlcohol * 0.5;
  
  // Vitesse d'élimination personnalisée
  const eliminationRate = calculatePersonalizedElimination(
    profile.age,
    profile.gender,
    profile.weight,
    bodyData.bmi,
    profile.activityLevel
  );
  
  // Temps pour revenir à sobriété
  const timeToSober = currentUnits / eliminationRate;
  
  return {
    bloodAlcohol: Number(Math.max(0, bloodAlcohol).toFixed(3)),
    breathAlcohol: Number(Math.max(0, breathAlcohol).toFixed(3)),
    eliminationRate: Number(eliminationRate.toFixed(2)),
    timeToSober: Number(Math.max(0, timeToSober).toFixed(1)),
    widmarkFactor: Number(widmarkFactor.toFixed(2)),
    metabolismInfo: {
      bmi: bodyData.bmi,
      bodyFatPercentage: bodyData.bodyFatPercentage,
      leanBodyMass: bodyData.leanBodyMass
    }
  };
  } catch (error) {
    console.error('Erreur dans estimateAdvancedBloodAlcoholContent:', error);
    console.error('Stack trace:', error.stack);
    // Retourner des valeurs par défaut
    return {
      bloodAlcohol: 0,
      breathAlcohol: 0,
      eliminationRate: 0.15,
      timeToSober: 0,
      widmarkFactor: 0.7,
      metabolismInfo: {
        bmi: 25,
        bodyFatPercentage: 20,
        leanBodyMass: 60
      }
    };
  }
}

/**
 * Calcule l'alcoolémie actuelle en tenant compte de l'élimination dans le temps
 */
export function calculateAdvancedCurrentBloodAlcohol(
  drinks: DrinkRecord[],
  profile: {
    age: number;
    gender: 'male' | 'female';
    height: number;
    weight: number;
    activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active';
  }
): number {
  const now = new Date();
  const bodyData = calculateAdvancedBMI(profile.height, profile.weight, profile.age, profile.gender);
  const eliminationRate = calculatePersonalizedElimination(
    profile.age,
    profile.gender,
    profile.weight,
    bodyData.bmi,
    profile.activityLevel
  );
  
  let totalUnits = 0;
  
  drinks.forEach(drink => {
    const drinkTime = new Date(drink.timestamp);
    const hoursElapsed = (now.getTime() - drinkTime.getTime()) / (1000 * 60 * 60);
    
    // Calculer les unités restantes après élimination personnalisée
    const remainingUnits = Math.max(0, drink.alcoholUnits - (hoursElapsed * eliminationRate));
    totalUnits += remainingUnits;
  });
  
  return Number(totalUnits.toFixed(2));
}

// === LOGIQUE DE SESSION FESTIVAL ===

interface ActivityData {
  timestamp: Date;
  steps: {
    walking: number;
    dancing: number;
    total: number;
  };
}

/**
 * Détecte si une période correspond à du sommeil/repos basé sur l'activité physique
 * @param activityData Données d'activité pour la période
 * @param minInactivityHours Nombre d'heures minimum d'inactivité pour considérer comme repos
 * @returns true si la période correspond probablement à du sommeil
 */
export function detectSleepPeriod(
  activityData: ActivityData[], 
  minInactivityHours: number = 3
): { isSleeping: boolean; inactivityDuration: number } {
  if (activityData.length === 0) {
    return { isSleeping: false, inactivityDuration: 0 };
  }

  const STEPS_THRESHOLD_PER_HOUR = 50; // Seuil très bas de pas/heure pour détecter le sommeil
  const now = new Date();
  
  // Analyser les X dernières heures d'activité
  const recentActivityWindow = minInactivityHours * 60 * 60 * 1000; // en ms
  const cutoffTime = new Date(now.getTime() - recentActivityWindow);
  
  const recentActivity = activityData.filter(data => 
    new Date(data.timestamp) >= cutoffTime
  );
  
  if (recentActivity.length === 0) {
    return { isSleeping: false, inactivityDuration: 0 };
  }
  
  // Calculer l'activité par heure
  const hourlyActivity = new Map<string, number>();
  
  recentActivity.forEach(data => {
    const hour = new Date(data.timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const currentSteps = hourlyActivity.get(hour) || 0;
    hourlyActivity.set(hour, Math.max(currentSteps, data.steps.total));
  });
  
  // Vérifier le nombre d'heures consécutives avec très peu d'activité
  let consecutiveInactiveHours = 0;
  let maxInactiveStreak = 0;
  
  // Parcourir les heures en ordre chronologique
  const sortedHours = Array.from(hourlyActivity.keys()).sort();
  let lastHourSteps = 0;
  
  for (const hour of sortedHours) {
    const hourSteps = hourlyActivity.get(hour) || 0;
    const stepsDiff = hourSteps - lastHourSteps;
    
    if (stepsDiff <= STEPS_THRESHOLD_PER_HOUR) {
      consecutiveInactiveHours++;
      maxInactiveStreak = Math.max(maxInactiveStreak, consecutiveInactiveHours);
    } else {
      consecutiveInactiveHours = 0;
    }
    
    lastHourSteps = hourSteps;
  }
  
  const isSleeping = maxInactiveStreak >= minInactivityHours;
  
  return {
    isSleeping,
    inactivityDuration: maxInactiveStreak
  };
}

/**
 * Version améliorée: Détecte les sessions avec activité physique 
 * Combine pauses temporelles ET inactivité physique pour une détection plus précise
 */
export function getSessionDrinksWithActivity(
  drinks: DrinkRecord[], 
  activityData: ActivityData[] = [],
  userId?: string
): DrinkRecord[] {
  if (drinks.length === 0) return [];
  
  // Filtrer par utilisateur si spécifié
  const userDrinks = userId 
    ? drinks.filter(d => d.userId === userId && !d.isTemplate)
    : drinks.filter(d => !d.isTemplate);
  
  if (userDrinks.length === 0) return [];
  
  // Trier par timestamp
  const sortedDrinks = [...userDrinks].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  const now = new Date();
  const SESSION_BREAK_HOURS = 3; // Réduit à 3h car on a maintenant l'activité physique
  const SESSION_BREAK_MS = SESSION_BREAK_HOURS * 60 * 60 * 1000;
  
  // Trouver le début de la session actuelle
  let sessionStartIndex = sortedDrinks.length - 1;
  
  for (let i = sortedDrinks.length - 1; i > 0; i--) {
    const currentDrink = new Date(sortedDrinks[i].timestamp);
    const previousDrink = new Date(sortedDrinks[i - 1].timestamp);
    const timeDiff = currentDrink.getTime() - previousDrink.getTime();
    
    // Si on trouve un gap de 3h+, vérifier l'activité physique
    if (timeDiff >= SESSION_BREAK_MS) {
      // Analyser l'activité physique pendant cette période
      const periodActivityData = activityData.filter(activity => {
        const activityTime = new Date(activity.timestamp);
        return activityTime >= previousDrink && activityTime <= currentDrink;
      });
      
      const sleepAnalysis = detectSleepPeriod(periodActivityData, 2); // 2h minimum d'inactivité
      
      // Si détection de sommeil OU pause de 4h+ sans données d'activité, nouvelle session
      if (sleepAnalysis.isSleeping || timeDiff >= 4 * 60 * 60 * 1000) {
        sessionStartIndex = i;
        break;
      }
    }
    
    // Si on remonte trop loin (plus de 24h), arrêter
    const timeSinceNow = now.getTime() - previousDrink.getTime();
    if (timeSinceNow > 24 * 60 * 60 * 1000) {
      sessionStartIndex = i;
      break;
    }
  }
  
  return sortedDrinks.slice(sessionStartIndex);
}

/**
 * Version de base: Détecte les sessions basées sur des pauses de 4h+
 * Garde la logique simple pour compatibilité
 */
export function getSessionDrinks(drinks: DrinkRecord[], userId?: string): DrinkRecord[] {
  if (drinks.length === 0) return [];
  
  // Filtrer par utilisateur si spécifié
  const userDrinks = userId 
    ? drinks.filter(d => d.userId === userId && !d.isTemplate)
    : drinks.filter(d => !d.isTemplate);
  
  if (userDrinks.length === 0) return [];
  
  // Trier par timestamp
  const sortedDrinks = [...userDrinks].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  const now = new Date();
  const SESSION_BREAK_HOURS = 4;
  const SESSION_BREAK_MS = SESSION_BREAK_HOURS * 60 * 60 * 1000;
  
  // Trouver le début de la session actuelle
  let sessionStartIndex = sortedDrinks.length - 1;
  
  for (let i = sortedDrinks.length - 1; i > 0; i--) {
    const currentDrink = new Date(sortedDrinks[i].timestamp);
    const previousDrink = new Date(sortedDrinks[i - 1].timestamp);
    const timeDiff = currentDrink.getTime() - previousDrink.getTime();
    
    // Si on trouve un gap de 4h+, la session commence après ce gap
    if (timeDiff >= SESSION_BREAK_MS) {
      sessionStartIndex = i;
      break;
    }
    
    // Si on remonte trop loin (plus de 24h), arrêter
    const timeSinceNow = now.getTime() - previousDrink.getTime();
    if (timeSinceNow > 24 * 60 * 60 * 1000) {
      sessionStartIndex = i;
      break;
    }
  }
  
  return sortedDrinks.slice(sessionStartIndex);
}

/**
 * Calcule la moyenne de consommation du groupe pour la session actuelle
 */
export function calculateSessionGroupAverage(
  drinks: DrinkRecord[], 
  members: GroupMember[]
): {
  sessionGroupAverage: number;
  sessionMemberStats: Map<string, { drinks: number; units: number }>;
  sessionStartTime: Date | null;
} {
  if (members.length === 0) {
    return {
      sessionGroupAverage: 0,
      sessionMemberStats: new Map(),
      sessionStartTime: null
    };
  }
  
  // Obtenir toutes les boissons de session pour tous les membres
  const allSessionDrinks: DrinkRecord[] = [];
  let earliestSessionStart: Date | null = null;
  
  members.forEach(member => {
    const memberSessionDrinks = getSessionDrinks(drinks, member.id);
    allSessionDrinks.push(...memberSessionDrinks);
    
    if (memberSessionDrinks.length > 0) {
      const memberSessionStart = new Date(memberSessionDrinks[0].timestamp);
      if (!earliestSessionStart || memberSessionStart < earliestSessionStart) {
        earliestSessionStart = memberSessionStart;
      }
    }
  });
  
  // Calculer les stats par membre pour la session
  const sessionMemberStats = new Map<string, { drinks: number; units: number }>();
  allSessionDrinks.forEach(drink => {
    const current = sessionMemberStats.get(drink.userId) || { drinks: 0, units: 0 };
    sessionMemberStats.set(drink.userId, {
      drinks: current.drinks + 1,
      units: current.units + drink.alcoholUnits
    });
  });
  
  // Calculer la moyenne des unités par personne
  const totalSessionUnits = allSessionDrinks.reduce((sum, drink) => sum + drink.alcoholUnits, 0);
  const sessionGroupAverage = totalSessionUnits / members.length;
  
  return {
    sessionGroupAverage: Number(sessionGroupAverage.toFixed(2)),
    sessionMemberStats,
    sessionStartTime: earliestSessionStart
  };
}