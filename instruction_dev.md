# Instructions complètes pour Claude CLI - Festival Tracker

## 🎯 Mission
Développer complètement une application React Native/Expo permettant à un groupe d'amis de suivre leur consommation d'alcool en temps réel pendant un festival. Application mobile native avec synchronisation Firebase temps réel.

## 📋 Workflow de développement autonome

### Étape 1: Initialisation du projet
```bash
# Créer le projet Expo
npx create-expo-app FestivalTracker --template blank-typescript
cd FestivalTracker

# Installer toutes les dépendances nécessaires
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npx expo install @react-native-firebase/app @react-native-firebase/firestore @react-native-firebase/auth
npx expo install @react-native-async-storage/async-storage react-hook-form
npx expo install react-native-vector-icons react-native-haptic-feedback
npx expo install date-fns uuid react-native-toast-message
npx expo install expo-screen-orientation expo-constants expo-device
```

### Étape 2: Configuration Firebase
Créer automatiquement la configuration Firebase avec des placeholders que l'utilisateur pourra remplir plus tard.

### Étape 3: Architecture complète des fichiers
Créer TOUS les fichiers suivants avec leur contenu complet :

## 🗂 Structure complète à implémenter

### Configuration et types de base
```
src/
├── config/
│   └── firebase.ts                 # Configuration Firebase avec placeholders
├── types/
│   ├── index.ts                    # Export de tous les types
│   ├── user.ts                     # Types utilisateur
│   ├── group.ts                    # Types groupe
│   └── drink.ts                    # Types boissons
├── utils/
│   ├── constants.ts                # Constantes (types de boissons, etc.)
│   ├── calculations.ts             # Calculs unités d'alcool
│   ├── groupUtils.ts               # Utilitaires groupe
│   ├── dateUtils.ts                # Utilitaires dates
│   └── validation.ts               # Validations formulaires
```

### Services Firebase complets
```
├── services/
│   ├── authService.ts              # Authentification complète
│   ├── groupService.ts             # CRUD groupes complet
│   ├── drinkService.ts             # CRUD boissons complet
│   ├── notificationService.ts      # Notifications push
│   └── offlineService.ts           # Gestion offline
```

### Hooks métier
```
├── hooks/
│   ├── useAuth.ts                  # Gestion authentification
│   ├── useGroup.ts                 # Gestion groupe actuel
│   ├── useDrinks.ts                # Gestion boissons temps réel
│   ├── useMembers.ts               # Gestion membres du groupe
│   ├── useStats.ts                 # Calculs statistiques
│   ├── useAlerts.ts                # Système d'alertes
│   └── useOffline.ts               # Gestion mode offline
```

### Contextes React
```
├── context/
│   ├── AuthContext.tsx             # Contexte authentification
│   ├── GroupContext.tsx            # Contexte groupe actuel
│   └── ThemeContext.tsx            # Contexte thème (optionnel)
```

### Composants UI réutilisables
```
├── components/
│   ├── ui/
│   │   ├── Button.tsx              # Bouton personnalisé
│   │   ├── Input.tsx               # Input personnalisé
│   │   ├── Card.tsx                # Carte UI
│   │   ├── Modal.tsx               # Modal personnalisé
│   │   ├── LoadingSpinner.tsx      # Loader
│   │   ├── Toast.tsx               # Toast notifications
│   │   └── Avatar.tsx              # Avatar utilisateur
│   ├── forms/
│   │   ├── DrinkForm.tsx           # Formulaire ajout boisson
│   │   ├── GroupForm.tsx           # Formulaire création groupe
│   │   └── ProfileForm.tsx         # Formulaire profil
│   ├── drink/
│   │   ├── DrinkItem.tsx           # Item historique
│   │   ├── DrinkTypeSelector.tsx   # Sélecteur type boisson
│   │   ├── DrinkDetailsForm.tsx    # Détails boisson
│   │   └── QuickAddButtons.tsx     # Boutons ajout rapide
│   ├── group/
│   │   ├── MemberCard.tsx          # Carte membre
│   │   ├── MembersList.tsx         # Liste membres
│   │   ├── GroupStats.tsx          # Stats groupe
│   │   ├── GroupFeed.tsx           # Feed temps réel
│   │   ├── GroupInvite.tsx         # Invitation groupe
│   │   └── GroupSettings.tsx       # Paramètres groupe
│   ├── stats/
│   │   ├── StatsCard.tsx           # Carte stats individuelle
│   │   ├── StatsGrid.tsx           # Grille stats
│   │   ├── ProgressBar.tsx         # Barre progression
│   │   └── AlertBanner.tsx         # Bannière alerte
│   └── common/
│       ├── Header.tsx              # Header app
│       ├── TabBar.tsx              # Barre onglets
│       └── EmptyState.tsx          # État vide
```

