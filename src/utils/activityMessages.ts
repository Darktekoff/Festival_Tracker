import { DrinkFormData } from '../types';

// Messages fun pour les activités de boisson
const DRINK_ACTIONS = [
  "se tape une petite",
  "s'offre une",
  "déguste une",
  "savoure une",
  "se fait plaisir avec une",
  "trinque avec une",
  "découvre une",
  "apprécie une",
  "teste une",
  "craque pour une"
];

const BEER_ACTIONS = [
  "se tape une mousse",
  "s'enfile une bière",
  "déguste une petite blonde",
  "savoure une fraîche",
  "trinque avec une"
];

const COCKTAIL_ACTIONS = [
  "se concocte un",
  "déguste un délicieux",
  "savoure son",
  "se fait plaisir avec un",
  "teste un nouveau"
];

const SHOT_ACTIONS = [
  "descend un",
  "se jette un",
  "avale cul sec un",
  "fait un shot de",
  "s'envoie un petit"
];

const WINE_ACTIONS = [
  "déguste un verre de",
  "savoure un bon",
  "apprécie un",
  "trinque avec un",
  "se fait plaisir avec un"
];

// Messages selon le nombre de boissons
const COUNT_MESSAGES = {
  1: ["C'est parti !", "Le festival commence !", "Premier verre !", "C'est le début !"],
  2: ["Ça continue !", "C'est sa 2ème !", "Double dose !", "Ça suit son cours !"],
  3: ["C'est sa 3ème !", "Ça monte !", "Triple combo !", "On accélère !"],
  4: ["Quatrième tournée !", "C'est sa 4ème !", "Ça chauffe !", "Rythme soutenu !"],
  5: ["Cinquième ! 🔥", "C'est sa 5ème !", "Ça devient sérieux !", "Festival mode ON !"],
  6: ["Sixième ! 🍻", "C'est sa 6ème !", "En pleine forme !", "Ça continue de plus belle !"],
  7: ["Lucky 7 ! 🍀", "C'est sa 7ème !", "Ça ne s'arrête plus !", "En plein délire !"],
  8: ["Huitième ! 🎉", "C'est sa 8ème !", "Ambiance de folie !", "Ça part en live !"],
  9: ["Neuvième ! 🚀", "C'est sa 9ème !", "Décollage imminent !", "Plus rien ne l'arrête !"],
  10: ["DIXIÈME ! 🎊", "Double digits !", "La légende ! 🏆", "Champion du festival !"]
};

// Messages spéciaux selon l'heure
const TIME_MESSAGES = {
  morning: ["Réveil en douceur avec", "Petit-déj arrosé avec", "Matinée qui commence bien avec"],
  afternoon: ["Pause apéro avec", "Après-midi festive avec", "Soleil et"],
  evening: ["Soirée qui commence avec", "Ambiance du soir avec", "Nuit qui s'annonce avec"],
  night: ["Nuit de folie avec", "Ambiance nocturne avec", "Fête jusqu'au bout avec"]
};

