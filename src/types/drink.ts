export interface DrinkRecord {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  
  // Type et détails
  category: DrinkCategory;
  drinkType: string;
  customName?: string;
  brand?: string;
  
  // Mesures précises
  volume: number; // cl
  alcoholDegree: number; // %
  alcoholContent: number; // % (alias pour alcoholDegree)
  alcoholUnits: number; // calculé
  
  // Métadonnées
  timestamp: Date;
  createdAt: Date;
  isTemplate?: boolean; // true si c'est juste un modèle pour les favoris
  location?: {
    latitude: number;
    longitude: number;
    venue?: string;
  };
  
  // Synchronisation
  syncStatus: 'synced' | 'pending' | 'error';
  lastModified: Date;
}

export type DrinkCategory = 'beer' | 'wine' | 'cocktail' | 'shot' | 'champagne' | 'soft' | 'other';

export interface DrinkTemplate {
  category: DrinkCategory;
  type: string;
  name: string;
  volume: number;
  defaultAlcohol: number;
  emoji: string;
  variants?: string[];
}

export interface DrinkStats {
  totalDrinks: number;
  totalUnits: number;
  byCategory: {
    [key in DrinkCategory]: number;
  };
  favoriteType: string;
  hourlyDistribution: number[];
  dailyAverage: number;
}

export interface DrinkFormData {
  category: DrinkCategory;
  drinkType: string;
  customName?: string;
  brand?: string;
  volume: number;
  alcoholDegree: number;
  isTemplate?: boolean;
}