### Écrans complets
```
├── screens/
│   ├── auth/
│   │   ├── WelcomeScreen.tsx       # Écran bienvenue
│   │   ├── CreateGroupScreen.tsx   # Création groupe
│   │   ├── JoinGroupScreen.tsx     # Rejoindre groupe
│   │   └── ProfileSetupScreen.tsx  # Configuration profil
│   ├── main/
│   │   ├── DashboardScreen.tsx     # Dashboard principal
│   │   ├── AddDrinkScreen.tsx      # Ajout boisson
│   │   ├── HistoryScreen.tsx       # Historique détaillé
│   │   ├── GroupScreen.tsx         # Gestion groupe
│   │   ├── StatsScreen.tsx         # Statistiques avancées
│   │   └── SettingsScreen.tsx      # Paramètres app
│   └── index.ts                    # Export écrans
```

### Navigation
```
├── navigation/
│   ├── AppNavigator.tsx            # Navigation principale
│   ├── AuthNavigator.tsx           # Navigation auth
│   ├── MainNavigator.tsx           # Navigation app
│   └── types.ts                    # Types navigation
```

### App principale
```
├── App.tsx                         # Point d'entrée
└── app.json                        # Configuration Expo
```

## 🎯 Spécifications techniques détaillées

### Types TypeScript complets

#### Types Utilisateur (user.ts)
```typescript
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
}

export interface UserStats {
  userId: string;
  totalDrinks: number;
  totalUnits: number;
  averagePerDay: number;
  lastDrink?: Date;
  isOnline: boolean;
  currentStreak: number; // jours sans dépasser limites
}
```

#### Types Groupe (group.ts)
```typescript
export interface FestivalGroup {
  id: string; // Code partageable
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  
  settings: {
    festivalDates: {
      start: Date;
      end: Date;
    };
    alertThresholds: {
      moderate: number;
      high: number;
      critical: number;
    };
    maxMembers: number;
    isPublic: boolean;
    allowInvites: boolean;
  };
  
  members: {
    [userId: string]: GroupMember;
  };
  
  stats: {
    totalMembers: number;
    totalDrinks: number;
    averagePerPerson: number;
    mostActiveDay: string;
  };
}

export interface GroupMember {
  id: string;
  name: string;
  avatar: string;
  role: 'creator' | 'admin' | 'member';
  joinedAt: Date;
  lastActive: Date;
  isActive: boolean;
  totalContributions: number;
}
```

#### Types Boisson (drink.ts)
```typescript
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
  alcoholUnits: number; // calculé
  
  // Métadonnées
  timestamp: Date;
  createdAt: Date;
  location?: {
    latitude: number;
    longitude: number;
    venue?: string;
  };
  
  // Synchronisation
  syncStatus: 'synced' | 'pending' | 'error';
  lastModified: Date;
}

export type DrinkCategory = 'beer' | 'wine' | 'cocktail' | 'shot' | 'champagne' | 'other';

export interface DrinkTemplate {
  category: DrinkCategory;
  type: string;
  name: string;
  volume: number;
  defaultAlcohol: number;
  emoji: string;
  variants?: string[];
}
```

