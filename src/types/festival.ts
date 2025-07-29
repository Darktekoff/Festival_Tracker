// Festival tracking types

export type ZoneType = 
  | 'stage' 
  | 'bar' 
  | 'toilets' 
  | 'camping' 
  | 'hq'
  | 'food' 
  | 'entrance' 
  | 'medical' 
  | 'info' 
  | 'charging' 
  | 'custom';

export interface FestivalZone {
  id: string;
  name: string;
  type: ZoneType;
  emoji: string;
  position: {
    latitude: number;
    longitude: number;
  };
  radius: number; // en mètres
  createdBy: string; // userId
  createdByName?: string; // nom de l'utilisateur pour l'affichage
  createdAt: Date;
  updatedAt?: Date;
}

export interface UserActivity {
  userId: string;
  timestamp: Date;
  currentZone?: string; // zoneId si dans une zone
  currentZoneName?: string; // nom de la zone pour l'affichage
  steps: {
    walking: number;
    dancing: number;
    total: number;
  };
  distance: number; // en mètres
  position?: {
    latitude: number;
    longitude: number;
  };
}

export interface FestivalStats {
  userId: string;
  date: Date;
  zonesVisited: { 
    [zoneId: string]: {
      name: string;
      timeSpent: number; // temps en minutes
      visits: number;
    }
  };
  totalSteps: {
    walking: number;
    dancing: number;
  };
  totalDistance: number; // en mètres
  firstActivity: Date;
  lastActivity: Date;
  mostVisitedZone?: {
    id: string;
    name: string;
    timeSpent: number;
  };
}

export interface GroupFestivalData {
  zones: FestivalZone[];
  activities: UserActivity[];
  stats: FestivalStats[];
}

// Configuration des types de zones
export const ZONE_CONFIGS: Record<ZoneType, { emoji: string; label: string; color: string }> = {
  stage: { emoji: '🎸', label: 'Scène', color: '#E91E63' },
  bar: { emoji: '🍺', label: 'Bar', color: '#FF9800' },
  toilets: { emoji: '🚻', label: 'Toilettes', color: '#2196F3' },
  camping: { emoji: '⛺', label: 'Camping', color: '#4CAF50' },
  hq: { emoji: '🏠', label: 'Le QG', color: '#4CAF50' },
  food: { emoji: '🍔', label: 'Restauration', color: '#FFC107' },
  entrance: { emoji: '🚪', label: 'Entrée/Sortie', color: '#9C27B0' },
  medical: { emoji: '🏥', label: 'Poste de secours', color: '#F44336' },
  info: { emoji: 'ℹ️', label: 'Info/Accueil', color: '#00BCD4' },
  charging: { emoji: '🔌', label: 'Zone de recharge', color: '#795548' },
  custom: { emoji: '📍', label: 'Autre', color: '#607D8B' }
};