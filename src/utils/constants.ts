import { DrinkTemplate } from '../types';
import { AvatarData } from './iconMappings';

export const DRINK_TEMPLATES: DrinkTemplate[] = [
  // Bières
  { category: 'beer', type: 'demi', name: 'Demi', volume: 25, defaultAlcohol: 5, emoji: '🍺' },
  { category: 'beer', type: 'pinte', name: 'Pinte', volume: 40, defaultAlcohol: 5, emoji: '🍺' },
  { category: 'beer', type: 'bouteille', name: 'Bouteille', volume: 33, defaultAlcohol: 5, emoji: '🍺' },
  { category: 'beer', type: 'canette', name: 'Canette', volume: 50, defaultAlcohol: 5, emoji: '🍺' },
  { category: 'beer', type: 'ipa', name: 'IPA', volume: 33, defaultAlcohol: 6, emoji: '🍺' },
  { category: 'beer', type: 'artisanale', name: 'Bière artisanale', volume: 33, defaultAlcohol: 7, emoji: '🍺' },
  { category: 'beer', type: 'forte', name: 'Bière forte', volume: 33, defaultAlcohol: 9, emoji: '🍺' },
  { category: 'beer', type: 'sans-alcool', name: 'Bière sans alcool', volume: 33, defaultAlcohol: 0, emoji: '🍺' },
  
  // Vins
  { category: 'wine', type: 'verre', name: 'Verre de vin', volume: 10, defaultAlcohol: 12, emoji: '🍷' },
  { category: 'wine', type: 'ballon', name: 'Ballon de vin', volume: 12, defaultAlcohol: 12, emoji: '🍷' },
  { category: 'wine', type: 'rouge', name: 'Vin rouge', volume: 10, defaultAlcohol: 13, emoji: '🍷' },
  { category: 'wine', type: 'blanc', name: 'Vin blanc', volume: 10, defaultAlcohol: 12, emoji: '🥂' },
  { category: 'wine', type: 'rose', name: 'Vin rosé', volume: 10, defaultAlcohol: 12, emoji: '🌷' },
  { category: 'wine', type: 'pichet', name: 'Pichet', volume: 25, defaultAlcohol: 12, emoji: '🍷' },
  { category: 'wine', type: 'bouteille', name: 'Bouteille de vin', volume: 75, defaultAlcohol: 12, emoji: '🍷' },
  
  // Cocktails
  { category: 'cocktail', type: 'mojito', name: 'Mojito', volume: 15, defaultAlcohol: 8, emoji: '🍹' },
  { category: 'cocktail', type: 'caipirinha', name: 'Caipirinha', volume: 12, defaultAlcohol: 15, emoji: '🍹' },
  { category: 'cocktail', type: 'pina-colada', name: 'Piña Colada', volume: 20, defaultAlcohol: 6, emoji: '🥥' },
  { category: 'cocktail', type: 'cosmopolitan', name: 'Cosmopolitan', volume: 12, defaultAlcohol: 12, emoji: '🍸' },
  { category: 'cocktail', type: 'long-island', name: 'Long Island', volume: 15, defaultAlcohol: 18, emoji: '🍹' },
  { category: 'cocktail', type: 'cuba-libre', name: 'Cuba Libre', volume: 18, defaultAlcohol: 8, emoji: '🥤' },
  { category: 'cocktail', type: 'margarita', name: 'Margarita', volume: 12, defaultAlcohol: 14, emoji: '🍹' },
  { category: 'cocktail', type: 'bloody-mary', name: 'Bloody Mary', volume: 15, defaultAlcohol: 10, emoji: '🍅' },
  
  // Shots et spiritueux
  { category: 'shot', type: 'shot', name: 'Shot', volume: 3, defaultAlcohol: 40, emoji: '🥃' },
  { category: 'shot', type: 'double-shot', name: 'Double shot', volume: 6, defaultAlcohol: 40, emoji: '🥃' },
  { category: 'shot', type: 'whisky', name: 'Whisky', volume: 4, defaultAlcohol: 40, emoji: '🥃' },
  { category: 'shot', type: 'vodka', name: 'Vodka', volume: 4, defaultAlcohol: 40, emoji: '🥃' },
  { category: 'shot', type: 'rhum', name: 'Rhum', volume: 4, defaultAlcohol: 40, emoji: '🥃' },
  { category: 'shot', type: 'gin', name: 'Gin', volume: 4, defaultAlcohol: 40, emoji: '🥃' },
  { category: 'shot', type: 'pastis', name: 'Pastis', volume: 3, defaultAlcohol: 45, emoji: '🥃' },
  
  // Champagne et bulles
  { category: 'champagne', type: 'flute', name: 'Flûte', volume: 10, defaultAlcohol: 12, emoji: '🥂' },
  { category: 'champagne', type: 'coupe', name: 'Coupe', volume: 12, defaultAlcohol: 12, emoji: '🥂' },
  { category: 'champagne', type: 'cremant', name: 'Crémant', volume: 10, defaultAlcohol: 11, emoji: '🥂' },
  { category: 'champagne', type: 'prosecco', name: 'Prosecco', volume: 10, defaultAlcohol: 11, emoji: '🥂' },
  { category: 'champagne', type: 'bouteille', name: 'Bouteille de champagne', volume: 75, defaultAlcohol: 12, emoji: '🥂' },
  
  // Boissons sans alcool
  { category: 'soft', type: 'eau', name: 'Eau', volume: 50, defaultAlcohol: 0, emoji: '💧' },
  { category: 'soft', type: 'soda', name: 'Soda', volume: 33, defaultAlcohol: 0, emoji: '🥤' },
  { category: 'soft', type: 'jus', name: 'Jus de fruits', volume: 25, defaultAlcohol: 0, emoji: '🧃' },
  
  // Apéritifs et autres
  { category: 'other', type: 'kir', name: 'Kir', volume: 12, defaultAlcohol: 8, emoji: '🌷' },
  { category: 'other', type: 'spritz', name: 'Spritz', volume: 15, defaultAlcohol: 6, emoji: '🍊' },
  { category: 'other', type: 'porto', name: 'Porto', volume: 6, defaultAlcohol: 20, emoji: '🍷' },
  { category: 'other', type: 'martini', name: 'Martini', volume: 8, defaultAlcohol: 15, emoji: '🍸' },
  { category: 'other', type: 'cognac', name: 'Cognac', volume: 3, defaultAlcohol: 40, emoji: '🥃' },
  { category: 'other', type: 'armagnac', name: 'Armagnac', volume: 3, defaultAlcohol: 40, emoji: '🥃' },
  { category: 'other', type: 'liqueur', name: 'Liqueur', volume: 4, defaultAlcohol: 25, emoji: '🍸' }
];