### Constants.ts complet
```typescript
export const DRINK_TEMPLATES: DrinkTemplate[] = [
  // Bières
  { category: 'beer', type: 'pinte', name: 'Pinte', volume: 50, defaultAlcohol: 5, emoji: '🍺' },
  { category: 'beer', type: 'demi', name: 'Demi', volume: 25, defaultAlcohol: 5, emoji: '🍺' },
  { category: 'beer', type: 'formule', name: 'Formule', volume: 33, defaultAlcohol: 5, emoji: '🍺' },
  { category: 'beer', type: 'bouteille', name: 'Bouteille', volume: 33, defaultAlcohol: 5, emoji: '🍺' },
  { category: 'beer', type: 'canette', name: 'Canette', volume: 50, defaultAlcohol: 5, emoji: '🍺' },
  
  // Vins
  { category: 'wine', type: 'verre', name: 'Verre de vin', volume: 12, defaultAlcohol: 12, emoji: '🍷' },
  { category: 'wine', type: 'ballon', name: 'Ballon de vin', volume: 15, defaultAlcohol: 12, emoji: '🍷' },
  { category: 'wine', type: 'pichet', name: 'Pichet', volume: 25, defaultAlcohol: 12, emoji: '🍷' },
  { category: 'wine', type: 'bouteille', name: 'Bouteille de vin', volume: 75, defaultAlcohol: 12, emoji: '🍷' },
  
  // Cocktails
  { category: 'cocktail', type: 'simple', name: 'Cocktail simple', volume: 20, defaultAlcohol: 20, emoji: '🍹' },
  { category: 'cocktail', type: 'double', name: 'Cocktail double', volume: 20, defaultAlcohol: 40, emoji: '🍹' },
  { category: 'cocktail', type: 'triple', name: 'Cocktail triple', volume: 20, defaultAlcohol: 60, emoji: '🍹' },
  
  // Shots
  { category: 'shot', type: 'shot', name: 'Shot', volume: 4, defaultAlcohol: 40, emoji: '🥃' },
  { category: 'shot', type: 'double-shot', name: 'Double shot', volume: 8, defaultAlcohol: 40, emoji: '🥃' },
  { category: 'shot', type: 'digestif', name: 'Digestif', volume: 6, defaultAlcohol: 40, emoji: '🥃' },
  
  // Champagne
  { category: 'champagne', type: 'flute', name: 'Flûte', volume: 12, defaultAlcohol: 12, emoji: '🥂' },
  { category: 'champagne', type: 'coupe', name: 'Coupe', volume: 15, defaultAlcohol: 12, emoji: '🥂' },
  { category: 'champagne', type: 'bouteille', name: 'Bouteille de champagne', volume: 75, defaultAlcohol: 12, emoji: '🥂' }
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
```

### Fonctions de calcul (calculations.ts)
```typescript
export function calculateAlcoholUnits(volume: number, alcoholDegree: number, multiplier: number = 1): number {
  return (volume * alcoholDegree * multiplier) / 10;
}

export function getAlertLevel(units: number): 'safe' | 'moderate' | 'high' | 'critical' {
  if (units >= ALERT_THRESHOLDS.CRITICAL) return 'critical';
  if (units >= ALERT_THRESHOLDS.HIGH) return 'high';
  if (units >= ALERT_THRESHOLDS.MODERATE) return 'moderate';
  return 'safe';
}

export function calculateGroupStats(drinks: DrinkRecord[], members: GroupMember[]): GroupStats {
  // Implémenter tous les calculs de stats de groupe
}

export function getDailyConsumption(drinks: DrinkRecord[], date: Date): number {
  // Calculer consommation d'une journée specific
}

export function getWeeklyTrend(drinks: DrinkRecord[]): number[] {
  // Calculer tendance sur 7 jours
}
```

## 🎨 Design System et UI

### Thème et couleurs
```typescript
export const theme = {
  colors: {
    primary: '#667eea',
    secondary: '#764ba2',
    success: '#48bb78',
    warning: '#ed8936',
    danger: '#f56565',
    background: '#f7fafc',
    surface: '#ffffff',
    text: '#2d3748',
    textLight: '#718096',
    border: '#e2e8f0'
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20
  },
  shadows: {
    small: '0 2px 4px rgba(0,0,0,0.1)',
    medium: '0 4px 8px rgba(0,0,0,0.12)',
    large: '0 8px 16px rgba(0,0,0,0.15)'
  }
};
```

### Animations et micro-interactions
- Animations fluides pour les transitions
- Haptic feedback sur les actions importantes
- Micro-animations sur les boutons
- Pull-to-refresh avec animation custom
- Toast notifications animées

## 🔄 Fonctionnalités temps réel

### Firebase Firestore Structure
```
/groups/{groupId}
  - Données du groupe
  
/groups/{groupId}/members/{userId}
  - Données membre specifique
  
/groups/{groupId}/drinks/{drinkId}
  - Enregistrements des boissons
  
/groups/{groupId}/activity/{activityId}
  - Feed d'activité temps réel
  
/users/{userId}
  - Profil utilisateur global
```

### Listeners temps réel complets
- Drinks du groupe en temps réel
- Membres en ligne/hors ligne
- Feed d'activité temps réel
- Stats de groupe live
- Notifications en temps réel

## 📱 Fonctionnalités natives

### Notifications push
- Activité du groupe
- Alertes de sécurité
- Rappels hydratation
- Nouveaux membres

### Haptique feedback
- Ajout de boisson
- Alertes importantes
- Interactions de groupe

### Mode offline
- Cache local des données
- Queue de synchronisation
- Indicateur de statut réseau

