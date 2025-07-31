import { Ionicons } from '@expo/vector-icons';

export type IconName = keyof typeof Ionicons.glyphMap;

export interface IconMapping {
  name: IconName;
  color?: string;
}

// Icônes pour les catégories de boissons
export const DRINK_CATEGORY_ICONS: Record<string, IconMapping> = {
  beer: { name: 'beer', color: '#F59E0B' },
  wine: { name: 'wine', color: '#DC2626' },
  cocktail: { name: 'wine-outline', color: '#8B5CF6' },
  shot: { name: 'water', color: '#10B981' },
  champagne: { name: 'wine', color: '#F59E0B' },
  soft: { name: 'water-outline', color: '#06B6D4' },
  other: { name: 'cafe', color: '#6B7280' }
};

// Icônes pour les avatars utilisateurs
export const AVATAR_ICONS: IconMapping[] = [
  // Personnes et émotions
  { name: 'person', color: '#3B82F6' },
  { name: 'person-circle', color: '#10B981' },
  { name: 'happy', color: '#F59E0B' },
  { name: 'heart', color: '#EF4444' },
  { name: 'star', color: '#F59E0B' },
  
  // Nature et animaux
  { name: 'paw', color: '#8B5CF6' },
  { name: 'fish', color: '#06B6D4' },
  { name: 'flower', color: '#EC4899' },
  { name: 'leaf', color: '#10B981' },
  { name: 'sunny', color: '#F59E0B' },
  
  // Objets et symboles
  { name: 'flash', color: '#FBBF24' },
  { name: 'flame', color: '#EF4444' },
  { name: 'rocket', color: '#3B82F6' },
  { name: 'planet', color: '#8B5CF6' },
  { name: 'musical-note', color: '#EC4899' },
  
  // Sports et loisirs
  { name: 'football', color: '#10B981' },
  { name: 'basketball', color: '#F97316' },
  { name: 'game-controller', color: '#8B5CF6' },
  { name: 'bicycle', color: '#06B6D4' },
  { name: 'camera', color: '#6B7280' },
  
  // Symboles et formes
  { name: 'diamond', color: '#06B6D4' },
  { name: 'shield', color: '#10B981' },
  { name: 'trophy', color: '#F59E0B' },
  { name: 'ribbon', color: '#EC4899' },
  { name: 'medal', color: '#F59E0B' },
  
  // Autres
  { name: 'skull', color: '#6B7280' },
  { name: 'pizza', color: '#EF4444' },
  { name: 'ice-cream', color: '#EC4899' },
  { name: 'gift', color: '#8B5CF6' },
  { name: 'balloon', color: '#3B82F6' }
];

// Fonction helper pour obtenir l'icône d'une catégorie
export function getDrinkCategoryIcon(category: string): IconMapping {
  return DRINK_CATEGORY_ICONS[category] || DRINK_CATEGORY_ICONS.other;
}

// Fonction helper pour obtenir un avatar aléatoire
export function getRandomAvatarIcon(): IconMapping {
  const index = Math.floor(Math.random() * AVATAR_ICONS.length);
  return AVATAR_ICONS[index];
}

// Type pour l'avatar (peut être emoji, icône ou photo)
export interface AvatarData {
  type: 'emoji' | 'icon' | 'photo';
  value: string; // emoji string, icon name ou URL de la photo
  color?: string; // pour les icônes
}

// Convertir les anciens emojis en icônes
export function convertEmojiToIcon(emoji: string): AvatarData {
  // Map des emojis courants vers des icônes
  const emojiToIconMap: Record<string, IconMapping> = {
    '😀': { name: 'happy', color: '#F59E0B' },
    '😎': { name: 'glasses', color: '#3B82F6' },
    '🤠': { name: 'person', color: '#8B5CF6' },
    '🥳': { name: 'balloon', color: '#EC4899' },
    '🤩': { name: 'star', color: '#F59E0B' },
    '😁': { name: 'happy-outline', color: '#10B981' },
    '😄': { name: 'happy', color: '#F59E0B' },
    '🤪': { name: 'happy', color: '#8B5CF6' },
    '🤗': { name: 'heart', color: '#EF4444' },
    '🤔': { name: 'help-circle', color: '#6B7280' },
    '🦊': { name: 'paw', color: '#F97316' },
    '🐻': { name: 'paw', color: '#8B5CF6' },
    '🐼': { name: 'paw', color: '#1F2937' },
    '🐨': { name: 'paw', color: '#6B7280' },
    '🐯': { name: 'paw', color: '#F59E0B' },
    '🦁': { name: 'paw', color: '#F97316' },
    '🐮': { name: 'paw', color: '#EC4899' },
    '🐷': { name: 'paw', color: '#EC4899' },
    '🐸': { name: 'paw', color: '#10B981' },
    '🐵': { name: 'paw', color: '#8B5CF6' },
    '🎉': { name: 'gift', color: '#8B5CF6' },
    '🎊': { name: 'balloon', color: '#EC4899' },
    '🎈': { name: 'balloon', color: '#EF4444' },
    '🎆': { name: 'star', color: '#3B82F6' },
    '🎇': { name: 'flash', color: '#F59E0B' },
    '🌟': { name: 'star', color: '#F59E0B' },
    '⭐': { name: 'star-outline', color: '#F59E0B' },
    '💫': { name: 'star', color: '#8B5CF6' },
    '✨': { name: 'star-outline', color: '#EC4899' },
    '🔥': { name: 'flame', color: '#EF4444' }
  };

  const iconMapping = emojiToIconMap[emoji];
  if (iconMapping) {
    return {
      type: 'icon',
      value: iconMapping.name,
      color: iconMapping.color
    };
  }

  // Si pas de mapping, garder l'emoji
  return {
    type: 'emoji',
    value: emoji
  };
}

// Convertir n'importe quel format d'avatar (emoji, icon:name:color, photo:url) en AvatarData
export function parseAvatarString(avatarString: string): AvatarData {
  if (!avatarString) {
    return { type: 'emoji', value: '😀' }; // Valeur par défaut
  }
  
  if (avatarString.startsWith('photo:')) {
    const photoUrl = avatarString.substring(6); // Enlever 'photo:'
    return { type: 'photo', value: photoUrl };
  }
  
  // Détecter les URLs Firebase sans préfixe 'photo:'
  if (avatarString.startsWith('http') && (avatarString.includes('firebasestorage') || avatarString.includes('picsum.photos'))) {
    return { type: 'photo', value: avatarString };
  }
  
  if (avatarString.startsWith('icon:')) {
    const [, name, color] = avatarString.split(':');
    return { type: 'icon', value: name, color: color || '#3B82F6' };
  }
  
  // Sinon c'est un emoji, le convertir en icône
  return convertEmojiToIcon(avatarString);
}