export const ALERT_THRESHOLDS = {
  MODERATE: 3,
  HIGH: 6,
  CRITICAL: 10
};

export const GROUP_LIMITS = {
  MAX_MEMBERS: 10,
  MAX_NAME_LENGTH: 50,
  CODE_LENGTH: 6
};

// Nouvelle liste d'avatars avec icônes
export const AVATAR_OPTIONS: AvatarData[] = [
  // Personnes et émotions
  { type: 'icon', value: 'person', color: '#3B82F6' },
  { type: 'icon', value: 'person-circle', color: '#10B981' },
  { type: 'icon', value: 'happy', color: '#F59E0B' },
  { type: 'icon', value: 'heart', color: '#EF4444' },
  { type: 'icon', value: 'star', color: '#F59E0B' },
  
  // Nature et animaux
  { type: 'icon', value: 'paw', color: '#8B5CF6' },
  { type: 'icon', value: 'fish', color: '#06B6D4' },
  { type: 'icon', value: 'flower', color: '#EC4899' },
  { type: 'icon', value: 'leaf', color: '#10B981' },
  { type: 'icon', value: 'sunny', color: '#F59E0B' },
  
  // Objets et symboles
  { type: 'icon', value: 'flash', color: '#FBBF24' },
  { type: 'icon', value: 'flame', color: '#EF4444' },
  { type: 'icon', value: 'rocket', color: '#3B82F6' },
  { type: 'icon', value: 'planet', color: '#8B5CF6' },
  { type: 'icon', value: 'musical-note', color: '#EC4899' },
  
  // Sports et loisirs
  { type: 'icon', value: 'football', color: '#10B981' },
  { type: 'icon', value: 'basketball', color: '#F97316' },
  { type: 'icon', value: 'game-controller', color: '#8B5CF6' },
  { type: 'icon', value: 'bicycle', color: '#06B6D4' },
  { type: 'icon', value: 'camera', color: '#6B7280' },
  
  // Symboles et formes
  { type: 'icon', value: 'diamond', color: '#06B6D4' },
  { type: 'icon', value: 'shield', color: '#10B981' },
  { type: 'icon', value: 'trophy', color: '#F59E0B' },
  { type: 'icon', value: 'ribbon', color: '#EC4899' },
  { type: 'icon', value: 'medal', color: '#F59E0B' },
  
  // Autres
  { type: 'icon', value: 'skull', color: '#6B7280' },
  { type: 'icon', value: 'pizza', color: '#EF4444' },
  { type: 'icon', value: 'ice-cream', color: '#EC4899' },
  { type: 'icon', value: 'gift', color: '#8B5CF6' },
  { type: 'icon', value: 'balloon', color: '#3B82F6' }
];