## 🛡 Sécurité et validation

### Firebase Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Rules pour protéger les groupes
    match /groups/{groupId} {
      allow read, write: if request.auth != null && 
        resource.data.members[request.auth.uid] != null;
    }
    
    // Rules pour les boissons
    match /groups/{groupId}/drinks/{drinkId} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/groups/$(groupId)).data.members[request.auth.uid] != null;
      allow create: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

### Validation des données
- Validation stricte des formulaires
- Sanitisation des inputs
- Limites sur les volumes/degrés
- Protection contre les abus

## 🧪 Tests et debugging

### Tests unitaires (optionnel mais recommandé)
- Tests des fonctions de calcul
- Tests des utilitaires
- Tests des hooks personnalisés

### Debugging
- Console.log strategiques
- Error boundaries React
- Monitoring des erreurs Firebase

## 📋 Checklist de développement

### ✅ Phase 1: Foundation
- [x] Initialisation projet Expo TypeScript
- [x] Configuration Firebase avec placeholders
- [x] Types TypeScript complets
- [x] Utils et constants
- [x] Theme et design system de base

### ✅ Phase 2: Authentification et groupes
- [x] Services auth et group complets
- [x] Écrans création/join groupe
- [x] Contextes Auth et Group
- [x] Navigation auth complète

### ✅ Phase 3: Core fonctionnalités
- [x] Service drinks complet
- [x] Formulaire ajout boisson progressif
- [x] Calculs unités d'alcool
- [x] Hooks métier (useDrinks, useStats, etc.)

### ✅ Phase 4: Interface principale
- [x] Dashboard avec stats temps réel
- [x] Historique détaillé
- [x] Écran groupe et gestion membres
- [x] Navigation principale complète

### ✅ Phase 5: Temps réel et social
- [x] Listeners Firebase temps réel
- [x] Feed d'activité groupe
- [x] Système d'alertes intelligent
- [ ] Notifications push basiques

### ✅ Phase 6: UX et polish
- [x] Animations et micro-interactions
- [x] Haptic feedback
- [ ] Gestion offline
- [x] Toast et feedback utilisateur

### ✅ Phase 7: Fonctionnalités avancées
- [ ] Stats avancées et graphiques
- [ ] Système de réactions
- [ ] Classements et badges
- [ ] Export de données

### ✅ Phase 8: Améliorations supplémentaires (ajoutées)
- [x] Boutons d'ajout rapide pour boissons récentes
- [x] Calcul de taux d'alcool dans le sang avec élimination temporelle
- [x] Séparateurs de temps entre boissons avec code couleur
- [x] Profils de genre et poids pour calculs BAC précis
- [x] Écran de profil membre individuel avec historique détaillé

## 🎯 Instructions spécifiques pour Claude CLI

### Approche de développement
1. **Commencer par la structure complète** : Créer TOUS les fichiers avec au minimum les interfaces et exports
2. **Implémenter progressivement** : Remplir chaque fichier avec du code fonctionnel
3. **Intégration continue** : S'assurer que chaque ajout s'intègre avec l'existant
4. **Code complet et production-ready** : Pas de placeholders, code réel et fonctionnel

### Standards de code
- **TypeScript strict** : Tous les types définis, pas de `any`
- **Code moderne** : Hooks, functional components, async/await
- **Performance** : useMemo, useCallback où approprié
- **Accessibilité** : Labels, contraste, navigation clavier
- **Erreur handling** : Try/catch partout, fallbacks UI

### Priorités absolues
1. **Fonctionnalité** avant beauté : App qui marche > App jolie mais buggée
2. **TypeScript rigoureux** : Typage complet et précis
3. **Architecture scalable** : Code organisé et maintenable
4. **Temps réel fonctionnel** : Synchronisation Firebase fiable
5. **UX mobile native** : Pensé pour le tactile et les gestes

### Livrables attendus
- **Projet Expo complet** prêt à être lancé avec `npx expo start`
- **Tous les écrans fonctionnels** avec navigation
- **Firebase configuré** (avec instructions pour remplir les clés)
- **Code TypeScript propre** et documenté
- **README détaillé** avec instructions d'installation

## 🚀 Objectif final
Livrer une application React Native complète, fonctionnelle et prête pour la production, permettant à un groupe d'amis de suivre leur consommation d'alcool pendant un festival avec synchronisation temps réel, interface mobile native et fonctionnalités sociales engageantes.

**L'application doit être prête à être utilisée immédiatement après installation des dépendances et configuration Firebase.**