import { User } from '../types';

export interface PersonalizedLimits {
  daily: {
    units: number;
    description: string;
  };
  weekly: {
    units: number;
    description: string;
  };
  singleSession: {
    units: number;
    description: string;
  };
  alertLevels: {
    moderate: number;
    high: number;
    critical: number;
  };
  recommendations: string[];
}

export interface AlcoholAlert {
  level: 'info' | 'warning' | 'danger' | 'critical';
  title: string;
  message: string;
  recommendations: string[];
  shouldNotify: boolean;
}

/**
 * Calcule les limites personnalisées selon l'âge, sexe, poids et santé
 * Basé sur les recommandations de l'OMS, INSERM et sociétés médicales
 */
export function calculatePersonalizedLimits(profile: {
  age: number;
  gender: 'male' | 'female';
  height: number;
  weight: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active';
}): PersonalizedLimits {
  try {
    // Vérifier que le profil est complet
    if (!profile || typeof profile.age !== 'number' || typeof profile.height !== 'number' || 
        typeof profile.weight !== 'number' || !profile.gender) {
      console.error('calculatePersonalizedLimits: Profile incomplet', profile);
      throw new Error('Profile incomplet pour le calcul des limites');
    }

    const { age, gender, weight } = profile;
  
  // Limites de base OMS : 
  // - Hommes : 3 unités/jour, 21 unités/semaine max
  // - Femmes : 2 unités/jour, 14 unités/semaine max
  let baseDailyLimit = gender === 'male' ? 3 : 2;
  let baseWeeklyLimit = gender === 'male' ? 21 : 14;
  let baseSingleSession = gender === 'male' ? 5 : 4;
  
  // Ajustements selon l'âge
  if (age < 25) {
    // Jeunes adultes : réduction car développement cérébral
    baseDailyLimit *= 0.8;
    baseWeeklyLimit *= 0.8;
    baseSingleSession *= 0.8;
  } else if (age > 65) {
    // Seniors : métabolisme ralenti, risques accrus
    baseDailyLimit *= 0.7;
    baseWeeklyLimit *= 0.7;
    baseSingleSession *= 0.6;
  }
  
  // Ajustement selon le poids (pour les cas extrêmes)
  const referenceWeight = gender === 'male' ? 70 : 60;
  const weightFactor = Math.sqrt(weight / referenceWeight);
  if (weight < referenceWeight * 0.8) {
    // Poids faible : réduction des limites
    baseDailyLimit *= Math.max(0.7, weightFactor);
    baseWeeklyLimit *= Math.max(0.7, weightFactor);
    baseSingleSession *= Math.max(0.7, weightFactor);
  }
  
  // Seuils d'alerte progressifs
  const alertLevels = {
    moderate: Math.round(baseDailyLimit * 0.8), // 80% de la limite journalière
    high: Math.round(baseSingleSession * 0.9), // 90% de la limite par session
    critical: Math.round(baseSingleSession * 1.2) // 120% de la limite par session
  };
  
  // Recommandations personnalisées
  const recommendations = generatePersonalizedRecommendations(profile, {
    daily: baseDailyLimit,
    weekly: baseWeeklyLimit,
    session: baseSingleSession
  });
  
  return {
    daily: {
      units: Math.round(baseDailyLimit),
      description: `Maximum recommandé par jour pour ${gender === 'male' ? 'un homme' : 'une femme'} de ${age} ans`
    },
    weekly: {
      units: Math.round(baseWeeklyLimit),
      description: 'Maximum recommandé par semaine selon l\'OMS'
    },
    singleSession: {
      units: Math.round(baseSingleSession),
      description: 'Maximum recommandé en une fois (binge drinking)'
    },
    alertLevels,
    recommendations
  };
  } catch (error) {
    console.error('Erreur dans calculatePersonalizedLimits:', error);
    console.error('Stack trace:', error.stack);
    // Retourner des limites par défaut
    return {
      daily: { units: 2, description: 'Limite quotidienne par défaut' },
      weekly: { units: 14, description: 'Limite hebdomadaire par défaut' },
      singleSession: { units: 4, description: 'Limite par session par défaut' },
      alertLevels: { moderate: 3, high: 6, critical: 10 },
      recommendations: ['Buvez avec modération', 'Hydratez-vous régulièrement']
    };
  }
}

/**
 * Génère des recommandations personnalisées
 */