export function generateDrinkActivityMessage(
  userName: string, 
  drink: DrinkFormData, 
  todayCount: number,
  timestamp: Date = new Date()
): string {
  const hour = timestamp.getHours();
  
  // Déterminer la période de la journée
  let timeOfDay: keyof typeof TIME_MESSAGES;
  if (hour >= 6 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
  else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
  else timeOfDay = 'night';

  // Choisir l'action selon le type de boisson
  let actions: string[];
  const drinkType = drink.drinkType.toLowerCase();
  
  if (drinkType.includes('bière') || drinkType.includes('pinte') || drinkType.includes('blonde') || drinkType.includes('brune')) {
    actions = BEER_ACTIONS;
  } else if (drinkType.includes('shot') || drinkType.includes('vodka') || drinkType.includes('tequila') || drinkType.includes('rhum')) {
    actions = SHOT_ACTIONS;
  } else if (drinkType.includes('cocktail') || drinkType.includes('mojito') || drinkType.includes('piña')) {
    actions = COCKTAIL_ACTIONS;
  } else if (drinkType.includes('vin') || drinkType.includes('rouge') || drinkType.includes('blanc') || drinkType.includes('rosé')) {
    actions = WINE_ACTIONS;
  } else {
    actions = DRINK_ACTIONS;
  }

  // Sélectionner une action aléatoire
  const action = actions[Math.floor(Math.random() * actions.length)];
  
  // Nom de la boisson (utiliser le nom custom s'il existe, sinon le type)
  const drinkName = drink.customName || drink.drinkType;
  
  // Message selon le nombre
  let countMessage = "";
  if (todayCount <= 10 && COUNT_MESSAGES[todayCount as keyof typeof COUNT_MESSAGES]) {
    const messages = COUNT_MESSAGES[todayCount as keyof typeof COUNT_MESSAGES];
    countMessage = messages[Math.floor(Math.random() * messages.length)];
  } else if (todayCount > 10) {
    countMessage = `${todayCount}ème verre ! 🔥`;
  }

  // Messages spéciaux selon l'heure (parfois)
  const useTimeMessage = Math.random() < 0.3; // 30% de chance
  if (useTimeMessage && TIME_MESSAGES[timeOfDay]) {
    const timeMessages = TIME_MESSAGES[timeOfDay];
    const timeAction = timeMessages[Math.floor(Math.random() * timeMessages.length)];
    return `${userName} ${timeAction} ${drinkName}${countMessage ? ' - ' + countMessage : ''}`;
  }

  // Message standard
  return `${userName} ${action} ${drinkName}${countMessage ? ' - ' + countMessage : ''}`;
}

// Messages pour les alertes d'alcoolémie
export function generateAlertActivityMessage(
  userName: string, 
  alertLevel: 'moderate' | 'high' | 'critical',
  currentUnits: number
): string {
  const messages = {
    moderate: [
      `${userName} atteint le seuil modéré (${currentUnits.toFixed(1)} unités)`,
      `${userName} commence à bien profiter ! (${currentUnits.toFixed(1)} unités)`,
      `${userName} est en pleine forme ! (${currentUnits.toFixed(1)} unités)`
    ],
    high: [
      `⚠️ ${userName} atteint un niveau élevé ! (${currentUnits.toFixed(1)} unités)`,
      `⚠️ ${userName} devrait ralentir un peu... (${currentUnits.toFixed(1)} unités)`,
      `⚠️ Attention, ${userName} monte en régime ! (${currentUnits.toFixed(1)} unités)`
    ],
    critical: [
      `🚨 ${userName} atteint un niveau critique ! (${currentUnits.toFixed(1)} unités)`,
      `🚨 ${userName} devrait vraiment faire une pause ! (${currentUnits.toFixed(1)} unités)`,
      `🚨 Niveau critique pour ${userName} ! (${currentUnits.toFixed(1)} unités)`
    ]
  };

  const levelMessages = messages[alertLevel];
  return levelMessages[Math.floor(Math.random() * levelMessages.length)];
}

// Messages pour les jalons (milestones)
export function generateMilestoneActivityMessage(
  userName: string, 
  milestone: string
): string {
  const milestoneMessages = {
    'first_drink': [
      `🎉 ${userName} ouvre le bal avec sa première boisson !`,
      `🎉 ${userName} lance les festivités !`,
      `🎉 Et c'est parti pour ${userName} !`
    ],
    '5_drinks': [
      `🔥 ${userName} atteint les 5 verres ! Ambiance !`,
      `🔥 ${userName} est en pleine forme !`,
      `🔥 ${userName} profite à fond du festival !`
    ],
    '10_drinks': [
      `🏆 ${userName} entre dans la légende avec 10 verres !`,
      `🏆 ${userName} devient champion du festival !`,
      `🏆 ${userName} atteint le niveau légendaire !`
    ]
  };

  if (milestoneMessages[milestone as keyof typeof milestoneMessages]) {
    const messages = milestoneMessages[milestone as keyof typeof milestoneMessages];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  return `🎉 ${userName} ${milestone}`;
}