// Ancienne liste d'avatars emojis (pour compatibilité)
export const AVATARS = [
  '😀', '😎', '🤠', '🥳', '🤩', '😁', '😄', '🤪', '🤗', '🤔',
  '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵',
  '🎉', '🎊', '🎈', '🎆', '🎇', '🌟', '⭐', '💫', '✨', '🔥'
];

export const THEME = {
  colors: {
    primary: '#667eea',
    secondary: '#764ba2',
    success: '#48bb78',
    warning: '#ed8936',
    danger: '#f56565',
    info: '#4299e1',
    background: '#f7fafc',
    surface: '#ffffff',
    text: '#2d3748',
    textLight: '#718096',
    border: '#e2e8f0',
    shadow: 'rgba(0,0,0,0.1)'
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999
  },
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8
    }
  },
  fonts: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32
    },
    weights: {
      regular: '400',
      medium: '500',
      bold: '700'
    }
  }
};

export const STAGE_COLORS = {
  'Hard Stage': '#EF4444',      // Rouge vif
  'Techno Stage': '#3B82F6',    // Bleu
  'Main Stage': '#10B981',      // Vert
  'Second Stage': '#F59E0B',    // Orange
  'Tent': '#8B5CF6',            // Violet
  'Acoustic Stage': '#EC4899',  // Rose
  'Electronic Stage': '#06B6D4', // Cyan
  'Rock Stage': '#DC2626',      // Rouge foncé
  'Alternative Stage': '#7C3AED', // Violet foncé
  'default': '#6B7280'          // Gris par défaut
};

export const getStageColor = (stageName: string): string => {
  return STAGE_COLORS[stageName as keyof typeof STAGE_COLORS] || STAGE_COLORS.default;
};

export const FAVORITE_COLORS = {
  gold: '#FFD700',
  goldLight: '#FFF9C4',
  goldDark: '#FFC107'
};

export const REMINDER_OPTIONS = [
  { label: '5 minutes', value: 5, icon: 'alarm' },
  { label: '15 minutes', value: 15, icon: 'time' },
  { label: '30 minutes', value: 30, icon: 'timer' },
  { label: '1 heure', value: 60, icon: 'hourglass' }
];

export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Erreur de connexion. Vérifiez votre connexion internet.",
  AUTH_ERROR: "Erreur d'authentification. Veuillez réessayer.",
  GROUP_NOT_FOUND: "Groupe introuvable.",
  GROUP_FULL: "Ce groupe est déjà complet.",
  INVALID_CODE: "Code de groupe invalide.",
  GENERIC_ERROR: "Une erreur est survenue. Veuillez réessayer."
};