function generatePersonalizedRecommendations(
  profile: { age: number; gender: 'male' | 'female'; weight: number },
  limits: { daily: number; weekly: number; session: number }
): string[] {
  const { age, gender, weight } = profile;
  const recommendations: string[] = [];
  
  // Recommandations de base
  recommendations.push('Alternez avec de l\'eau : 1 verre d\'alcool = 1 verre d\'eau');
  recommendations.push('Mangez avant et pendant la consommation');
  
  // Selon l'âge
  if (age < 25) {
    recommendations.push('Attention : votre cerveau se développe encore jusqu\'à 25 ans');
    recommendations.push('Limitez-vous à 2 jours de consommation par semaine maximum');
  } else if (age > 50) {
    recommendations.push('Après 50 ans, le métabolisme ralentit : soyez encore plus prudent');
    recommendations.push('Consultez votre médecin sur les interactions médicamenteuses');
  }
  
  // Selon le sexe
  if (gender === 'female') {
    recommendations.push('Les femmes éliminent l\'alcool 20% plus lentement que les hommes');
    if (age >= 18 && age <= 45) {
      recommendations.push('Attention aux interactions avec la contraception hormonale');
    }
  }
  
  // Selon le poids
  if (weight < (gender === 'male' ? 65 : 55)) {
    recommendations.push('Poids faible = effets plus rapides : réduisez les quantités');
  } else if (weight > (gender === 'male' ? 90 : 80)) {
    recommendations.push('Ne pas augmenter les doses : l\'alcool ne se dilue que dans l\'eau corporelle');
  }
  
  // Recommandations festival
  recommendations.push('En festival : hydratez-vous 2x plus que d\'habitude');
  recommendations.push('Dormez suffisamment : la fatigue amplifie les effets');
  
  return recommendations;
}

/**
 * Évalue le niveau de risque actuel et génère une alerte
 */
export function evaluateAlcoholRisk(
  currentUnits: number,
  todayUnits: number,
  weeklyUnits: number,
  limits: PersonalizedLimits,
  profile: { age: number; gender: 'male' | 'female'; weight: number }
): AlcoholAlert {
  try {
    // Vérifier que le profil est complet
    if (!profile || typeof profile.age !== 'number' || !profile.gender) {
      console.error('evaluateAlcoholRisk: Profile incomplet', profile);
      throw new Error('Profile incomplet pour l\'évaluation des risques');
    }

    const { age, gender } = profile;
  
  // Détermination du niveau de risque
  let level: 'info' | 'warning' | 'danger' | 'critical' = 'info';
  let title = '';
  let message = '';
  let recommendations: string[] = [];
  let shouldNotify = false;
  
  // Évaluation par niveaux de priorité
  if (todayUnits >= limits.alertLevels.critical) {
    level = 'critical';
    title = '🚨 Consommation dangereuse';
    message = `Avec ${todayUnits} unités aujourd'hui, vous dépassez significativement les limites de sécurité.`;
    recommendations = [
      'ARRÊTEZ de boire immédiatement',
      'Buvez de l\'eau et mangez quelque chose',
      'Restez avec des amis de confiance',
      'En cas de malaise : appelez les secours (112)',
      'Ne conduisez pas pendant au moins 12h'
    ];
    shouldNotify = true;
  } else if (todayUnits >= limits.alertLevels.high) {
    level = 'danger';
    title = '⚠️ Zone de risque élevé';
    message = `${todayUnits} unités aujourd'hui : vous approchez des limites dangereuses.`;
    recommendations = [
      'Ralentissez le rythme ou arrêtez',
      'Hydratez-vous immédiatement',
      'Évitez de boire seul(e)',
      'Prévoyez un transport sûr',
      'Mangez des aliments riches en glucides'
    ];
    shouldNotify = true;
  } else if (todayUnits >= limits.alertLevels.moderate) {
    level = 'warning';
    title = '⚡ Attention au rythme';
    message = `${todayUnits} unités aujourd'hui : vous approchez de votre limite quotidienne.`;
    recommendations = [
      'Ralentissez et alternez avec de l\'eau',
      'Faites une pause de 30 minutes minimum',
      'Grignotez quelque chose',
      'Surveillez votre état et celui de vos amis'
    ];
    shouldNotify = false;
  } else if (weeklyUnits > limits.weekly.units) {
    level = 'warning';
    title = '📊 Limite hebdomadaire dépassée';
    message = `${weeklyUnits} unités cette semaine : vous dépassez la limite recommandée de ${limits.weekly.units} unités.`;
    recommendations = [
      'Planifiez plusieurs jours sans alcool',
      'Réduisez les quantités les prochains jours',
      'Concentrez-vous sur l\'hydratation',
      'Consultez un professionnel si cela devient habituel'
    ];
    shouldNotify = false;
  } else {
    level = 'info';
    title = '✅ Consommation dans les limites';
    message = `${todayUnits} unité${todayUnits > 1 ? 's' : ''} aujourd'hui : vous restez dans les recommandations.`;
    recommendations = [
      'Continuez à boire de l\'eau régulièrement',
      'Gardez ce rythme raisonnable',
      'Profitez de votre soirée en sécurité !'
    ];
    shouldNotify = false;
  }
  
  // Ajout de conseils spécifiques selon le profil
  if (age < 25 && level !== 'info') {
    recommendations.unshift('Important : l\'alcool affecte plus le cerveau en développement');
  }
  
  if (gender === 'female' && level !== 'info') {
    recommendations.push('Les femmes éliminent l\'alcool plus lentement : soyez patiente');
  }
  
  return {
    level,
    title,
    message,
    recommendations,
    shouldNotify
  };
  } catch (error) {
    console.error('Erreur dans evaluateAlcoholRisk:', error);
    console.error('Stack trace:', error.stack);
    // Retourner une alerte par défaut
    return {
      level: 'info',
      title: 'Information',
      message: 'Buvez avec modération',
      recommendations: ['Hydratez-vous régulièrement', 'Surveillez votre consommation'],
      shouldNotify: false
    };
  }
}

