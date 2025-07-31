export interface User {
  id: string;
  name: string;
  avatar: string; // emoji ou initiales
  email?: string;
  createdAt: Date;
  lastActive: Date;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    notifications: boolean;
    alertThresholds: {
      moderate: number;
      high: number;
      critical: number;
    };
  };
  profile?: {
    gender?: 'male' | 'female';
    age?: number; // en années
    height?: number; // en cm
    weight?: number; // en kg
    activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active';
    // Données calculées automatiquement
    bmi?: number;
    bmiCategory?: 'underweight' | 'normal' | 'overweight' | 'obese';
    bodyFatPercentage?: number; // estimé
    leanBodyMass?: number; // masse maigre en kg
  };
}

export interface UserStats {
  userId: string;
  totalDrinks: number;
  totalUnits: number;
  averagePerDay: number;
  lastDrink?: Date;
  isOnline: boolean;
  currentStreak: number; // jours sans dépasser limites
  tricheCount: number; // nombre de triches
}

export interface NotificationPreferences {
  // Messages & Social
  chatMessages: boolean;
  sharedPhotos: boolean;
  newMembers: boolean;
  groupActivities: boolean;
  
  // Sécurité & Alertes
  consumptionAlerts: boolean;
  membersInDanger: boolean;
  hydrationReminders: boolean;
  hydrationInterval: number; // en heures
  sessionEnd: boolean;
  inactivityAlert: boolean;
  inactivityHours: number; // heures avant alerte
  
  // Festival & Événements
  artistReminders: boolean;
  festivalZones: boolean;
  nearbyMembers: boolean;
  
  // Localisation
  locationRequests: boolean;
  locationShares: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  notificationDetails?: NotificationPreferences;
  alertThresholds: {
    moderate: number;
    high: number;
    critical: number;
  };
}

export interface AlertThresholds {
  moderate: number;
  high: number;
  critical: number;
}