/**
 * Calcule les recommandations en temps réel pour la prochaine consommation
 */
export function getNextDrinkRecommendation(
  currentUnits: number,
  lastDrinkTime: Date,
  limits: PersonalizedLimits,
  eliminationRate: number
): {
  canDrink: boolean;
  waitTime: number; // minutes
  reasoning: string;
  alternatives: string[];
} {
  const now = new Date();
  const minutesSinceLastDrink = (now.getTime() - lastDrinkTime.getTime()) / (1000 * 60);
  
  // Vérification des limites
  if (currentUnits >= limits.singleSession.units) {
    return {
      canDrink: false,
      waitTime: Math.ceil((currentUnits - limits.singleSession.units + 1) / eliminationRate * 60),
      reasoning: 'Vous avez atteint votre limite pour cette session',
      alternatives: [
        'Prenez un verre d\'eau pétillante avec citron',
        'Commandez un mocktail ou une boisson énergisante',
        'Faites une pause danse pour vous hydrater',
        'Grignotez quelque chose de salé'
      ]
    };
  }
  
  // Recommandation d'espacement (minimum 30 minutes)
  const recommendedWait = 30 - minutesSinceLastDrink;
  if (recommendedWait > 0) {
    return {
      canDrink: false,
      waitTime: Math.ceil(recommendedWait),
      reasoning: 'Pour un rythme sain, attendez 30 minutes entre chaque verre',
      alternatives: [
        'Buvez de l\'eau en attendant',
        'Allez danser ou socialiser',
        'Prenez l\'air quelques minutes',
        'Grignotez des amuse-bouches'
      ]
    };
  }
  
  return {
    canDrink: true,
    waitTime: 0,
    reasoning: 'Vous pouvez boire un verre en restant raisonnable',
    alternatives: [
      'Choisissez une boisson moins forte',
      'Prenez un demi au lieu d\'une pinte',
      'Accompagnez d\'un verre d\'eau',
      'Partagez un cocktail avec un ami'
    ]
  };
}

/**
 * Formats les limites pour l'affichage
 */
export function formatLimitsForDisplay(limits: PersonalizedLimits) {
  return {
    daily: `${limits.daily.units} unités/jour maximum`,
    weekly: `${limits.weekly.units} unités/semaine maximum`,
    session: `${limits.singleSession.units} unités/session maximum`,
    currentStatus: (currentUnits: number, dailyUnits: number) => {
      const dailyPercent = (dailyUnits / limits.daily.units) * 100;
      const sessionPercent = (currentUnits / limits.singleSession.units) * 100;
      
      return {
        dailyPercent: Math.round(dailyPercent),
        sessionPercent: Math.round(sessionPercent),
        status: dailyPercent > 100 ? 'exceeded' : dailyPercent > 80 ? 'warning' : 'safe'
      };
    }
  };
}